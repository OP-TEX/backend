const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { ForbiddenError } = require('../utils/baseException');

module.exports = (orderController) => {
  // Apply authentication middleware to all order routes
  router.use(authMiddleware);

  // Role-based access middleware
  const adminOnly = (req, res, next) => {
    if (req.user.role !== 'admin') {
      return next(new ForbiddenError('Admin access required', 'ADMIN_ACCESS_REQUIRED'));
    }
    next();
  };

  const deliveryOrAdmin = (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'delivery') {
      return next(new ForbiddenError('Delivery or admin access required', 'DELIVERY_OR_ADMIN_ACCESS_REQUIRED'));
    }
    next();
  };

  // Specific routes first to avoid conflicts with parameterized routes
  
  // Create a new order
  router.post('/', (req, res, next) => orderController.createOrder(req, res, next));
  
  // Create payment intent for a specific order
  router.post('/payment-intent', (req, res, next) => orderController.createPaymentIntent(req, res, next));

  // Confirm payment for an order (client-side confirmation)
  router.post('/confirm-payment', (req, res, next) => orderController.confirmPayment(req, res, next));

  // Get all orders for the authenticated user
  router.get('/my', (req, res, next) => orderController.getOrdersByUserId(req, res, next));
  
  // Get all orders assigned to a delivery man (delivery role)
  router.get('/delivery', (req, res, next) => orderController.getOrdersByDeliveryId(req, res, next));
  
  // Get order statistics (admin role)
  router.get('/stats', adminOnly, (req, res, next) => orderController.getOrderStats(req, res, next));
  
  // Get orders by status (admin role)
  router.get('/status/:status', adminOnly, (req, res, next) => orderController.getOrdersByStatus(req, res, next));
  
  // Assign delivery man to order (admin role)
  router.put('/assign', adminOnly, (req, res, next) => orderController.assignDeliveryToOrder(req, res, next));
  
  // Get all orders (admin role)
  router.get('/', adminOnly, (req, res, next) => orderController.getAllOrders(req, res, next));
  
  // Get a single order by its orderId
  router.get('/:orderId', (req, res, next) => orderController.getOrderById(req, res, next));
  
  // Update delivery man's cities (delivery role only)
  router.patch('/update-cities', (req, res, next) => {
    if (req.user.role !== 'delivery') {
      return next(new ForbiddenError('Delivery access required'));
    }
    orderController.updateDeliveryCities(req, res, next);
  });

  // Update order status (admin or delivery role)
  router.put('/:orderId', deliveryOrAdmin, (req, res, next) => orderController.updateOrderStatus(req, res, next));


  return router;
};
