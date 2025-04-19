const express = require('express');
const router = express.Router();
const { userController } = require('../lib/di');
const authMiddleware = require('../middleware/authMiddleware');

// Wrap each controller method to catch errors and pass to next middleware
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

router.get('/test', asyncHandler((req, res, next) => userController.test(req, res, next)));

router.post('/cart/add', authMiddleware, asyncHandler((req, res, next) => 
    userController.addToCart(req, res, next)
));

router.delete('/cart/remove', authMiddleware, asyncHandler((req, res, next) => 
    userController.deleteFromCart(req, res, next)
));

router.get('/cart', authMiddleware, asyncHandler((req, res, next) => 
    userController.viewCart(req, res, next)
));

router.get('/profile', authMiddleware, asyncHandler((req, res, next) => 
    userController.viewProfile(req, res, next)
));

router.put('/profile', authMiddleware, asyncHandler((req, res, next) => 
    userController.updateProfile(req, res, next)
));

router.post('/change-password', authMiddleware, asyncHandler((req, res, next) => 
    userController.changePassword(req, res, next)
));

module.exports = router;
