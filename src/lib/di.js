const connectDB = require('./db');
const UserModel = require('../models/userModel');
const DeliveryManModel = require('../models/deliveryManModel');
const CustomerServiceModel = require('../models/customerServiceModel');
const AdminModel = require('../models/adminModel');
const ProductModel = require('../models/productModel');
const OrderModel = require('../models/orderModel');
const AuthService = require('../services/authServices');
const AuthController = require('../controllers/authControllers');
const AdminService = require('../services/adminServices');
const AdminController = require('../controllers/adminControllers');
const ProductService = require('../services/productServices');
const ProductController = require('../controllers/productControllers');
const UserService = require('../services/userServices');
const UserController = require('../controllers/userControllers');

// Connect to MongoDB
connectDB();

// Map the roles to their corresponding models
const models = {
  customer: UserModel,
  delivery: DeliveryManModel,
  'customer service': CustomerServiceModel,
  admin: AdminModel,
  product: ProductModel,
  order: OrderModel,
};

// Create instances
const authService = new AuthService(models);
const authController = new AuthController(authService);

const adminService = new AdminService(models);
const adminController = new AdminController(adminService);

const productService = new ProductService(models);
const productController = new ProductController(productService);

const userService = new UserService(models);
const userController = new UserController(userService);

module.exports = { 
  authController, 
  adminController,
  productController,
  userController
};