const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const DeliveryManModel = require('../models/deliveryManModel');
const CustomerServiceModel = require('../models/customerServiceModel');
const AdminModel = require('../models/adminModel');
const { 
  AuthorizationError, 
  NotFoundError, 
  ServerError 
} = require('../utils/baseException');

// Map models to role names
const models = {
  User: { model: UserModel, role: 'customer' },
  DeliveryMan: { model: DeliveryManModel, role: 'delivery' },
  CustomerService: { model: CustomerServiceModel, role: 'customer service' },
  Admin: { model: AdminModel, role: 'admin' }
};

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthorizationError('No token provided', 'NO_TOKEN_PROVIDED');
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;
      
      // Find the user in all possible models
      let userData = null;
      let userRole = null;
      
      for (const [modelName, { model, role }] of Object.entries(models)) {
        const user = await model.findById(userId);
        if (user) {
          // Convert to plain object and remove sensitive fields
          userData = user.toObject();
          delete userData.hashedPassword;
          delete userData.confirmationToken;
          delete userData.otp;
          userRole = role;
          break;
        }
      }
      
      if (!userData) {
        throw new NotFoundError('User not found', 'USER_NOT_FOUND');
      }
      
      // Set complete user data with role in req.user
      req.user = {
        ...userData,
        role: userRole
      };
      
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new AuthorizationError('Token has expired', 'TOKEN_EXPIRED');
      } else if (error.name === 'JsonWebTokenError') {
        throw new AuthorizationError('Invalid token', 'INVALID_TOKEN');
      }
      
      // Re-throw any BaseException errors
      throw error;
    }
  } catch (error) {
    // Let the error propagate to the global error handler
    next(error);
  }
};

module.exports = authMiddleware;