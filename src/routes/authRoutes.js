const express = require('express');
const router = express.Router();
const { authController } = require('../lib/di');

// Wrap each controller method to catch errors and pass to next middleware
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

router.post('/register', asyncHandler((req, res, next) => authController.register(req, res, next)));
router.post('/send-confirmation-email', asyncHandler((req, res, next) => authController.sendConfirmationEmail(req, res, next)));
router.post('/confirm-email', asyncHandler((req, res, next) => authController.confirmEmail(req, res, next)));
router.post('/login', asyncHandler((req, res,next) => authController.login(req, res,next)));
router.post('/forgot-password', asyncHandler((req, res, next) => authController.forgotPassword(req, res, next)));
router.post('/confirm-otp', asyncHandler((req, res, next) => authController.confirmOtp(req, res, next)));
router.post('/reset-password', asyncHandler((req, res, next) => authController.resetPassword(req, res, next)));
router.post('/refresh-token', asyncHandler((req, res, next) => authController.refreshToken(req, res, next)));

module.exports = router;