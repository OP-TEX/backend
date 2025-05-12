const {
    NotFoundError,
    ValidationError,
    DatabaseError,
    BadRequestError,
    ForbiddenError
} = require('../utils/baseException');
const { encryptMessage, decryptMessage } = require('../utils/chatEncryption');
const moment = require('moment');
const mongoose = require('mongoose');  // Add this import for session support

/**
 * Service class for managing customer support operations
 */
class CustomerSupportService {
    /**
     * Creates a new CustomerSupportService instance
     * @param {Object} models - Database models
     */
    constructor(models) {
        this.models = models;
        this.customerQueue = []; // In-memory queue for customers waiting
        this.io = null; // Will store socket.io instance
    }

    /**
     * Sets the socket.io instance for emitting events
     * @param {Object} io - The socket.io instance
     */
    setSocketIO(io) {
        this.io = io;
    }

    /**
     * Creates a new customer complaint
     * @param {String} userId - The ID of the user creating the complaint
     * @param {Object} complaintData - The complaint data
     * @param {String} complaintData.orderId - The order ID associated with the complaint
     * @param {String} complaintData.description - The description of the complaint
     * @param {String} complaintData.subject - The subject of the complaint
     * @param {Boolean} complaintData.requiresLiveChat - Whether this complaint requires live chat support
     * @returns {Promise<Object>} The created complaint
     * @throws {NotFoundError} If the order is not found
     * @throws {ValidationError} If validation fails
     * @throws {DatabaseError} If there's a database error
     */
    async createComplaint(userId, complaintData) {
        try {
            const order = await this.models.order.findOne({ orderId: complaintData.orderId, userId: userId });
            if (!order) {
                throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
            }

            // create a new complaint
            const complaint = new this.models.complaint({
                orderId: complaintData.orderId,
                userId: userId,
                subject: complaintData.subject,
                description: complaintData.description,
                requiresLiveChat: complaintData.requiresLiveChat || false,
                status: 'pending',
            });

            await complaint.save();



            // Both live chat and regular complaints are assigned, but with different logic
            await this.assignComplaintToAvailableAgent(complaint._id);

            return complaint;
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof ValidationError) {
                throw error;
            }
            throw new DatabaseError(`Failed to create complaint: ${error.message}`);
        }
    }

    /**
     * Assigns a complaint to an available customer service agent
     * Uses different assignment strategies for live chat vs. regular complaints
     * @param {String} complaintId - The ID of the complaint to assign
     * @returns {Promise<Object|null>} The assigned agent or null if no agents available
     * @throws {NotFoundError} If the complaint is not found
     * @throws {DatabaseError} If there's a database error
     */
    async assignComplaintToAvailableAgent(complaintId) {
        // Use a session to ensure database consistency
        const session = await mongoose.startSession();

        try {
            await session.withTransaction(async () => {
                const complaint = await this.models.complaint.findById(complaintId).session(session);
                if (!complaint) {
                    throw new NotFoundError('Complaint not found', 'COMPLAINT_NOT_FOUND');
                }

                // Check if there are any available agents
                const onlineReps = await this.models.customerService.find({ isOnline: true }).session(session);
                if (onlineReps.length === 0) {
                    console.log('No available agents, adding to queue');
                    // If no agents are available, add the complaint to the queue only if it's a live chat
                    if (complaint.requiresLiveChat) {
                        this.customerQueue.push(complaintId);
                    }
                    return null;
                }

                console.log(`Available agents found: ${onlineReps.length}`);

                let selectedRep = null;

                if (complaint.requiresLiveChat) {
                    // For live chat: find agents without an active live chat complaint
                    // This ensures they only handle one live chat at a time

                    // Get all active live chat complaints
                    const activeLiveChats = await this.models.complaint.find({
                        requiresLiveChat: true,
                        status: { $in: ['assigned', 'in-progress'] }
                    }).session(session);

                    // Map of agent IDs to their current live chat count
                    const agentLiveChatCount = {};
                    activeLiveChats.forEach(chat => {
                        if (chat.assignedTo) {
                            agentLiveChatCount[chat.assignedTo] = (agentLiveChatCount[chat.assignedTo] || 0) + 1;
                        }
                    });

                    // Find agents who don't have any live chats
                    const availableLiveChatAgents = onlineReps.filter(rep =>
                        !agentLiveChatCount[rep._id.toString()] || agentLiveChatCount[rep._id.toString()] === 0
                    );

                    if (availableLiveChatAgents.length > 0) {
                        // Choose the one with fewest total complaints
                        let minComplaints = Infinity;

                        for (const rep of availableLiveChatAgents) {
                            const activeComplaints = rep.activeComplaints.length;
                            if (activeComplaints < minComplaints) {
                                minComplaints = activeComplaints;
                                selectedRep = rep;
                            }
                        }
                    } else {
                        // No agents are available for live chat, add to queue
                        this.customerQueue.push(complaintId);
                        return null;
                    }
                } else {
                    // For regular complaints: use load balancing based on total active complaints
                    // Agents can handle multiple regular complaints simultaneously

                    let minComplaints = Infinity;

                    for (const rep of onlineReps) {
                        const activeComplaints = rep.activeComplaints.length;
                        if (activeComplaints < minComplaints) {
                            minComplaints = activeComplaints;
                            selectedRep = rep;
                        }
                    }
                }

                // We have a selected agent, assign the complaint
                if (selectedRep) {
                    // Assign complaint to agent using findByIdAndUpdate to ensure atomic update
                    const updatedComplaint = await this.models.complaint.findByIdAndUpdate(
                        complaintId,
                        {
                            $set: {
                                status: 'assigned',
                                assignedTo: selectedRep._id.toString(),
                                updatedAt: Date.now()
                            }
                        },
                        { new: true, session }
                    );
                    console.log('Complaint assigned to agent:', selectedRep._id.toString());
                    if (!updatedComplaint) {
                        throw new NotFoundError('Complaint not found during update', 'COMPLAINT_NOT_FOUND');
                    }

                    // Add to rep's active complaints
                    await this.models.customerService.findByIdAndUpdate(
                        selectedRep._id,
                        {
                            $push: {
                                activeComplaints: {
                                    complaintId: complaint._id
                                }
                            }
                        },
                        { session }
                    );

                    // Record response
                    await this.models.serviceResponse.create([{
                        serviceId: selectedRep._id.toString(),
                        complaintId: complaint._id,
                        orderId: complaint.orderId,
                    }], { session });

                    // Emit socket event to notify the assigned customer service agent
                    if (this.io) {
                        // Get additional details for the notification
                        const customer = await this.models.customer.findById(complaint.userId);
                        const order = await this.models.order.findOne({ orderId: complaint.orderId });

                        // Emit to the service agent's personal room
                        this.io.of('/support-requests').to(`user-${selectedRep._id.toString()}`).emit('complaint-assigned', {
                            complaintId: complaint._id,
                            orderId: complaint.orderId,
                            subject: complaint.subject,
                            description: complaint.description,
                            requiresLiveChat: complaint.requiresLiveChat,
                            timestamp: updatedComplaint.updatedAt,
                            customer: customer ? {
                                id: customer._id,
                                name: `${customer.firstName} ${customer.lastName}`,
                            } : null,
                            orderTotal: order ? order.totalPrice : null
                        });
                        // Notify customer their request is queued or assigned
                        this.io.of('/support-requests').emit('complaint-status', {
                            complaintId: complaint._id,
                            status: updatedComplaint.status
                        });
                        console.log('Complaint status emitted to customer:', updatedComplaint.status);
                        // Also emit to the service room generally
                        this.io.of('/support-requests').to('service-room').emit('new-assignment', {
                            complaintId: complaint._id,
                            assignedTo: selectedRep._id.toString(),
                            subject: complaint.subject,
                            requiresLiveChat: complaint.requiresLiveChat
                        });
                    }

                    return selectedRep;
                }

                return null;
            });
        }
        catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new DatabaseError(`Failed to assign complaint: ${error.message}`);
        }
        finally {
            session.endSession();
        }
    }

    /**
     * Processes the customer queue when a service rep becomes available
     * Only processes live chat complaints in the queue
     * @param {String} serviceId - The ID of the available service representative
     * @returns {Promise<Object|null>} The processed complaint or null if queue is empty
     */
    async processQueue(serviceId) {
        if (this.customerQueue.length === 0) return null;

        // Get next complaint from queue
        const nextComplaintId = this.customerQueue.shift();
        try {
            const complaint = await this.models.complaint.findById(nextComplaintId);

            // Skip if complaint doesn't exist, is not pending, is not live chat, or is closed
            if (!complaint ||
                complaint.status !== 'pending' ||
                !complaint.requiresLiveChat ||
                complaint.status === 'closed') {
                return this.processQueue(serviceId); // Try next in queue
            }

            // First check if this rep already has a live chat complaint
            const serviceRep = await this.models.customerService.findById(serviceId);

            // Get all active complaints for this rep that are live chats
            const activeComplaints = await this.models.complaint.find({
                _id: { $in: serviceRep.activeComplaints.map(c => c.complaintId) },
                requiresLiveChat: true,
                status: { $in: ['assigned', 'in-progress'] }
            });

            // If rep already has a live chat, put this complaint back in queue and return
            if (activeComplaints.length > 0) {
                this.customerQueue.push(nextComplaintId);
                return null;
            }

            // Assign to service rep
            complaint.status = 'assigned';
            complaint.assignedTo = serviceId;
            complaint.updatedAt = Date.now();
            await complaint.save();

            if (this.io) {
                // Notify customer their request is queued or assigned
                this.io.of('/support-requests').emit('complaint-status', {
                    complaintId: complaint._id,
                    status: complaint.status
                });
            }

            // Add to rep's active complaints
            serviceRep.activeComplaints.push({
                complaintId: complaint._id
            });
            await serviceRep.save();

            // Record response
            await this.models.serviceResponse.create({
                serviceId: serviceId,
                complaintId: complaint._id,
                orderId: complaint.orderId,
            });

            return complaint;
        } catch (error) {
            console.error('Error processing queue:', error);
            return null;
        }
    }

    /**
     * Saves an encrypted chat message for a complaint
     * @param {String} complaintId - The ID of the complaint
     * @param {String} sender - The type of sender ('customer' or 'service')
     * @param {String} senderId - The ID of the sender
     * @param {String} content - The message content to encrypt and save
     * @returns {Promise<Object>} The saved message metadata
     * @throws {NotFoundError} If the complaint is not found
     * @throws {DatabaseError} If there's a database error
     */
    async saveChatMessage(complaintId, sender, senderId, content) {
        try {
            const complaint = await this.models.complaint.findById(complaintId);
            if (!complaint) {
                throw new NotFoundError('Complaint not found', 'COMPLAINT_NOT_FOUND');
            }

            // If complaint is not in-progress, update status
            if (complaint.status === 'assigned') {
                complaint.status = 'in-progress';
                complaint.updatedAt = Date.now();
                await complaint.save();
            }

            // Encrypt message
            const { encryptedContent, iv } = encryptMessage(content);

            // Save message
            const message = await this.models.message.create({
                complaintId,
                sender,
                senderId,
                encryptedContent,
                iv
            });

            return {
                id: message._id,
                timestamp: message.timestamp,
                sender
            };
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new DatabaseError(`Failed to save message: ${error.message}`);
        }
    }

    /**
     * Retrieves and decrypts chat history for a complaint
     * @param {String} complaintId - The ID of the complaint
     * @param {String} userId - The ID of the user requesting the history
     * @param {String} role - The role of the user ('customer' or 'customer service')
     * @returns {Promise<Array>} Array of decrypted messages
     * @throws {NotFoundError} If the complaint is not found
     * @throws {ForbiddenError} If the user doesn't have permission
     * @throws {DatabaseError} If there's a database error
     */
    async getChatHistory(complaintId, userId, role) {
        try {
            const complaint = await this.models.complaint.findById(complaintId);
            if (!complaint) {
                throw new NotFoundError('Complaint not found', 'COMPLAINT_NOT_FOUND');
            }

            // Check permission to view chat
            if (role === 'customer' && complaint.userId !== userId.toString()) {
                throw new ForbiddenError('You do not have permission to view this chat');
            } else if (role === 'customer service' && complaint.assignedTo !== userId.toString()) {
                console.log('Complaint assigned to:', complaint.assignedTo);
                console.log('User ID requesting history:', userId.toString());
                throw new ForbiddenError('This complaint is not assigned to you');
            }

            // Get encrypted messages
            const messages = await this.models.message.find({
                complaintId
            }).sort({ timestamp: 1 });

            // Decrypt and format messages with better error handling
            const decryptedMessages = messages.map(msg => {
                let content;
                try {
                    content = decryptMessage(msg.encryptedContent, msg.iv);
                } catch (decryptError) {
                    console.error(`Failed to decrypt message ${msg._id}:`, decryptError);
                    content = '[Message could not be decrypted]';
                }

                return {
                    id: msg._id,
                    sender: msg.sender,
                    senderId: msg.senderId,
                    content: content,
                    timestamp: msg.timestamp
                };
            });

            return decryptedMessages;
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof ForbiddenError) {
                throw error;
            }
            console.error('Error in getChatHistory:', error);
            throw new DatabaseError(`Failed to get chat history: ${error.message}`);
        }
    }

    /**
     * Resolves a complaint and processes the next customer in queue
     * @param {String} complaintId - The ID of the complaint to resolve
     * @param {String} serviceId - The ID of the service representative
     * @returns {Promise<Object>} Success message
     * @throws {NotFoundError} If the complaint is not found
     * @throws {ForbiddenError} If the complaint is not assigned to the rep
     * @throws {DatabaseError} If there's a database error
     */
    async resolveComplaint(complaintId, serviceId) {
        try {
            const complaint = await this.models.complaint.findById(complaintId);
            if (!complaint) {
                throw new NotFoundError('Complaint not found', 'COMPLAINT_NOT_FOUND');
            }

            console.log('Complaint:', complaint.assignedTo);
            console.log('Service ID:', serviceId.toString());
            if (complaint.assignedTo !== serviceId.toString()) {
                throw new ForbiddenError('This complaint is not assigned to you');
            }

            // Update complaint status
            complaint.status = 'resolved';
            complaint.updatedAt = Date.now();
            await complaint.save();

            // Remove from rep's active complaints
            const serviceRep = await this.models.customerService.findById(serviceId);
            serviceRep.activeComplaints = serviceRep.activeComplaints.filter(
                c => c.complaintId.toString() !== complaintId
            );
            await serviceRep.save();


            // Process next in queue
            await this.processQueue(serviceId);

            return { message: 'Complaint resolved successfully' };
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof ForbiddenError) {
                throw error;
            }
            throw new DatabaseError(`Failed to resolve complaint: ${error.message}`);
        }
    }

    /**
     * Closes a complaint (when it's no longer relevant)
     * @param {String} complaintId - The ID of the complaint to close
     * @param {String} userId - The ID of the user closing the complaint
     * @param {String} role - The role of the user ('customer', 'customer service', or 'admin')
     * @returns {Promise<Object>} Success message
     * @throws {NotFoundError} If the complaint is not found
     * @throws {ForbiddenError} If the user doesn't have permission
     * @throws {DatabaseError} If there's a database error
     */
    async closeComplaint(complaintId, userId, role) {
        try {
            const complaint = await this.models.complaint.findById(complaintId);
            if (!complaint) {
                throw new NotFoundError('Complaint not found', 'COMPLAINT_NOT_FOUND');
            }

            // Verify permission to close
            if (role === 'customer' && complaint.userId !== userId.toString()) {
                throw new ForbiddenError('You do not have permission to close this complaint');
            } else if (role === 'customer service' && complaint.assignedTo !== userId.toString()) {
                throw new ForbiddenError('This complaint is not assigned to you');
            }
            // Admin role can close any complaint

            // Update complaint status
            complaint.status = 'closed';
            complaint.updatedAt = Date.now();
            await complaint.save();

            // If assigned to a service rep, remove from their active complaints
            if (complaint.assignedTo) {
                const serviceRep = await this.models.customerService.findById(complaint.assignedTo);
                if (serviceRep) {
                    serviceRep.activeComplaints = serviceRep.activeComplaints.filter(
                        c => c.complaintId.toString() !== complaintId
                    );
                    await serviceRep.save();
                }
            }

            return { message: 'Complaint closed successfully' };
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof ForbiddenError) {
                throw error;
            }
            throw new DatabaseError(`Failed to close complaint: ${error.message}`);
        }
    }

    /**
     * Retrieves performance metrics for a service representative
     * @param {String} serviceId - The ID of the service representative
     * @param {String} period - The time period for metrics ('today', 'week', 'month', 'all')
     * @returns {Promise<Number>} The number of responses in the given period
     * @throws {DatabaseError} If there's a database error
     */
    async getServicePerformance(serviceId, period = 'all') {
        try {
            let startDate = null;

            if (period === 'today') {
                startDate = moment().startOf('day').toDate();
            } else if (period === 'week') {
                startDate = moment().subtract(1, 'weeks').toDate();
            } else if (period === 'month') {
                startDate = moment().subtract(1, 'months').toDate();
            }

            const query = { serviceId };
            if (startDate) {
                query.timestamp = { $gte: startDate };
            }

            const responses = await this.models.serviceResponse.find(query);

            // Group by response type
            const stats = responses.length;
            return stats;
        } catch (error) {
            throw new DatabaseError(`Failed to get performance stats: ${error.message}`);
        }
    }

    /**
     * Updates the online status of a service representative
     * When a rep comes online, automatically processes the waiting queue
     * @param {String} serviceId - The ID of the service representative
     * @param {Boolean} isOnline - The new online status
     * @param {String} socketId - The socket ID for real-time communication
     * @returns {Promise<Object>} The updated service rep record
     * @throws {NotFoundError} If the service rep is not found
     * @throws {DatabaseError} If there's a database error
     */
    async updateServiceOnlineStatus(serviceId, isOnline, socketId = null) {
        try {
            const update = {
                isOnline,
                lastActiveAt: Date.now()
            };

            if (socketId) {
                update.socketId = socketId;
            }
            console.log(serviceId)
            const serviceRep = await this.models.customerService.findByIdAndUpdate(
                {serviceId : serviceId.toString() },
                update,
                { new: true }
            );

            if (!serviceRep) {
                throw new NotFoundError('Service representative not found');
            }

            // If coming online, process queue
            if (isOnline) {
                await this.processQueue(serviceId);
            }

            return serviceRep;
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new DatabaseError(`Failed to update online status: ${error.message}`);
        }
    }

    /**
     * Gets all complaints for a specific customer
     * @param {String} userId - The ID of the customer
     * @returns {Promise<Array>} List of complaints
     * @throws {DatabaseError} If there's a database error
     */
    async getCustomerComplaints(userId) {
        try {
            const complaints = await this.models.complaint.find({
                userId
            }).sort({ createdAt: -1 });

            return complaints;
        } catch (error) {
            throw new DatabaseError(`Failed to get customer complaints: ${error.message}`);
        }
    }

    /**
     * Gets all assigned complaints for a service representative
     * @param {String} serviceId - The ID of the service representative
     * @param {Object} query - Query parameters
     * @returns {Promise<Array>} List of active complaints
     * @throws {DatabaseError} If there's a database error
     */
    async getServiceComplaints(serviceId, query = {}) {
        try {
            const filter = {
                assignedTo: serviceId,
                status: { $in: ['assigned', 'in-progress'] }
            };

            // Add requiresLiveChat filter if specified
            if (query.requiresLiveChat !== undefined) {
                filter.requiresLiveChat = query.requiresLiveChat === 'true' || query.requiresLiveChat === true;
            }

            const complaints = await this.models.complaint.find(filter).sort({ updatedAt: -1 });

            return complaints;
        } catch (error) {
            throw new DatabaseError(`Failed to get service complaints: ${error.message}`);
        }
    }

    /**
     * Validates if a user has access to a specific chat
     * @param {String} complaintId - The ID of the complaint
     * @param {String} userId - The ID of the user
     * @param {String} role - The role of the user
     * @returns {Promise<Object|null>} The complaint if access is allowed, null otherwise
     */
    async validateChatAccess(complaintId, userId, role) {
        try {
            const complaint = await this.models.complaint.findById(complaintId);
            if (!complaint) return null;

            if (role === 'customer') {
                return complaint.userId === userId.toString() ? complaint : null;
            } else if (role === 'customer service') {
                return complaint.assignedTo === userId.toString() ? complaint : null;
            } else if (role === 'admin') {
                return complaint; // Admins can access all chats
            }

            return null;
        } catch (error) {
            console.error('Error validating chat access:', error);
            return null;
        }
    }
}

module.exports = CustomerSupportService;