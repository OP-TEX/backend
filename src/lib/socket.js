const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const DeliveryManModel = require('../models/deliveryManModel');
const CustomerServiceModel = require('../models/customerServiceModel');
const AdminModel = require('../models/adminModel');

// Map models to role names (matching authMiddleware.js)
const models = {
    User: { model: UserModel, role: 'customer' },
    DeliveryMan: { model: DeliveryManModel, role: 'delivery' },
    CustomerService: { model: CustomerServiceModel, role: 'customer service' },
    Admin: { model: AdminModel, role: 'admin' }
};

// Socket setup function
const setupSockets = (server, customerSupportService) => {
    const io = socketIO(server, {
        cors: {
            origin: "*",  // For development; restrict in production
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    // Provide io instance to the customerSupportService for emitting events
    customerSupportService.setSocketIO(io);

    // Improved authentication middleware for sockets - now matching REST auth pattern
    const authMiddleware = async (socket, next) => {
        try {
            // Check multiple possible token locations
            const token = socket.handshake.auth?.token ||
                socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
                socket.handshake.query?.token;

            if (!token) {
                console.error('Socket auth failed: No token provided');
                return next(new Error('Authentication token required'));
            }

            try {
                // Verify the token
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const userId = decoded.id || decoded._id; // Support both formats

                // Find the user in all possible models (matching REST auth)
                let userData = null;
                let userRole = null;

                for (const [modelName, { model, role }] of Object.entries(models)) {
                    try {
                        const user = await model.findById(userId);
                        if (user) {
                            // Convert to plain object and remove sensitive fields
                            userData = user.toObject();
                            delete userData.hashedPassword;
                            delete userData.confirmationToken;
                            delete userData.otp;
                            userRole = role;
                            break;
                        }
                    } catch (err) {
                        console.error(`Error finding user in ${modelName}:`, err.message);
                    }
                }

                if (!userData) {
                    console.error('Socket auth failed: User not found in any model');
                    return next(new Error('User not found'));
                }

                // Set complete user data with role in socket.user (matching REST req.user)
                socket.user = {
                    ...userData,
                    role: userRole
                };

                console.log(`Socket authenticated: ${socket.user._id} as ${userRole}`);
                next();
            } catch (jwtError) {
                console.error('Socket auth failed: Invalid token', jwtError.message);
                return next(new Error('Invalid authentication token'));
            }
        } catch (error) {
            console.error('Socket auth error:', error.message);
            next(new Error('Authentication error'));
        }
    };

    // Apply auth middleware to main namespace
    io.use(authMiddleware);

    // Apply auth middleware to namespaces
    const requestIO = io.of('/support-requests');
    requestIO.use(authMiddleware);

    const chatIO = io.of('/support-chat');
    chatIO.use(authMiddleware);

    // Root namespace for general connections
    io.on('connection', (socket) => {
        console.log('Client connected to root namespace:', socket.id);

        // Basic echo functionality for testing
        socket.on('message', (data) => {
            console.log('Received message:', data);
            socket.emit('message', `Echo: ${data}`);
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected from root namespace:', socket.id);
        });
    });

    // Request socket handlers
    requestIO.on('connection', async (socket) => {
        try {
            // Safety check to ensure socket.user exists
            if (!socket.user || !socket.user._id) {
                console.error('Missing user data in socket connection');
                socket.disconnect(true);
                return;
            }

            console.log(`User connected to support requests: ${socket.user._id}`);

            // Join personal room for direct messages
            socket.join(`user-${socket.user._id}`);

            // If customer service rep, update online status
            if (socket.user.role === 'customer service') {
                console.log(`Service rep online: ${socket.user._id}`);
                await customerSupportService.updateServiceOnlineStatus(
                    socket.user._id,
                    true,
                    socket.id
                );

                // Notify admin about status change
                requestIO.to('admin-room').emit('service-status-change', {
                    serviceId: socket.user._id,
                    isOnline: true
                });
            }

            // Join rooms based on role
            if (socket.user.role === 'admin') {
                socket.join('admin-room');
            } else if (socket.user.role === 'customer service') {
                socket.join('service-room');
            }

            // Handle new complaint submission
            socket.on('submit-complaint', async (data, ack) => {
                try {
                    // Set requiresLiveChat to true for socket submissions
                    const complaintData = {
                        ...data,
                        requiresLiveChat: true // Always true for socket-submitted complaints
                    };

                    const complaint = await customerSupportService.createComplaint(
                        socket.user._id,
                        complaintData
                    );



                    // Send acknowledgment back to the client with the complaint ID
                    if (typeof ack === 'function') {
                        await ack({
                            complaintId: complaint._id.toString(),
                        });
                    }

                    // Notify customer their request is queued or assigned
                    // Emit to service room that new complaint is available
                    requestIO.to('service-room').emit('new-complaint', {
                        complaintId: complaint._id,
                        userId: socket.user._id,
                        orderId: data.orderId,
                        subject: data.subject,
                        requiresLiveChat: true
                    });
                    socket.emit('complaint-status', {
                        complaintId: complaint._id,
                        status: complaint.status
                    });
                } catch (error) {
                    // Return error in the acknowledgment if possible
                    if (typeof ack === 'function') {
                        ack({ error: error.message });
                    } else {
                        socket.emit('error', { message: error.message });
                    }
                }
            });

            // Handle service rep going offline
            socket.on('disconnect', async () => {
                if (socket.user.role === 'customer service') {
                    await customerSupportService.updateServiceOnlineStatus(
                        socket.user._id,
                        false
                    );

                    // Notify admin about status change
                    requestIO.to('admin-room').emit('service-status-change', {
                        serviceId: socket.user._id,
                        isOnline: false
                    });
                }
            });
        } catch (error) {
            console.error('Error in support-requests connection:', error);
            socket.emit('error', { message: 'Connection error' });
        }
    });

    // Chat socket handlers
    chatIO.on('connection', async (socket) => {
        try {
            // Safety check for socket.user
            if (!socket.user || !socket.user._id) {
                console.error('Missing user data in chat socket connection');
                socket.disconnect(true);
                return;
            }

            console.log(`User connected to support chat: ${socket.user._id}`);

            // Join personal room for direct messages
            socket.join(`user-${socket.user._id}`);

            // Handle joining a specific complaint chat
            socket.on('join-chat', async (data) => {
                try {
                    // Handle both object and string parameter formats
                    const complaintId = typeof data === 'object' ? data.complaintId : data;

                    if (!complaintId) {
                        socket.emit('error', { message: 'Complaint ID is required' });
                        return;
                    }

                    // First validate if the user has access to this chat
                    const complaint = await customerSupportService.validateChatAccess(
                        complaintId,
                        socket.user._id,
                        socket.user.role
                    );

                    if (!complaint) {
                        socket.emit('error', { message: 'Cannot access this chat' });
                        return;
                    }

                    // Join the room for this specific complaint
                    socket.join(`complaint-${complaintId}`);

                    // Notify user they've joined successfully
                    socket.emit('joined-chat', {
                        complaintId,
                        status: complaint.status
                    });

                    // Send chat history
                    try {
                        const messages = await customerSupportService.getChatHistory(
                            complaintId,
                            socket.user._id,
                            socket.user.role
                        );

                        socket.emit('chat-history', messages);

                        // Notify others user joined
                        socket.to(`complaint-${complaintId}`).emit('user-joined', {
                            userId: socket.user._id,
                            role: socket.user.role,
                            timestamp: new Date()
                        });
                    } catch (error) {
                        // If error is access-related, the service handles it
                        socket.emit('error', { message: error.message });
                    }
                } catch (error) {
                    console.error('Error joining chat:', error);
                    socket.emit('error', { message: 'Failed to join chat' });
                }
            });

            // Handle new message
            socket.on('send-message', async (data) => {
                try {
                    const { complaintId, content } = data;

                    if (!complaintId || !content) {
                        socket.emit('error', { message: 'Invalid message data' });
                        return;
                    }

                    // Save message to database
                    const result = await customerSupportService.saveChatMessage(
                        complaintId,
                        socket.user.role === 'customer service' ? 'service' : 'customer',
                        socket.user._id,
                        content
                    );

                    // Broadcast message to all in the chat room
                    chatIO.to(`complaint-${complaintId}`).emit('new-message', {
                        id: result.id,
                        sender: result.sender,
                        senderId: socket.user._id,
                        content: content,
                        timestamp: result.timestamp
                    });
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            });

            // Handle complaint resolution
            socket.on('resolve-complaint', async (complaintId) => {
                try {
                    if (socket.user.role !== 'customer service') {
                        socket.emit('error', { message: 'Unauthorized operation' });
                        return;
                    }

                    const result = await customerSupportService.resolveComplaint(
                        complaintId,
                        socket.user._id
                    );

                    // Notify all in the chat room
                    chatIO.to(`complaint-${complaintId}`).emit('complaint-resolved', {
                        complaintId,
                        timestamp: new Date()
                    });

                    // Leave the room
                    socket.leave(`complaint-${complaintId}`);
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            });

            // Add handler for closing a complaint
            socket.on('close-complaint', async (complaintId) => {
                try {
                    const result = await customerSupportService.closeComplaint(
                        complaintId,
                        socket.user._id,
                        socket.user.role
                    );

                    // Notify all in the chat room
                    chatIO.to(`complaint-${complaintId}`).emit('complaint-closed', {
                        complaintId,
                        timestamp: new Date()
                    });

                    // Leave the room
                    socket.leave(`complaint-${complaintId}`);
                } catch (error) {
                    socket.emit('error', { message: error.message });
                }
            });

            // Handle leaving chat
            socket.on('leave-chat', (complaintId) => {
                socket.leave(`complaint-${complaintId}`);
                socket.to(`complaint-${complaintId}`).emit('user-left', {
                    userId: socket.user._id,
                    role: socket.user.role,
                    timestamp: new Date()
                });
            });
        } catch (error) {
            console.error('Error in support-chat connection:', error);
            socket.emit('error', { message: 'Connection error' });
        }
    });

    return io;
};

module.exports = setupSockets;