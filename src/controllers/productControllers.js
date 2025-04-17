class ProductController {
  constructor(productService) {
    this.productService = productService;
  }

  getAllProducts = async (req, res) => {
    try {
      const result = await this.productService.getProducts(req.query);
      res.json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  };

  getProductById = async (req, res) => {
    try {
      const product = await this.productService.getProductById(req.params.id);
      if (!product) return res.status(404).json({ message: 'Product not found' });
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };

  createProduct = async (req, res) => {
    try {
      const product = await this.productService.createProduct(req.body);
      res.status(201).json(product);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  };

  updateProduct = async (req, res) => {
    try {
      const product = await this.productService.updateProduct(req.params.id, req.body);
      if (!product) return res.status(404).json({ message: 'Product not found' });
      res.json(product);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  };

  deleteProduct = async (req, res) => {
    try {
      const product = await this.productService.deleteProduct(req.params.id);
      if (!product) return res.status(404).json({ message: 'Product not found' });
      res.json({ message: 'Product deleted' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
}

module.exports = ProductController;
