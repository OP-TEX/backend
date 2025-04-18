class OrderController {
    constructor(orderService) {
        this.orderService = orderService;
    }

    createOrder = async (req, res) => {
        try {
            // userId is available from req.user (set by auth middleware)
            const userId = req.user._id;
            const order = await this.orderService.createOrder(req.body, userId);
            res.status(201).json(order);
        } catch (error) {
            res.status(400).json({ message: error.message });
        }
    };
}