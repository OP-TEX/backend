const jwt = require('jsonwebtoken');
const UserModel = require('../models/userModel');
const DeliveryManModel = require('../models/deliveryManModel');
const CustomerServiceModel = require('../models/customerServiceModel');
const AdminModel = require('../models/adminModel');

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
      return res.status(401).json({ 
        error: 'No token provided' 
      });
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
        return res.status(404).json({
          status: '40400',
          message: 'User not found'
        });
      }
      
      // Set complete user data with role in req.user
      req.user = {
        ...userData,
        role: userRole
      };
      
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          status: '40101',
          message: 'Token has expired'
        });
      }
      
      return res.status(401).json({
        status: '40102',
        message: 'Invalid token'
      });
    }
  } catch (error) {
    return res.status(500).json({
      status: '50000',
      message: 'Internal server error'
    });
  }
};

module.exports = authMiddleware;