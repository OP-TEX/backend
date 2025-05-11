const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

// Wrap each controller method to catch errors and pass to next middleware
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = (productController) => {
  router.use(authMiddleware);

  router.get('/', asyncHandler((req, res, next) => productController.getAllProducts(req, res, next)));
  router.get('/best-sellers', asyncHandler((req, res, next) => productController.getBestSellers(req, res, next)));
  router.get('/featured-products', asyncHandler((req, res, next) => productController.getFeaturedProducts(req, res, next)));
  router.post('/ai' , asyncHandler((req, res, next) => productController.chatWithAi(req, res, next)));

  return router;
};
