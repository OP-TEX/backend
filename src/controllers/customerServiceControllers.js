const {
    NotFoundError,
    ValidationError,
    ForbiddenError,
    MethodNotAllowedError,
    BadRequestError
} = require('../utils/baseException');

/**
 * Controller for customer support operations
 */
class CustomerSupportController {
    /**
     * Creates a new CustomerSupportController
     * @param {Object} customerSupportService - The customer support service
     * @param {Object} models - Database models for direct access if needed
     */
    constructor(customerSupportService, models) {
        this.customerSupportService = customerSupportService;
        this.models = models;
    }

    // Submit new complaint
    async createComplaint(req, res, next) {
        try {
            if (req.method !== 'POST') {
                throw new MethodNotAllowedError("Method not allowed", "METHOD_NOT_ALLOWED");
            }

            const { orderId, subject, description } = req.body;

            if (!orderId) {
                throw new BadRequestError("Order ID is required", "ORDER_ID_REQUIRED");
            }

            if (!subject) {
                throw new BadRequestError("Subject is required", "SUBJECT_REQUIRED");
            }

            if (!description) {
                throw new BadRequestError("Description is required", "DESCRIPTION_REQUIRED");
            }

            const complaint = await this.customerSupportService.createComplaint(
                req.user._id,
                { orderId, subject, description }
            );

            res.status(201).json({
                message: "Complaint submitted successfully",
                complaint
            });
        } catch (error) {
            next(error);
        }
    }

    // Get customer complaints
    async getCustomerComplaints(req, res, next) {
        try {
            if (req.method !== 'GET') {
                throw new MethodNotAllowedError("Method not allowed", "METHOD_NOT_ALLOWED");
            }

            // Use the service method instead of direct model access
            const complaints = await this.customerSupportService.getCustomerComplaints(req.user._id);

            res.status(200).json(complaints);
        } catch (error) {
            next(error);
        }
    }

    // Get service rep assigned complaints
    async getServiceComplaints(req, res, next) {
        try {
            if (req.method !== 'GET') {
                throw new MethodNotAllowedError("Method not allowed", "METHOD_NOT_ALLOWED");
            }

            if (req.user.role !== 'customer service') {
                throw new ForbiddenError("Unauthorized access", "UNAUTHORIZED");
            }

            // Use the service method instead of direct model access
            const complaints = await this.customerSupportService.getServiceComplaints(req.user._id);

            res.status(200).json(complaints);
        } catch (error) {
            next(error);
        }
    }

    // Get chat history
    async getChatHistory(req, res, next) {
        try {
            if (req.method !== 'GET') {
                throw new MethodNotAllowedError("Method not allowed", "METHOD_NOT_ALLOWED");
            }

            const { complaintId } = req.params;

            if (!complaintId) {
                throw new BadRequestError("Complaint ID is required", "COMPLAINT_ID_REQUIRED");
            }

            const messages = await this.customerSupportService.getChatHistory(
                complaintId,
                req.user._id,
                req.user.role
            );

            res.status(200).json(messages);
        } catch (error) {
            next(error);
        }
    }

    // Send chat message - Missing controller method
    async sendChatMessage(req, res, next) {
        try {
            if (req.method !== 'POST') {
                throw new MethodNotAllowedError("Method not allowed", "METHOD_NOT_ALLOWED");
            }

            const { complaintId } = req.params;
            const { content } = req.body;

            if (!complaintId) {
                throw new BadRequestError("Complaint ID is required", "COMPLAINT_ID_REQUIRED");
            }

            if (!content) {
                throw new BadRequestError("Message content is required", "CONTENT_REQUIRED");
            }

            // Determine sender type based on user role
            const sender = req.user.role === 'customer service' ? 'service' : 'customer';

            const message = await this.customerSupportService.saveChatMessage(
                complaintId,
                sender,
                req.user._id,
                content
            );

            res.status(201).json(message);
        } catch (error) {
            next(error);
        }
    }

    // Resolve complaint
    async resolveComplaint(req, res, next) {
        try {
            if (req.method !== 'PUT') {
                throw new MethodNotAllowedError("Method not allowed", "METHOD_NOT_ALLOWED");
            }

            if (req.user.role !== 'customer service') {
                throw new ForbiddenError("Unauthorized access", "UNAUTHORIZED");
            }

            const { complaintId } = req.params;

            if (!complaintId) {
                throw new BadRequestError("Complaint ID is required", "COMPLAINT_ID_REQUIRED");
            }

            const result = await this.customerSupportService.resolveComplaint(
                complaintId,
                req.user._id
            );

            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    // Get performance stats
    async getPerformanceStats(req, res, next) {
        try {
            if (req.method !== 'GET') {
                throw new MethodNotAllowedError("Method not allowed", "METHOD_NOT_ALLOWED");
            }

            if (req.user.role !== 'customer service' && req.user.role !== 'admin') {
                throw new ForbiddenError("Unauthorized access", "UNAUTHORIZED");
            }

            const { period } = req.query;
            const serviceId = req.user.role === 'admin' ? req.query.serviceId : req.user._id;

            if (!serviceId) {
                throw new BadRequestError("Service ID is required", "SERVICE_ID_REQUIRED");
            }

            const stats = await this.customerSupportService.getServicePerformance(
                serviceId,
                period
            );

            res.status(200).json(stats);
        } catch (error) {
            next(error);
        }
    }

    // Update service rep online status - Missing controller method
    async updateOnlineStatus(req, res, next) {
        try {
            if (req.method !== 'PUT') {
                throw new MethodNotAllowedError("Method not allowed", "METHOD_NOT_ALLOWED");
            }

            if (req.user.role !== 'customer service') {
                throw new ForbiddenError("Unauthorized access", "UNAUTHORIZED");
            }

            const { isOnline } = req.body;
            const { socketId } = req.query;

            if (isOnline === undefined) {
                throw new BadRequestError("Online status is required", "STATUS_REQUIRED");
            }

            const serviceRep = await this.customerSupportService.updateServiceOnlineStatus(
                req.user._id,
                isOnline,
                socketId
            );

            res.status(200).json({
                message: `Status updated to ${isOnline ? 'online' : 'offline'}`,
                serviceRep
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = CustomerSupportController;