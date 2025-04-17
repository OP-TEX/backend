const connectDB = require('./db');
const UserModel = require('../models/userModel');
const DeliveryManModel = require('../models/deliveryManModel');
const CustomerServiceModel = require('../models/customerServiceModel');
const AdminModel = require('../models/adminModel');
const ProductModel = require('../models/productModel');
const AuthService = require('../services/authServices');
const AuthController = require('../controllers/authControllers');
const AdminService = require('../services/adminServices');
const AdminController = require('../controllers/adminControllers');
const ProductService = require('../services/productServices');
const ProductController = require('../controllers/productControllers');

// Connect to MongoDB
connectDB();

// Map the roles to their corresponding models
const models = {
  customer: UserModel,
  delivery: DeliveryManModel,
  'customer service': CustomerServiceModel,
  admin: AdminModel,
  product: ProductModel
};

// Create instances
const authService = new AuthService(models);
const authController = new AuthController(authService);

const adminService = new AdminService(models);
const adminController = new AdminController(adminService);

const productService = new ProductService(models);
const productController = new ProductController(productService);

module.exports = { 
  authController, 
  adminController,
  productController
};