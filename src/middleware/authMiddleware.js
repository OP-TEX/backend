const jwt = require('jsonwebtoken');

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
      req.user = {
        id: decoded.id
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