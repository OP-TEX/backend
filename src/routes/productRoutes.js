const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

module.exports = (productController) => {
  // Apply authentication middleware to all product routes
  router.use(authMiddleware);

  router.get('/', productController.getAllProducts);
  router.get('/:id', productController.getProductById);
//   router.post('/', productController.createProduct);
//   router.put('/:id', productController.updateProduct);
//   router.delete('/:id', productController.deleteProduct);

  return router;
};
