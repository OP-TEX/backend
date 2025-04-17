class AdminService {
    constructor(models) {
        this.models = models;
    }

    async getAllUsers() {
        const users = await this.models.customer.find({}).select('-hashedPassword -confirmationToken -otp');
        return users;
    }

    async getAllDelivery() {
        const delivery = await this.models.delivery.find({}).select('-hashedPassword -confirmationToken -otp');
        return delivery;
    }

    async getAllCustomerService() {
        const customerService = await this.models['customer service'].find({}).select('-hashedPassword -confirmationToken -otp');
        return customerService;
    }

    async deleteUser(userId) {
        for (const key in this.models) {
            try {
                const result = await this.models[key].findByIdAndDelete(userId);
                if (result) {
                    return;
                }
            } catch (error) {
                continue;
            }
        }
        throw new Error('User not found');
    }

    async updateUserStatus(userId, status) {
        for (const key in this.models) {
            try {
                const user = await this.models[key].findById(userId);
                if (user) {
                    user.confirmed = status;
                    await user.save();
                    return { message: 'Status updated successfully' };
                }
            } catch (error) {
                continue;
            }
        }
        throw new Error('User not found');
    }

    async addProduct(productData) {
        try {
            // Validate required fields
            const requiredFields = ['name', 'price', 'description', 'category', 'vendor', 'stock'];
            for (const field of requiredFields) {
                if (!productData[field]) {
                    throw new Error(`${field} is required`);
                }
            }

            // Validate price and stock are positive numbers
            if (productData.price <= 0) throw new Error('Price must be greater than 0');
            if (productData.stock < 0) throw new Error('Stock cannot be negative');

            const newProduct = await this.models.product.create(productData);
            return newProduct;
        } catch (error) {
            throw new Error('Failed to add product: ' + error.message);
        }
    }

    async deleteProduct(productId) {
        const product = await this.models.product.findByIdAndDelete(productId);
        if (!product) {
            throw new Error('Product not found');
        }
        return { message: 'Product deleted successfully' };
    }
}

module.exports = AdminService;
