class ProductService {
  constructor(models) {
    this.models = models;
  }

  async getProducts(query) {
    try {
      let filter = {};
      let limit = 50;
      let skip = 0;

      // Handle category filter
      if (query.category) {
        filter.category = query.category;
      }

      // Handle price range filter
      if (query.priceRange) {
        try {
          const [min, max] = JSON.parse(query.priceRange);
          filter.price = { $gte: min, $lte: max };
        } catch (error) {
          throw new Error('Invalid price range format');
        }
      }

      // Handle specific product by ID
      if (query.id) {
        return await this.models.product.findById(query.id);
      }

      // Handle pagination
      if (query.page && query.count) {
        limit = parseInt(query.count);
        skip = (parseInt(query.page) - 1) * limit;
      }

      const products = await this.models.product
        .find(filter)
        .skip(skip)
        .limit(limit);

      const total = await this.models.product.countDocuments(filter);

      return {
        products,
        total,
        page: query.page ? parseInt(query.page) : 1,
        pageSize: limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getAllProducts() {
    return await this.models.product.find();
  }

  async getProductById(id) {
    return await this.models.product.findById(id);
  }

  async createProduct(productData) {
    const product = new this.models.product(productData);
    return await product.save();
  }

  async updateProduct(id, productData) {
    return await this.models.product.findByIdAndUpdate(id, productData, { new: true });
  }

  async deleteProduct(id) {
    return await this.models.product.findByIdAndDelete(id);
  }
}

module.exports = ProductService;
