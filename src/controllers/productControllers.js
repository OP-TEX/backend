const { BadRequestError, NotFoundError, ServerError } = require('../utils/baseException');

class ProductController {
  constructor(productService) {
    this.productService = productService;
  }

  getAllProducts = async (req, res, next) => {
    try {
      const result = await this.productService.getProducts(req.query);
      res.json(result);
    } catch (error) {
      if (error.message === 'Invalid product ID format') {
        next(new BadRequestError(error.message, 'INVALID_ID_FORMAT'));
      } else if (error.message === 'Product not found') {
        next(new NotFoundError(error.message, 'PRODUCT_NOT_FOUND'));
      } else {
        next(new ServerError('Error fetching products'));
      }
    }
  };

  getBestSellers = async (req, res, next) => {
    try {
      const bestSellers = await this.productService.getBestSellers();
      res.json(bestSellers);
    } catch (error) {
      next(new ServerError('Error fetching best sellers'));
    }
  };

  getFeaturedProducts = async (req, res, next) => {
    try {
      const products = await this.productService.getFeaturedProducts(req.user);
      res.json(products);
    } catch (error) {
      next(new ServerError('Error fetching featured products'));
    }
  };

  chatWithAi = async (req, res, next) => {
    try {
      const { message, device } = req.body;
      if (!message || !device) {
        return next(new BadRequestError('Message and device are required', 'MISSING_FIELDS'));
      }
      
      
      let modifiedMessage = message;
      
      const response = await this.productService.getAIResponse(modifiedMessage);
      res.json({ message: response });
    } catch (error) {
      next(new ServerError('Error communicating with AI'));
    }
  };

}

module.exports = ProductController;
