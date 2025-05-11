const { get, isValidObjectId } = require('mongoose');
const { 
  BadRequestError, 
  NotFoundError, 
  ServerError, 
  ValidationError 
} = require('../utils/baseException');
const { getAIResponse } = require('../lib/ai');

class ProductService {
  constructor(models) {
    this.models = models;
  }

  async getProducts(query) {
    try {
      if (query.id) {
        if (!isValidObjectId(query.id)) {
          throw new BadRequestError("Invalid product ID format", "INVALID_ID_FORMAT");
        }
        const product = await this.models.product.findById(query.id);
        if (!product) {
          throw new NotFoundError("Product not found", "PRODUCT_NOT_FOUND");
        }
        return product;
      }

      let filter = {};
      let limit = 50;
      let skip = 0;

      // Handle name search
      if (query.name) {
        filter.name = { $regex: query.name, $options: 'i' };
      }

      // Handle category filter
      if (query.category) {
        filter.category = query.category;
      }

      // Handle price range filter
      if (query.priceRange) {
        try {
          const [min, max] = JSON.parse(query.priceRange);
          if (isNaN(min) || isNaN(max) || min < 0 || max < min) {
            throw new ValidationError("Invalid price range values", [
              { field: "priceRange", message: "Price range must be valid numbers with min <= max and min >= 0" }
            ]);
          }
          filter.price = { $gte: min, $lte: max };
        } catch (error) {
          if (error instanceof ValidationError) throw error;
          throw new BadRequestError("Invalid price range format", "INVALID_PRICE_RANGE");
        }
      }

      // Handle pagination
      if (query.page && query.count) {
        limit = parseInt(query.count);
        skip = (parseInt(query.page) - 1) * limit;
        
        if (isNaN(limit) || isNaN(skip) || limit <= 0 || skip < 0) {
          throw new ValidationError("Invalid pagination parameters", [
            { field: "pagination", message: "Page and count must be positive numbers" }
          ]);
        }
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
      if (error instanceof ValidationError || 
          error instanceof BadRequestError || 
          error instanceof NotFoundError) {
        throw error;
      }
      throw new ServerError("Error fetching products");
    }
  }

  async getBestSellers() {
    const { getBestSellers } = require('../lib/bestSellers');
    return getBestSellers();
  }

  async getAIResponse(message) {
    try {
      return await getAIResponse(message);
    } catch (error) {
      console.error('Error getting AI response:', error);
      throw new ServerError("Error communicating with AI service");
    }
  }

  async getFeaturedProducts(user) {
    try {
      // Build quantity map from user's order history
      const qtyMap = {};
      const orders = await this.models.order.find({ userId: user._id }).lean();
      
      orders.forEach(order => {
        order.products.forEach(prod => {
          qtyMap[prod.productId] = (qtyMap[prod.productId] || 0) + prod.quantity;
        });
      });

      // Get cart items set
      const cartSet = new Set(user.cart?.items?.map(item => item.productId) || []);

      // Get best sellers
      const bestSellers = await this.getBestSellers();
      const bestSellerSet = new Set(bestSellers.map(p => p._id.toString()));

      // Determine weights based on user history
      const hasOrders = Object.keys(qtyMap).length > 0;
      const hasCartItems = cartSet.size > 0;
      
      let purchaseWeight = 0.5;
      let cartWeight = 0.3;
      let bestSellerWeight = 0.2;

      if (!hasOrders && !hasCartItems) {
        // No history - rely completely on best sellers
        purchaseWeight = 0;
        cartWeight = 0;
        bestSellerWeight = 1;
      } else if (!hasOrders) {
        // No orders - split between cart and best sellers
        purchaseWeight = 0;
        cartWeight = 0.6;
        bestSellerWeight = 0.4;
      } else if (!hasCartItems) {
        // Empty cart - split between purchases and best sellers
        purchaseWeight = 0.7;
        cartWeight = 0;
        bestSellerWeight = 0.3;
      }

      // Get candidate product IDs (union of purchased, cart items, and best sellers)
      const candidateIds = new Set([
        ...Object.keys(qtyMap),
        ...cartSet,
        ...bestSellerSet
      ]);

      // Score each candidate
      const scores = Array.from(candidateIds).map(pid => ({
        productId: pid,
        score: (
          purchaseWeight * ((qtyMap[pid] || 0) / Math.max(...Object.values(qtyMap), 1)) +
          cartWeight * (cartSet.has(pid) ? 1 : 0) +
          bestSellerWeight * (bestSellerSet.has(pid) ? 1 : 0)
        )
      }));

      // Sort by score and take top 6
      scores.sort((a, b) => b.score - a.score);
      const topIds = scores.slice(0, 6).map(s => s.productId);

      // If we don't have 6 products, fetch random ones to fill
      if (topIds.length < 6) {
        const additional = await this.models.product
          .aggregate([
            { $match: { _id: { $nin: topIds } } },
            { $sample: { size: 6 - topIds.length } }
          ]);
        topIds.push(...additional.map(p => p._id.toString()));
      }

      // Fetch full products
      const products = await this.models.product
        .find({ _id: { $in: topIds } })
        .lean();

      // Sort products by original score order
      const scoreMap = Object.fromEntries(scores.map(s => [s.productId, s.score]));
      products.sort((a, b) => (scoreMap[b._id.toString()] || 0) - (scoreMap[a._id.toString()] || 0));

      return products;
    } catch (error) {
      throw new ServerError("Error getting featured products");
    }
  }
}

module.exports = ProductService;
