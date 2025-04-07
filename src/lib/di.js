const connectDB = require('./db');
const UserModel = require('../models/userModel');
const DeliveryManModel = require('../models/deliveryManModel');
const CustomerServiceModel = require('../models/customerServiceModel');
const AuthService = require('../services/authServices');
const AuthController = require('../controllers/authControllers');

// Connect to MongoDB
connectDB();

// Map the roles to their corresponding models.
// Note: The key names here match the expected role string in the register request.
const models = {
  customer: UserModel,
  delivery: DeliveryManModel,
  'customer service': CustomerServiceModel,
};

const authService = new AuthService(models);
const authController = new AuthController(authService);

module.exports = { authController };