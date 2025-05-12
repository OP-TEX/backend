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

// Clear cart endpoint
router.delete('/cart/clear', authMiddleware, userController.clearCart.bind(userController));

router.get('/profile', authMiddleware, asyncHandler((req, res, next) =>
    userController.viewProfile(req, res, next)
));

router.put('/profile', authMiddleware, asyncHandler((req, res, next) =>
    userController.updateProfile(req, res, next)
));

router.post('/change-password', authMiddleware, asyncHandler((req, res, next) =>
    userController.changePassword(req, res, next)
));

// New routes for address management
router.get('/addresses', authMiddleware, asyncHandler((req, res, next) =>
    userController.getAllAddresses(req, res, next)
));

router.post('/addresses/add', authMiddleware, asyncHandler((req, res, next) =>
    userController.addAddress(req, res, next)
));

router.put('/addresses/:addressId', authMiddleware, asyncHandler((req, res, next) =>
    userController.updateAddress(req, res, next)
));

router.delete('/addresses/:addressId', authMiddleware, asyncHandler((req, res, next) =>
    userController.deleteAddress(req, res, next)
));

// Get contact info endpoint
router.get('/contact/:userId', asyncHandler((req, res, next) =>
    userController.getContactInfo(req, res, next)
));

module.exports = router;
