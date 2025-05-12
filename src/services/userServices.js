const { NotFoundError, ValidationError, AuthorizationError } = require('../utils/baseException');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Read the governorates and cities data from JSON files
const governoratesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../utils/governorates.json'), 'utf8'));
const citiesData = JSON.parse(fs.readFileSync(path.join(__dirname, '../utils/cities.json'), 'utf8')).pop().data;

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

    async clearCart(user) {
        try {
            // Get the actual user document from database
            const userDoc = await this.models.customer.findById(user._id);
            if (!userDoc) {
                throw new NotFoundError("User not found", "USER_NOT_FOUND");
            }

            // Clear all items from the cart
            userDoc.cart.items = [];

            // Save the updated user document
            await userDoc.save();

            return {
                message: "Cart cleared successfully",
                cart: userDoc.cart
            };
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
            const protectedFields = ['cart', 'email', '_id', 'confirmed', 'confirmationToken', 'otp', 'password', 'hashedPassword', 'addresses'];
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

    async addAddress(userId, addressData) {
        try {
            // Validate address data including governorate and city validation
            this.validateAddressData(addressData);

            const user = await this.models.customer.findById(userId);
            if (!user) {
                throw new NotFoundError("User not found", "USER_NOT_FOUND");
            }

            // Add the new address to the addresses array
            user.addresses.push(addressData);
            await user.save();

            return {
                message: "Address added successfully",
                addressId: user.addresses[user.addresses.length - 1]._id
            };
        } catch (error) {
            throw error;
        }
    }

    async updateAddress(userId, addressId, addressData) {
        try {
            // Only validate fields that are being updated
            if (addressData.Gover || addressData.city) {
                // If updating one location field, ensure both are present for validation
                const user = await this.models.customer.findById(userId);
                if (!user) {
                    throw new NotFoundError("User not found", "USER_NOT_FOUND");
                }

                const addressIndex = user.addresses.findIndex(
                    addr => addr._id.toString() === addressId
                );

                if (addressIndex === -1) {
                    throw new NotFoundError("Address not found", "ADDRESS_NOT_FOUND");
                }

                const existingAddress = user.addresses[addressIndex].toObject();

                // Create a complete address object for validation
                const completeAddressData = {
                    ...existingAddress,
                    ...addressData
                };

                this.validateAddressData(completeAddressData);
            } else {
                // Validate other required fields if they're being updated
                const fieldsToValidate = Object.keys(addressData);
                const requiredFields = ['street', 'building', 'floor', 'apartment'];
                const missingRequiredFields = requiredFields.filter(
                    field => fieldsToValidate.includes(field) && !addressData[field]
                );

                if (missingRequiredFields.length > 0) {
                    throw new ValidationError("Missing required address fields",
                        missingRequiredFields.map(field => ({
                            field,
                            message: `${field} is required`
                        }))
                    );
                }
            }

            // Validate addressId format
            if (!mongoose.Types.ObjectId.isValid(addressId)) {
                throw new ValidationError("Invalid address ID", [
                    { field: "addressId", message: "Invalid address ID format" }
                ]);
            }

            const user = await this.models.customer.findById(userId);
            if (!user) {
                throw new NotFoundError("User not found", "USER_NOT_FOUND");
            }

            // Find the address index in the array
            const addressIndex = user.addresses.findIndex(
                addr => addr._id.toString() === addressId
            );

            if (addressIndex === -1) {
                throw new NotFoundError("Address not found", "ADDRESS_NOT_FOUND");
            }

            // Update the address at the found index
            user.addresses[addressIndex] = {
                ...user.addresses[addressIndex].toObject(),
                ...addressData,
                _id: user.addresses[addressIndex]._id // Preserve the original ID
            };

            await user.save();
            return {
                message: "Address updated successfully",
                address: user.addresses[addressIndex]
            };
        } catch (error) {
            throw error;
        }
    }

    async deleteAddress(userId, addressId) {
        try {
            // Validate addressId format
            if (!mongoose.Types.ObjectId.isValid(addressId)) {
                throw new ValidationError("Invalid address ID", [
                    { field: "addressId", message: "Invalid address ID format" }
                ]);
            }

            const user = await this.models.customer.findById(userId);
            if (!user) {
                throw new NotFoundError("User not found", "USER_NOT_FOUND");
            }

            // Find the address index
            const addressIndex = user.addresses.findIndex(
                addr => addr._id.toString() === addressId
            );

            if (addressIndex === -1) {
                throw new NotFoundError("Address not found", "ADDRESS_NOT_FOUND");
            }

            // Remove the address at the found index
            user.addresses.splice(addressIndex, 1);
            await user.save();

            return {
                message: "Address deleted successfully"
            };
        } catch (error) {
            throw error;
        }
    }

    async getAllAddresses(userId) {
        try {
            const user = await this.models.customer.findById(userId);
            if (!user) {
                throw new NotFoundError("User not found", "USER_NOT_FOUND");
            }

            return {
                addresses: user.addresses || []
            };
        } catch (error) {
            throw error;
        }
    }

    async getContactInfo(userId) {
        try {
            const user = await this.models.customer.findById(userId).select('firstName lastName email phone -_id');
            if (!user) {
                throw new NotFoundError("User not found", "USER_NOT_FOUND");
            }
            return user;
        } catch (error) {
            throw error;
        }
    }

    // Helper method to validate address data
    validateAddressData(addressData) {
        const requiredFields = ['street', 'city', 'Gover', 'building', 'floor', 'apartment'];
        const missingFields = requiredFields.filter(field => !addressData[field]);

        if (missingFields.length > 0) {
            throw new ValidationError("Missing required address fields (${missingFields.join(', ')})",
                missingFields.map(field => ({
                    field,
                    message: `${field} is required`
                }))
            );
        }

        // Validate governorate (Gover)
        const gover = addressData.Gover;
        const validGovernorate = governoratesData.find(g =>
            g.governorate_name_en.toLowerCase() === gover.toLowerCase() ||
            g.governorate_name_ar === gover
        );

        if (!validGovernorate) {
            throw new ValidationError("Invalid governorate", [
                { field: "Gover", message: "Must be one of the valid governorates in Egypt" }
            ]);
        }

        // Validate city based on selected governorate
        const city = addressData.city;
        const governorateId = validGovernorate.id;

        // Filter cities that belong to the selected governorate
        const validCities = citiesData.filter(c => c.governorate_id === governorateId);

        // Check if the provided city is valid for the selected governorate
        const isValidCity = validCities.some(c =>
            c.city_name_en.toLowerCase() === city.toLowerCase() ||
            c.city_name_ar === city
        );

        if (!isValidCity) {
            throw new ValidationError("Invalid city for the selected governorate", [
                {
                    field: "city",
                    message: `Must be a valid city in ${validGovernorate.governorate_name_en}`
                }
            ]);
        }
    }
}

module.exports = UserService;