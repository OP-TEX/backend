const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');

// Socket setup function
const setupSockets = (server, customerSupportService) => {
    const io = socketIO(server, {
        cors: {
            origin: "*",  // For development; restrict in production
            methods: ["GET", "POST"],
            credentials: true
        }
    });

    // Improved authentication middleware for sockets
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
                socket.user = decoded;
                console.log(`Socket authenticated: ${decoded._id}`);
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

    // Request socket - for customer service request queue
    const requestIO = io.of('/support-requests');

    requestIO.use(authMiddleware);


    requestIO.on('connection', async (socket) => {
        try {
            // Safety check to ensure socket.user exists
            if (!socket.user || !socket.user._id) {
                console.error('Missing user data in socket connection');
                socket.disconnect(true);
                return;
            }

            console.log(`User connected to support requests: ${socket.user._id}`);

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

            // Rest of your connection handler code...
        } catch (error) {
            console.error('Error in support-requests connection:', error);
            socket.emit('error', { message: 'Connection error' });
        }
        // Join rooms based on role
        if (socket.user.role === 'admin') {
            socket.join('admin-room');
        } else if (socket.user.role === 'customer service') {
            socket.join('service-room');
        }

        // Handle new complaint submission
        socket.on('submit-complaint', async (data) => {
            try {
                const complaint = await customerSupportService.createComplaint(
                    socket.user._id,
                    data
                );

                // Emit to service room that new complaint is available
                requestIO.to('service-room').emit('new-complaint', {
                    complaintId: complaint._id,
                    userId: socket.user._id,
                    orderId: data.orderId,
                    subject: data.subject
                });

                // Notify customer their request is queued or assigned
                socket.emit('complaint-status', {
                    complaintId: complaint._id,
                    status: complaint.status
                });
            } catch (error) {
                socket.emit('error', { message: error.message });
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
    });

    // Chat socket - for real-time messaging
    const chatIO = io.of('/support-chat');

    chatIO.on('connection', async (socket) => {
        console.log(`User connected to support chat: ${socket.user._id}`);

        // Join personal room for direct messages
        socket.join(`user-${socket.user._id}`);

        // Handle joining a specific complaint chat
        socket.on('join-chat', async (complaintId) => {
            try {
                // Use the service to get chat history which also validates access
                try {
                    const messages = await customerSupportService.getChatHistory(
                        complaintId,
                        socket.user._id,
                        socket.user.role
                    );

                    // Join complaint room
                    socket.join(`complaint-${complaintId}`);

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
                socket.emit('error', { message: error.message });
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

        // Handle leaving chat
        socket.on('leave-chat', (complaintId) => {
            socket.leave(`complaint-${complaintId}`);
            socket.to(`complaint-${complaintId}`).emit('user-left', {
                userId: socket.user._id,
                role: socket.user.role,
                timestamp: new Date()
            });
        });
    });

    return io;
};

module.exports = setupSockets;