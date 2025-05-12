const { NotFoundError, BadRequestError } = require('../utils/baseException');
const { createPaymentIntent, verifyPaymentStatus } = require('../lib/stripe');

class OrderController {
    constructor(orderService, models) {
        this.orderService = orderService;
        this.models = models;
    }

    // Create a new order
    // req.body = {
    //   products: [{ productId: "...", quantity: 2 }, ...],
    //   address: { street, city, Gover, building, floor, apartment },
    //   payment_method: "cash_on_delivery" | "prepaid"
    // }
    // userId is taken from req.user (auth middleware)
    createOrder = async (req, res, next) => {
        try {
            const userId = req.user._id;
            const order = await this.orderService.createOrder(req.body, userId);
            res.status(201).json({ success: true, order });
        } catch (error) {
            next(error);
        }
    };

    // Get all orders for the authenticated user
    // GET /api/orders/my
    getOrdersByUserId = async (req, res, next) => {
        try {
            const userId = req.user._id;
            const orders = await this.orderService.getOrdersByUserId(userId);
            res.json({ success: true, orders });
        } catch (error) {
            next(error);
        }
    };

    // Get all orders assigned to a delivery man
    // GET /api/orders/delivery
    getOrdersByDeliveryId = async (req, res, next) => {
        try {
            const deliveryId = req.user._id;
            const orders = await this.orderService.getOrdersByDeliveryId(deliveryId);
            res.json({ success: true, orders });
        } catch (error) {
            next(error);
        }
    };

    // Get a single order by its orderId
    // GET /api/orders/:orderId
    getOrderById = async (req, res, next) => {
        try {
            const { orderId } = req.params;

            if (!orderId) {
                throw new BadRequestError('Order ID is required');
            }

            const order = await this.orderService.getOrderById(orderId);
            res.json({ success: true, order });
        } catch (error) {
            next(error);
        }
    };

    // Get all orders (admin panel)
    // GET /api/orders
    getAllOrders = async (req, res, next) => {
        try {
            const orders = await this.orderService.getAllOrders();
            res.json({ success: true, orders });
        } catch (error) {
            next(error);
        }
    };

    // Update order status (admin or delivery)
    // PUT /api/orders/:orderId
    // req.body = { status: "Confirmed" | "Out for Delivery" | "Delivered" | "Cancelled" }
    updateOrderStatus = async (req, res, next) => {
        try {
            const { orderId } = req.params;
            const { status } = req.body;

            if (!orderId) {
                throw new BadRequestError('Order ID is required');
            }

            if (!status) {
                throw new BadRequestError('Status is required');
            }

            const order = await this.orderService.updateOrderStatus(orderId, status);
            res.json({ success: true, order });
        } catch (error) {
            next(error);
        }
    };

    // Assign delivery man to order (admin)
    // PUT /api/orders/assign
    // req.body = { orderId: "...", deliveryId: "..." }
    assignDeliveryToOrder = async (req, res, next) => {
        try {
            const { orderId, deliveryId } = req.body;
            const order = await this.orderService.assignDeliveryToOrder(orderId, deliveryId);
            res.json({ success: true, order });
        } catch (error) {
            next(error);
        }
    };

    // Get order statistics (admin)
    // GET /api/orders/stats
    getOrderStats = async (req, res, next) => {
        try {
            const stats = await this.orderService.getOrderStats();
            res.json({ success: true, stats });
        } catch (error) {
            next(error);
        }
    };

    // Get orders by status (admin)
    // GET /api/orders/status/:status
    getOrdersByStatus = async (req, res, next) => {
        try {
            const { status } = req.params;
            const orders = await this.orderService.getOrdersByStatus(status);
            res.json({ success: true, orders });
        } catch (error) {
            next(error);
        }
    };

    // Update delivery cities list
    // PUT /api/orders/update-cities
    // req.body = { cities: ["City1", "City2", ...] }
    updateDeliveryCities = async (req, res, next) => {
        try {
            const { cities } = req.body;

            if (!cities || !Array.isArray(cities)) {
                throw new BadRequestError('Cities must be provided as an array');
            }

            const deliveryId = req.user._id;
            const result = await this.orderService.updateDeliveryCities(deliveryId, cities);
            res.json({ success: true, message: "Cities updated successfully", cities: result.cities });
        } catch (error) {
            next(error);
        }
    };

    createPaymentIntent = async (req, res, next) => {
        try {
            const userId = req.user?._id;
            if (!userId) {
                throw new BadRequestError('User ID is required');
            }
            
            const { orderId } = req.body || {};
            if (!orderId) {
                throw new BadRequestError('Order ID is required');
            }

            // Get the order
            const order = await this.orderService.getOrderById(orderId);
            if (!order) {
                throw new NotFoundError('Order not found');
            }
            
            // Verify order belongs to user and is in pending status
            const orderUserId = order.userId?.toString();
            const currentUserId = userId.toString();
            
            if (!orderUserId || orderUserId !== currentUserId) {
                throw new BadRequestError('Cannot pay for someone else\'s order');
            }

            if (order.status !== 'Pending') {
                throw new BadRequestError('This order is not pending payment');
            }

            if (order.payment_method !== 'prepaid') {
                throw new BadRequestError('This order is not set for prepaid payment');
            }

            // Get user email for receipt
            const user = await this.models.customer.findById(userId);

            if (!user || !user.email) {
                throw new NotFoundError('User email not found');
            }
            
            
            const paymentIntent = await createPaymentIntent(
                order.totalPrice,
                order.orderId,
                user.email
            );

            res.status(200).json({
                success: true,
                clientSecret: paymentIntent.clientSecret,
                paymentIntentId: paymentIntent.paymentIntentId
            });
        } catch (error) {
            next(error);
        }
    };

    confirmPayment = async (req, res, next) => {
        try {
            const { orderId, paymentIntentId } = req.body;
            console.log(orderId, paymentIntentId);
            if (!orderId || !paymentIntentId) {
                throw new BadRequestError('Order ID and Payment Intent ID are required');
            }

            // First, verify the payment status
            const paymentStatus = await verifyPaymentStatus(paymentIntentId);

            if (paymentStatus.succeeded) {
                // If payment succeeded, update order status and assign delivery
                const order = await this.orderService.updateOrderStatus(orderId, 'Confirmed');

                // Try to assign a delivery person
                await this.orderService.assignDeliveryToOrder(orderId, order.deliveryId || '');

                res.status(200).json({
                    success: true,
                    message: 'Payment confirmed and order processed',
                    order
                });
            } else {
                // If payment failed, handle failure and return stock
                const order = await this.orderService.handlePaymentFailure(orderId);

                res.status(200).json({
                    success: false,
                    message: 'Payment failed. Order has been cancelled.',
                    order
                });
            }
        } catch (error) {
            next(error);
        }
    };
}

module.exports = OrderController;