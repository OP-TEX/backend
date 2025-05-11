const {
    NotFoundError,
    ValidationError,
    DatabaseError,
    BadRequestError
} = require('../utils/baseException');
const { encryptMessage, decryptMessage } = require('../utils/chatEncryption');
const moment = require('moment');

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
    }

    /**
     * Creates a new customer complaint
     * @param {String} userId - The ID of the user creating the complaint
     * @param {Object} complaintData - The complaint data
     * @param {String} complaintData.orderId - The order ID associated with the complaint
     * @param {String} complaintData.description - The description of the complaint
     * @param {String} complaintData.subject - The subject of the complaint
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
                status: 'pending',
            });

            complaint.save();



            //try ti assign to available agent
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
     * Uses a load-balancing algorithm to find the least busy agent
     * @param {String} complaintId - The ID of the complaint to assign
     * @returns {Promise<Object|null>} The assigned agent or null if no agents available
     * @throws {NotFoundError} If the complaint is not found
     * @throws {DatabaseError} If there's a database error
     */
    async assignComplaintToAvailableAgent(complaintId) {
        try {
            const complaint = await this.models.complaint.findById(complaintId);
            if (!complaint) {
                throw new NotFoundError('Complaint not found', 'COMPLAINT_NOT_FOUND');
            }
            // Check if there are any available agents
            const onlineReps = await this.models.customerService.find({ isOnline: true });
            if (onlineReps.length === 0) {
                console.log('No available agents, adding to queue');
                // If no agents are available, add the complaint to the queue
                this.customerQueue.push(complaintId);
                return null;
            }
            console.log('Available agents found, assigning complaint ' + onlineReps.length);
            // Get today's start timestamp
            const todayStart = moment().startOf('day').toDate();

            // Find rep with fewest responses today
            let leastBusyRep = null;
            let minResponses = Infinity;

            for (const rep of onlineReps) {
                // Count responses for today
                const responsesCount = await this.models.serviceResponse.countDocuments({
                    serviceId: rep._id.toString(),
                    timestamp: { $gte: todayStart }
                });

                if (responsesCount < minResponses) {
                    minResponses = responsesCount;
                    leastBusyRep = rep;
                }
            }
            // Assign complaint to rep
            complaint.status = 'assigned';
            complaint.assignedTo = leastBusyRep._id.toString();
            complaint.updatedAt = Date.now();
            await complaint.save();

            // Add to rep's active complaints
            leastBusyRep.activeComplaints.push({
                complaintId: complaint._id
            });
            await leastBusyRep.save();

            // Record response
            await this.models.serviceResponse.create({
                serviceId: leastBusyRep._id.toString(),
                complaintId: complaint._id,
                orderId: complaint.orderId,
            });

            return leastBusyRep;

        }
        catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new DatabaseError(`Failed to assign complaint: ${error.message}`);
        }
    }

    /**
     * Processes the customer queue when a service rep becomes available
     * @param {String} serviceId - The ID of the available service representative
     * @returns {Promise<Object|null>} The processed complaint or null if queue is empty
     */
    async processQueue(serviceId) {
        if (this.customerQueue.length === 0) return null;

        // Get next complaint from queue
        const nextComplaintId = this.customerQueue.shift();
        try {
            const complaint = await this.models.complaint.findById(nextComplaintId);
            if (!complaint || complaint.status !== 'pending') {
                return this.processQueue(serviceId); // Try next in queue
            }

            // Assign to service rep
            complaint.status = 'assigned';
            complaint.assignedTo = serviceId;
            complaint.updatedAt = Date.now();
            await complaint.save();

            // Add to rep's active complaints
            const serviceRep = await this.models.customerService.findById(serviceId);
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
            if (role === 'customer' && complaint.userId !== userId) {
                throw new ForbiddenError('You do not have permission to view this chat');
            } else if (role === 'customer service' && complaint.assignedTo !== userId) {
                throw new ForbiddenError('This complaint is not assigned to you');
            }

            // Get encrypted messages
            const messages = await this.models.message.find({
                complaintId
            }).sort({ timestamp: 1 });

            // Decrypt and format messages
            const decryptedMessages = messages.map(msg => {
                return {
                    id: msg._id,
                    sender: msg.sender,
                    senderId: msg.senderId,
                    content: decryptMessage(msg.encryptedContent, msg.iv),
                    timestamp: msg.timestamp
                };
            });

            return decryptedMessages;
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof ForbiddenError) {
                throw error;
            }
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

            if (complaint.assignedTo !== serviceId) {
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

            const serviceRep = await this.models.customerService.findByIdAndUpdate(
                serviceId,
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
     * @returns {Promise<Array>} List of active complaints
     * @throws {DatabaseError} If there's a database error
     */
    async getServiceComplaints(serviceId) {
        try {
            const complaints = await this.models.complaint.find({
                assignedTo: serviceId,
                status: { $in: ['assigned', 'in-progress'] }
            }).sort({ updatedAt: -1 });

            return complaints;
        } catch (error) {
            throw new DatabaseError(`Failed to get service complaints: ${error.message}`);
        }
    }
}

module.exports = CustomerSupportService;