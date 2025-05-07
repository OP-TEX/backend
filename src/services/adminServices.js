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
        const session = await this.models.customer.startSession();
        try {
            await session.withTransaction(async () => {
                let user = null;
                let userRole = null;

                // Find user and their role
                for (const [role, model] of Object.entries(this.models)) {
                    if (role === 'product' || role === 'order') continue;
                    
                    user = await model.findById(userId).session(session);
                    if (user) {
                        userRole = role;
                        break;
                    }
                }

                if (!user) {
                    throw new Error('User not found');
                }

                // Handle role-specific cascading deletions
                switch (userRole) {
                    case 'customer':
                        // Get the user's cart items
                        if (user.cart && user.cart.items.length > 0) {
                            // Optional: Update product statistics or inventory
                            console.log(`Removing cart items for user ${userId}`);
                        }
                        // Get user's orders
                        const customerOrders = await this.models.order.find({ userId: userId }).session(session);
                        if (customerOrders.length > 0) {
                            // Mark orders as cancelled or handle as needed
                            await this.models.order.updateMany(
                                { userId: userId },
                                { $set: { status: 'Cancelled' } },
                                { session }
                            );
                        }
                        break;

                    case 'delivery':
                        // Reassign or handle delivery man's orders
                        if (user.orders && user.orders.length > 0) {
                            const orderIds = user.orders.map(o => o.orderId);
                            await this.models.order.updateMany(
                                { orderId: { $in: orderIds }, status: { $nin: ['Delivered', 'Cancelled'] } },
                                { $set: { deliveryId: '', status: 'Pending' } },
                                { session }
                            );
                        }
                        break;

                    case 'customer service':
                        // Handle any open complaints
                        if (user.complaints && user.complaints.length > 0) {
                            // Optional: Reassign complaints to other CS representatives
                            console.log(`Reassigning complaints from CS rep ${userId}`);
                        }
                        break;
                }

                // Delete the user
                await this.models[userRole].findByIdAndDelete(userId).session(session);
            });

            return { message: 'User deleted successfully with all associated data' };
        } catch (error) {
            throw error;
        } finally {
            session.endSession();
        }
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
        const session = await this.models.product.startSession();
        try {
            await session.withTransaction(async () => {
                // First check if product exists
                const product = await this.models.product.findById(productId).session(session);
                if (!product) {
                    throw new Error('Product not found');
                }

                // Remove product from all users' carts
                await this.models.customer.updateMany(
                    { 'cart.items.productId': productId },
                    { $pull: { 'cart.items': { productId: productId } } },
                    { session }
                );

                // Delete the product
                await this.models.product.findByIdAndDelete(productId).session(session);
            });

            return { message: 'Product deleted successfully and removed from all carts' };
        } catch (error) {
            throw new Error(error.message);
        } finally {
            session.endSession();
        }
    }

    async updateProduct(productId, productData) {
        const session = await this.models.product.startSession();
        try {
            await session.withTransaction(async () => {
                const product = await this.models.product.findById(productId).session(session);
                if (!product) {
                    throw new Error('Product not found');
                }

                // Update basic product details
                product.name = productData.name;
                product.price = productData.price;
                product.description = productData.description;
                product.category = productData.category;
                product.vendor = productData.vendor;
                product.stock = productData.stock;

                // Handle images
                const existingImages = productData.existingImages || [];
                const newImagesUrls = productData.imagesUrl || [];

                // Combine existing and new images
                product.imagesUrl = [...existingImages, ...newImagesUrls];

                await product.save({ session });
            });

            const updatedProduct = await this.models.product.findById(productId);
            return updatedProduct;
        } catch (error) {
            throw new Error(`Failed to update product: ${error.message}`);
        } finally {
            session.endSession();
        }
    }

    async getAllUsersWithRoles() {
        const users = await this.models.customer.find({}).select('-hashedPassword -confirmationToken -otp').lean();
        const delivery = await this.models.delivery.find({}).select('-hashedPassword -confirmationToken -otp').lean();
        const customerService = await this.models['customer service'].find({}).select('-hashedPassword -confirmationToken -otp').lean();
        const admins = await this.models.admin.find({}).select('-hashedPassword -confirmationToken -otp').lean();

        const usersWithRole = [
            ...users.map(u => ({ ...u, role: 'customer' })),
            ...delivery.map(u => ({ ...u, role: 'delivery' })),
            ...customerService.map(u => ({ ...u, role: 'customer service' })),
            ...admins.map(u => ({ ...u, role: 'admin' }))
        ];
        return usersWithRole;
    }

    async updateUserRole(userId, newRole) {
        let currentRole = null;
        let userData = null;
        
        for (const [role, model] of Object.entries(this.models)) {
            if (role === 'product' || role === 'order') continue;
            
            const user = await model.findById(userId);
            if (user) {
                currentRole = role;
                userData = user;
                break;
            }
        }

        if (!userData) {
            throw new Error('User not found');
        }

        if (currentRole === newRole) {
            throw new Error('User already has this role');
        }

        const userDataForNewRole = {
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            phone: userData.phone,
            hashedPassword: userData.hashedPassword,
            confirmed: userData.confirmed
        };

        if (newRole === 'delivery') {
            userDataForNewRole.orders = [];
            userDataForNewRole.zone = '';
        } else if (newRole === 'customer') {
            userDataForNewRole.cart = { items: [] };
            userDataForNewRole.address = {};
        } else if (newRole === 'customer service') {
            userDataForNewRole.complaints = [];
        }

        const session = await this.models[currentRole].startSession();
        try {
            await session.withTransaction(async () => {
                const newUser = await this.models[newRole].create([userDataForNewRole], { session });

                if (currentRole === 'customer' && userData.cart?.items?.length > 0) {
                    console.log(`User ${userId} had items in cart during role change`);
                }

                if (currentRole === 'delivery' && userData.orders?.length > 0) {
                    const orderIds = userData.orders.map(o => o.orderId);
                    await this.models.order.updateMany(
                        { orderId: { $in: orderIds } },
                        { $set: { deliveryId: '' } },
                        { session }
                    );
                }

                await this.models[currentRole].findByIdAndDelete(userId, { session });
            });

            return { message: 'User role updated successfully' };
        } catch (error) {
            throw new Error(`Failed to update user role: ${error.message}`);
        } finally {
            session.endSession();
        }
    }
}

module.exports = AdminService;
