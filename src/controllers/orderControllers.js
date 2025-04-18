class OrderController {
    constructor(orderService) {
        this.orderService = orderService;
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
            const order = await this.orderService.getOrderById(orderId);
            if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
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
    // PUT /api/orders/:orderId/status
    // req.body = { status: "Confirmed" | "Out for Delivery" | "Delivered" | "Cancelled" }
    updateOrderStatus = async (req, res, next) => {
        try {
            const { orderId } = req.params;
            const { status } = req.body;
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
}

module.exports = OrderController;