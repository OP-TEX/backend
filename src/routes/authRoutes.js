const express = require('express');
const router = express.Router();
const { authController } = require('../lib/di');

router.post('/register', (req, res) => authController.register(req, res));
router.post('/send-confirmation-email', (req, res) => authController.sendConfirmationEmail(req, res));
router.post('/confirm-email', (req, res) => authController.confirmEmail(req, res));
router.post('/login', (req, res) => authController.login(req, res));
router.post('/forgot-password', (req, res) => authController.forgotPassword(req, res));
router.post('/confirm-otp', (req, res) => authController.confirmOtp(req, res));
router.post('/reset-password', (req, res) => authController.resetPassword(req, res));
router.post('/refresh-token', (req, res) => authController.refreshToken(req, res));

module.exports = router;