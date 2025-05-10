const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { ForbiddenError } = require('../utils/baseException');

module.exports = (customerSupportController) => {
    // Apply authentication middleware to all support routes
    router.use(authMiddleware);

    // Role-based access middleware
    const serviceOrAdmin = (req, res, next) => {
        if (req.user.role !== 'admin' && req.user.role !== 'customer service') {
            return next(new ForbiddenError('Service or admin access required', 'SERVICE_OR_ADMIN_ACCESS_REQUIRED'));
        }
        next();
    };

    const serviceOnly = (req, res, next) => {
        if (req.user.role !== 'customer service') {
            return next(new ForbiddenError('Service representative access required', 'SERVICE_ACCESS_REQUIRED'));
        }
        next();
    };

    // Customer routes
    router.post('/complaints', (req, res, next) => customerSupportController.createComplaint(req, res, next));
    router.get('/my-complaints', (req, res, next) => customerSupportController.getCustomerComplaints(req, res, next));

    // Service rep routes
    router.get('/assigned', serviceOrAdmin, (req, res, next) => customerSupportController.getServiceComplaints(req, res, next));
    router.put('/resolve/:complaintId', serviceOrAdmin, (req, res, next) => customerSupportController.resolveComplaint(req, res, next));
    
    // Add REST endpoint for sending chat messages (as alternative to sockets)
    router.post('/chat/:complaintId/messages', (req, res, next) => customerSupportController.sendChatMessage(req, res, next));
    
    // Add REST endpoint for updating online status
    router.put('/status', serviceOnly, (req, res, next) => customerSupportController.updateOnlineStatus(req, res, next));

    // Shared routes
    router.get('/chat/:complaintId', (req, res, next) => customerSupportController.getChatHistory(req, res, next));

    // Admin and service rep reports
    router.get('/performance', serviceOrAdmin, (req, res, next) => customerSupportController.getPerformanceStats(req, res, next));

    return router;
};