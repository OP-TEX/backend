const { NotFoundError, ValidationError, AuthorizationError } = require('../utils/baseException');
const bcrypt = require('bcryptjs');

class UserService {
    constructor(models) {
        this.models = models;
    }

    async test() {
        return {
            message: "User service is working!",
            timestamp: new Date()
        };
    }

    async addToCart(user, { productId, quantity }) {
        try {
            // Validate product exists
            const product = await this.models.product.findById(productId);
            if (!product) {
                throw new NotFoundError("Product not found", "PRODUCT_NOT_FOUND");
            }

            // Validate quantity
            if (!Number.isInteger(quantity) || quantity <= 0) {
                throw new ValidationError("Invalid quantity", [
                    { field: "quantity", message: "Quantity must be a positive integer" }
                ]);
            }

            // Check stock availability
            if (product.stock < quantity) {
                throw new ValidationError("Insufficient stock", [
                    { field: "quantity", message: `Only ${product.stock} items available` }
                ]);
            }

            // Get the actual user document from database
            const userDoc = await this.models.customer.findById(user._id);
            if (!userDoc) {
                throw new NotFoundError("User not found", "USER_NOT_FOUND");
            }

            // Find existing cart item
            const existingItemIndex = userDoc.cart.items.findIndex(
                item => item.productId.toString() === productId
            );

            if (existingItemIndex > -1) {
                // Update existing item quantity
                const newQuantity = userDoc.cart.items[existingItemIndex].quantity + quantity;
                if (product.stock < newQuantity) {
                    throw new ValidationError("Insufficient stock", [
                        { field: "quantity", message: `Cannot add ${quantity} more items. Stock limit would be exceeded.` }
                    ]);
                }
                userDoc.cart.items[existingItemIndex].quantity = newQuantity;
            } else {
                // Add new item to cart
                userDoc.cart.items.push({ productId, quantity });
            }

            await userDoc.save();
            return userDoc.cart;
        } catch (error) {
            throw error;
        }
    }

    async deleteFromCart(user, { productId, quantity }) {
        try {
            // Get the actual user document from database
            const userDoc = await this.models.customer.findById(user._id);
            if (!userDoc) {
                throw new NotFoundError("User not found", "USER_NOT_FOUND");
            }

            // Find existing cart item
            const existingItemIndex = userDoc.cart.items.findIndex(
                item => item.productId.toString() === productId
            );

            if (existingItemIndex === -1) {
                throw new NotFoundError("Product not found in cart", "PRODUCT_NOT_IN_CART");
            }

            // Validate quantity
            if (!Number.isInteger(quantity) || quantity <= 0) {
                throw new ValidationError("Invalid quantity", [
                    { field: "quantity", message: "Quantity must be a positive integer" }
                ]);
            }

            const currentQuantity = userDoc.cart.items[existingItemIndex].quantity;
            
            // If quantity to remove is greater than or equal to current quantity, remove item
            if (quantity >= currentQuantity) {
                userDoc.cart.items.splice(existingItemIndex, 1);
            } else {
                // Otherwise, decrease the quantity
                userDoc.cart.items[existingItemIndex].quantity = currentQuantity - quantity;
            }

            await userDoc.save();
            return userDoc.cart;
        } catch (error) {
            throw error;
        }
    }

    async viewCart(user) {
        try {
            const userDoc = await this.models.customer.findById(user._id);
            if (!userDoc) {
                throw new NotFoundError("User not found", "USER_NOT_FOUND");
            }

            // Get detailed product information and flatten the structure
            const cartWithDetails = await Promise.all(userDoc.cart.items.map(async item => {
                const product = await this.models.product.findById(item.productId);
                if (!product) return null;

                return {
                    id: product._id,
                    name: product.name,
                    price: product.price,
                    imagesUrl: product.imagesUrl || [],
                    quantity: item.quantity
                };
            }));

            // Filter out any null items (products not found)
            const validCartItems = cartWithDetails.filter(item => item !== null);

            // Calculate cart totals
            const cartTotal = validCartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            return {
                items: validCartItems,
                totalAmount: cartTotal,
                itemCount: validCartItems.length
            };
        } catch (error) {
            throw error;
        }
    }

    async viewProfile(userId) {
        try {
            const user = await this.models.customer.findById(userId).select('-hashedPassword -confirmationToken -otp');
            if (!user) {
                throw new NotFoundError("User not found", "USER_NOT_FOUND");
            }
            return user;
        } catch (error) {
            throw error;
        }
    }

    async updateProfile(userId, updateData) {
        try {
            // Check if any protected field is being attempted to update
            const protectedFields = ['cart', 'email', '_id', 'confirmed', 'confirmationToken', 'otp', 'password', 'hashedPassword'];
            const attemptedProtectedFields = protectedFields.filter(field => field in updateData);
            
            if (attemptedProtectedFields.length > 0) {
                throw new ValidationError("Cannot update protected fields", [
                    { 
                        field: attemptedProtectedFields.join(', '), 
                        message: `The following fields cannot be updated: ${attemptedProtectedFields.join(', ')}` 
                    }
                ]);
            }

            // Validate phone if provided
            if (updateData.phone) {
                const phoneRegex = /^(010|011|012|015)\d{8}$/;
                if (!phoneRegex.test(updateData.phone)) {
                    throw new ValidationError("Phone validation failed", [
                        { field: "phone", message: "Phone number must begin with 010, 011, 012, or 015 and be followed by exactly 8 digits." }
                    ]);
                }
            }

            const updatedUser = await this.models.customer.findByIdAndUpdate(
                userId,
                { $set: updateData },
                { new: true }
            ).select('-hashedPassword -confirmationToken -otp');

            if (!updatedUser) {
                throw new NotFoundError("User not found", "USER_NOT_FOUND");
            }

            return updatedUser;
        } catch (error) {
            throw error;
        }
    }

    async changePassword(userId, { oldPassword, newPassword }) {
        try {
            const user = await this.models.customer.findById(userId);
            if (!user) {
                throw new NotFoundError("User not found", "USER_NOT_FOUND");
            }

            // Verify old password
            const isMatch = await bcrypt.compare(oldPassword, user.hashedPassword);
            if (!isMatch) {
                throw new AuthorizationError("Current password is incorrect", "INVALID_PASSWORD");
            }

            // Validate new password
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;
            if (!passwordRegex.test(newPassword)) {
                throw new ValidationError("Password must be at least 6 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.", [
                    { field: "password", message: "Password must be at least 6 characters long and include an uppercase letter, a lowercase letter, a number, and a special character." }
                ]);
            }

            // Hash and save new password
            user.hashedPassword = await bcrypt.hash(newPassword, 10);
            await user.save();

            return { message: "Password changed successfully" };
        } catch (error) {
            throw error;
        }
    }
}

module.exports = UserService;