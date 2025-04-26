const { MethodNotAllowedError, BadRequestError } = require('../utils/baseException');

class UserController {
    constructor(userService) {
        this.userService = userService;
    }

    async test(req, res, next) {
        try {
            if (req.method !== 'GET') {
                throw new MethodNotAllowedError("Method not allowed", "METHOD_NOT_ALLOWED");
            }

            const result = await this.userService.test();
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    async addToCart(req, res, next) {
        try {
            if (req.method !== 'POST') {
                throw new MethodNotAllowedError("Method not allowed", "METHOD_NOT_ALLOWED");
            }

            const { productId, quantity } = req.body;

            if (!productId) {
                throw new BadRequestError("Product ID is required", "PRODUCT_ID_REQUIRED");
            }

            if (!quantity) {
                throw new BadRequestError("Quantity is required", "QUANTITY_REQUIRED");
            }

            const result = await this.userService.addToCart(req.user, {
                productId,
                quantity: parseInt(quantity, 10)
            });

            res.status(200).json({
                message: "Product added to cart successfully",
                cart: result
            });
        } catch (error) {
            next(error);
        }
    }

    async deleteFromCart(req, res, next) {
        try {
            if (req.method !== 'DELETE') {
                throw new MethodNotAllowedError("Method not allowed", "METHOD_NOT_ALLOWED");
            }

            const { productId, quantity } = req.body;

            if (!productId) {
                throw new BadRequestError("Product ID is required", "PRODUCT_ID_REQUIRED");
            }

            if (!quantity) {
                throw new BadRequestError("Quantity is required", "QUANTITY_REQUIRED");
            }

            const result = await this.userService.deleteFromCart(req.user, {
                productId,
                quantity: parseInt(quantity, 10)
            });

            res.status(200).json({
                message: "Product removed from cart successfully",
                cart: result
            });
        } catch (error) {
            next(error);
        }
    }

    async clearCart(req, res, next) {
        try {
            if (req.method !== 'DELETE') {
                throw new MethodNotAllowedError("Method not allowed", "METHOD_NOT_ALLOWED");
            }

            const result = await this.userService.clearCart(req.user);

            res.status(200).json({
                message: "Cart cleared successfully",
                cart: result.cart
            });
        } catch (error) {
            next(error);
        }
    }

    async viewCart(req, res, next) {
        try {
            if (req.method !== 'GET') {
                throw new MethodNotAllowedError("Method not allowed", "METHOD_NOT_ALLOWED");
            }

            const result = await this.userService.viewCart(req.user);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    async viewProfile(req, res, next) {
        try {
            if (req.method !== 'GET') {
                throw new MethodNotAllowedError("Method not allowed", "METHOD_NOT_ALLOWED");
            }

            const result = await this.userService.viewProfile(req.user._id);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    async updateProfile(req, res, next) {
        try {
            if (req.method !== 'PUT') {
                throw new MethodNotAllowedError("Method not allowed", "METHOD_NOT_ALLOWED");
            }

            const result = await this.userService.updateProfile(req.user._id, req.body);
            res.status(200).json({
                message: "Profile updated successfully",
                user: result
            });
        } catch (error) {
            next(error);
        }
    }

    async changePassword(req, res, next) {
        try {
            if (req.method !== 'POST') {
                throw new MethodNotAllowedError("Method not allowed", "METHOD_NOT_ALLOWED");
            }

            const { oldPassword, newPassword } = req.body;

            if (!oldPassword) {
                throw new BadRequestError("Current password is required", "OLD_PASSWORD_REQUIRED");
            }

            if (!newPassword) {
                throw new BadRequestError("New password is required", "NEW_PASSWORD_REQUIRED");
            }

            const result = await this.userService.changePassword(req.user._id, {
                oldPassword,
                newPassword
            });

            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    async addAddress(req, res, next) {
        try {
            if (req.method !== 'POST') {
                throw new MethodNotAllowedError("Method not allowed", "METHOD_NOT_ALLOWED");
            }

            const addressData = req.body;
            if (!addressData) {
                throw new BadRequestError("Address data is required", "ADDRESS_DATA_REQUIRED");
            }

            const result = await this.userService.addAddress(req.user._id, addressData);
            res.status(201).json(result);
        } catch (error) {
            next(error);
        }
    }

    async updateAddress(req, res, next) {
        try {
            if (req.method !== 'PUT') {
                throw new MethodNotAllowedError("Method not allowed", "METHOD_NOT_ALLOWED");
            }

            const { addressId } = req.params;
            if (!addressId) {
                throw new BadRequestError("Address ID is required", "ADDRESS_ID_REQUIRED");
            }

            const addressData = req.body;
            if (!addressData) {
                throw new BadRequestError("Address data is required", "ADDRESS_DATA_REQUIRED");
            }

            const result = await this.userService.updateAddress(req.user._id, addressId, addressData);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    async deleteAddress(req, res, next) {
        try {
            if (req.method !== 'DELETE') {
                throw new MethodNotAllowedError("Method not allowed", "METHOD_NOT_ALLOWED");
            }

            const { addressId } = req.params;
            if (!addressId) {
                throw new BadRequestError("Address ID is required", "ADDRESS_ID_REQUIRED");
            }

            const result = await this.userService.deleteAddress(req.user._id, addressId);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    async getAllAddresses(req, res, next) {
        try {
            if (req.method !== 'GET') {
                throw new MethodNotAllowedError("Method not allowed", "METHOD_NOT_ALLOWED");
            }

            const result = await this.userService.getAllAddresses(req.user._id);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = UserController;