const connectDB = require('./db');
const UserModel = require('../models/userModel');
const DeliveryManModel = require('../models/deliveryManModel');
const CustomerServiceModel = require('../models/customerServiceModel');
const AdminModel = require('../models/adminModel');
const ProductModel = require('../models/productModel');
const OrderModel = require('../models/orderModel');
const ComplaintModel = require('../models/complaintModel');
const MessageModel = require('../models/messageModel');
const ServiceResponseModel = require('../models/responseModel');
const AuthService = require('../services/authServices');
const AuthController = require('../controllers/authControllers');
const AdminService = require('../services/adminServices');
const AdminController = require('../controllers/adminControllers');
const ProductService = require('../services/productServices');
const ProductController = require('../controllers/productControllers');
const OrderService = require('../services/orderServices');
const OrderController = require('../controllers/orderControllers');
const UserService = require('../services/userServices');
const UserController = require('../controllers/userControllers');
const CustomerSupportService = require('../services/customerServiceServices');
const CustomerSupportController = require('../controllers/customerServiceControllers');

// Connect to MongoDB
connectDB();

// Map the roles to their corresponding models
const models = {
  customer: UserModel,
  delivery: DeliveryManModel,
  customerService: CustomerServiceModel,
  admin: AdminModel,
  product: ProductModel,
  order: OrderModel,
  complaint: ComplaintModel,
  message: MessageModel,
  serviceResponse: ServiceResponseModel,
};

// Create instances
const authService = new AuthService(models);
const authController = new AuthController(authService);

const adminService = new AdminService(models);
const adminController = new AdminController(adminService);

const productService = new ProductService(models);
const productController = new ProductController(productService);

const orderService = new OrderService(models);
const orderController = new OrderController(orderService);

const userService = new UserService(models);
const userController = new UserController(userService);

const customerSupportService = new CustomerSupportService(models);
const customerSupportController = new CustomerSupportController(customerSupportService);

module.exports = {
  authController,
  adminController,
  productController,
  orderController,
  userController,
  customerSupportController,
  customerSupportService // Export service for direct use in sockets
};