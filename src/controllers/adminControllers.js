const mongoose = require('mongoose');
const { uploadImage } = require('../lib/cloudinary');
const { 
    ForbiddenError, 
    NotFoundError, 
    ValidationError, 
    BadRequestError
} = require('../utils/baseException');

class AdminController {
    constructor(adminService) {
        this.adminService = adminService;
    }

    async getAllUsers(req, res, next) {
        try {
            if (req.user.role !== 'admin') {
                throw new ForbiddenError('Admin access required');
            }
            const users = await this.adminService.getAllUsers();
            res.status(200).json(users);
        } catch (error) {
            next(error);
        }
    }

    async getAllUsersWithRoles(req, res, next) {
        try {
            if (req.user.role !== 'admin') {
                throw new ForbiddenError('Admin access required');
            }
            const users = await this.adminService.getAllUsersWithRoles();
            res.status(200).json(users);
        } catch (error) {
            next(error);
        }
    }

    async getAllDelivery(req, res, next) {
        try {
            if (req.user.role !== 'admin') {
                throw new ForbiddenError('Admin access required');
            }
            const delivery = await this.adminService.getAllDelivery();
            res.status(200).json(delivery);
        } catch (error) {
            next(error);
        }
    }

    async getAllCustomerService(req, res, next) {
        try {
            if (req.user.role !== 'admin') {
                throw new ForbiddenError('Admin access required');
            }
            const customerService = await this.adminService.getAllCustomerService();
            res.status(200).json(customerService);
        } catch (error) {
            next(error);
        }
    }

    async deleteUser(req, res, next) {
        try {
            if (req.user.role !== 'admin') {
                throw new ForbiddenError('Admin access required');
            }

            const { id } = req.params;
            
            if (!id) {
                throw new BadRequestError('User ID is required');
            }

            // Validate MongoDB ObjectId
            if (!mongoose.Types.ObjectId.isValid(id)) {
                throw new BadRequestError('Invalid user ID format');
            }

            const result = await this.adminService.deleteUser(id);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    async updateUserStatus(req, res, next) {
        try {
            if (req.user.role !== 'admin') {
                throw new ForbiddenError('Admin access required');
            }
            const { id } = req.params;
            const { status } = req.body;
            const result = await this.adminService.updateUserStatus(id, status);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    async addProduct(req, res, next) {
        try {
            if (req.user.role !== 'admin') {
                throw new ForbiddenError('Admin access required');
            }

            const { name, price, description, category, vendor, stock } = req.body;
            
            const imagesUrl = [];
            if (req.files && req.files.images) {
                const images = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
                
                const maxSize = 2 * 1024 * 1024;
                for (const image of images) {
                    if (image.size > maxSize) {
                        throw new BadRequestError(`Image ${image.name} exceeds the 2MB size limit`);
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
            next(error);
        }
    }

    async deleteProduct(req, res, next) {
        try {
            if (req.user.role !== 'admin') {
                throw new ForbiddenError('Admin access required');
            }
            
            const { id } = req.params;
            if (!id) {
                throw new BadRequestError('Product ID is required');
            }

            // Validate if the id is a valid MongoDB ObjectId
            if (!mongoose.Types.ObjectId.isValid(id)) {
                throw new BadRequestError('Invalid product ID format');
            }
            
            const result = await this.adminService.deleteProduct(id);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    async updateUserRole(req, res, next) {
        try {
            if (req.user.role !== 'admin') {
                throw new ForbiddenError('Admin access required');
            }
    
            const { id } = req.params;
            const { role } = req.body;
    
            if (!id) {
                throw new BadRequestError('User ID is required');
            }
    
            if (!role) {
                throw new BadRequestError('New role is required');
            }
    
            // Validate role - add 'admin' to valid roles
            const validRoles = ['customer', 'delivery', 'customer service', 'admin'];
            if (!validRoles.includes(role)) {
                throw new BadRequestError('Invalid role');
            }
    
            // Validate MongoDB ObjectId
            if (!mongoose.Types.ObjectId.isValid(id)) {
                throw new BadRequestError('Invalid user ID format');
            }
    
            const result = await this.adminService.updateUserRole(id, role);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    async updateProduct(req, res, next) {
        try {
            if (req.user.role !== 'admin') {
                throw new ForbiddenError('Admin access required');
            }

            const { id } = req.params;
            if (!id || !mongoose.Types.ObjectId.isValid(id)) {
                throw new BadRequestError('Valid product ID is required');
            }

            const { name, price, description, category, vendor, stock, existingImages } = req.body;

            // Handle new image uploads if any
            const imagesUrl = [];
            if (req.files && req.files.images) {
                const images = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
                
                const maxSize = 2 * 1024 * 1024; // 2MB
                for (const image of images) {
                    if (image.size > maxSize) {
                        throw new BadRequestError(`Image ${image.name} exceeds the 2MB size limit`);
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
                existingImages: JSON.parse(existingImages || '[]'),
                imagesUrl
            };

            const updatedProduct = await this.adminService.updateProduct(id, productData);
            res.status(200).json(updatedProduct);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = AdminController;
