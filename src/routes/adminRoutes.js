const express = require('express');
const router = express.Router();
const { adminController } = require('../lib/di');
const authMiddleware = require('../middleware/authMiddleware');

// router.get('/users', authMiddleware, (req, res) => adminController.getAllUsers(req, res));
// router.get('/delivery', authMiddleware, (req, res) => adminController.getAllDelivery(req, res));
// router.get('/customer-service', authMiddleware, (req, res) => adminController.getAllCustomerService(req, res));
// router.delete('/users/:id', authMiddleware, (req, res) => adminController.deleteUser(req, res));
// router.put('/users/:id/status', authMiddleware, (req, res) => adminController.updateUserStatus(req, res));

router.get('/all-users', authMiddleware, (req, res) => adminController.getAllUsersWithRoles(req, res));

router.post('/products', authMiddleware, (req, res) => adminController.addProduct(req, res));
router.delete('/products/:id', authMiddleware, (req, res) => adminController.deleteProduct(req, res));
router.put('/users/:id/role', authMiddleware, (req, res) => adminController.updateUserRole(req, res));

module.exports = router;
