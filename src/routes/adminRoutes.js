const express = require('express');
const router = express.Router();
const { adminController } = require('../lib/di');
const authMiddleware = require('../middleware/authMiddleware');

// router.get('/users', authMiddleware, (req, res) => adminController.getAllUsers(req, res));
// router.get('/delivery', authMiddleware, (req, res) => adminController.getAllDelivery(req, res));
// router.get('/customer-service', authMiddleware, (req, res) => adminController.getAllCustomerService(req, res));
// router.put('/users/:id/status', authMiddleware, (req, res) => adminController.updateUserStatus(req, res));

router.get('/all-users', authMiddleware, (req, res , next) => adminController.getAllUsersWithRoles(req, res , next));
router.delete('/users/:id', authMiddleware, (req, res , next) => adminController.deleteUser(req, res , next));
router.put('/users/:id/role', authMiddleware, (req, res , next) => adminController.updateUserRole(req, res , next));

router.post('/products', authMiddleware, (req, res , next) => adminController.addProduct(req, res  , next));
router.put('/products/:id', authMiddleware, (req, res , next) => adminController.updateProduct(req, res , next));
router.delete('/products/:id', authMiddleware, (req, res , next) => adminController.deleteProduct(req, res , next));

module.exports = router;
