const mongoose = require('mongoose');
const { uploadImage } = require('../lib/cloudinary');

class AdminController {
    constructor(adminService) {
        this.adminService = adminService;
    }

    async getAllUsers(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Not authorized' });
            }
            const users = await this.adminService.getAllUsers();
            res.status(200).json(users);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async getAllDelivery(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Not authorized' });
            }
            const delivery = await this.adminService.getAllDelivery();
            res.status(200).json(delivery);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async getAllCustomerService(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Not authorized' });
            }
            const customerService = await this.adminService.getAllCustomerService();
            res.status(200).json(customerService);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async deleteUser(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Not authorized' });
            }
            const { id } = req.params;
            await this.adminService.deleteUser(id);
            res.status(200).json({ message: 'User deleted successfully' });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async updateUserStatus(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Not authorized' });
            }
            const { id } = req.params;
            const { status } = req.body;
            const result = await this.adminService.updateUserStatus(id, status);
            res.status(200).json(result);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async addProduct(req, res) {
        try {

            if (req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Not authorized' });
            }

            const { name, price, description, category, vendor, stock } = req.body;
            
            const imagesUrl = [];
            if (req.files && req.files.images) {
                const images = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
                
                const maxSize = 2 * 1024 * 1024;
                for (const image of images) {
                    if (image.size > maxSize) {
                        return res.status(400).json({ 
                            error: `Image ${image.name} exceeds the 2MB size limit`
                        });
                    }
                    
                    const imageUrl = await uploadImage(image.tempFilePath);
                    imagesUrl.push(imageUrl);
                }
            }

            const productData = {
                name,
                price: Number(price),
                description,
                category,
                vendor,
                stock: Number(stock),
                imagesUrl
            };

            const product = await this.adminService.addProduct(productData);
            res.status(201).json(product);
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    async deleteProduct(req, res) {
        try {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Not authorized' });
            }
            
            const { id } = req.params;
            if (!id) {
                return res.status(400).json({ error: 'Product ID is required' });
            }

            // Validate if the id is a valid MongoDB ObjectId
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({ error: 'Invalid product ID format' });
            }
            
            try {
                const result = await this.adminService.deleteProduct(id);
                res.status(200).json(result);
            } catch (error) {
                if (error.message === 'Product not found') {
                    return res.status(404).json({ error: 'Product not found' });
                }
                throw error;
            }
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }
}

module.exports = AdminController;
