const {
    NotFoundError,
    ValidationError,
    DatabaseError,
    BadRequestError
} = require('../utils/baseException');

class OrderService {

    constructor(models) {
        this.models = models;
    }

    //orderData = {
    //     products : [
    //          {productId: "123", quantity: 2},
    //          {productId: "1234", quantity: 3},
    //      ],
    //     address : {
    //         street: "123 Main St",
    //         city: "Cairo",
    //         Gover: "Cairo",
    //         building: "1",
    //         floor: "2",
    //         apartment: "3"
    //     },
    //     payment_method: "cash_on_delivery"
    // }


    async createOrder(orderData, userId) {
        try {
            //Get product details and calculate total price
            const productIds = orderData.products.map(p => p.productId);
            const productsFromDb = await this.models.product.find({ _id: { $in: productIds } });
            if (productsFromDb.length !== orderData.products.length) {
                throw new NotFoundError('One or more products not found', 'PRODUCTS_NOT_FOUND');
            }
            // Build products array for order
            let totalPrice = 0;
            const products = orderData.products.map(item => {
                const product = productsFromDb.find(p => p._id.toString() === item.productId);
                if (!product) throw new NotFoundError('Product not found', 'PRODUCT_NOT_FOUND');
                const productTotal = product.price * item.quantity;
                totalPrice += productTotal;
                return {
                    productId: product._id.toString(),
                    productName: product.name,
                    productPrice: product.price,
                    productImage: product.imagesUrl && product.imagesUrl.length > 0 ? product.imagesUrl[0] : '',
                    quantity: item.quantity
                };
            });
            // Find delivery men in the same zone (zone === city or zone === gover)  
            const city = orderData.address.city;
            const gover = orderData.address.Gover;
            const deliveryMen = await this.models.delivery.find({ $or: [{ zone: city }, { zone: gover }] });
            let assignedDeliveryMan = null;
            let status = 'Pending';
            let deliveryId = '';

            if (deliveryMen.length > 0) {
                let minOrders = Infinity;
                for (const man of deliveryMen) {
                    const activeOrders = man.orders.filter(o => o.status === 'Confirmed' || o.status === 'Out for Delivery').length;
                    if (activeOrders < minOrders) {
                        minOrders = activeOrders;
                        assignedDeliveryMan = man;
                    }
                }
                if (assignedDeliveryMan) {
                    status = 'Confirmed';
                    deliveryId = assignedDeliveryMan._id.toString();
                }
            }

            const generatedOrderId = Date.now().toString() + Math.floor(Math.random() * 100).toString();

            const order = await this.models.order.create({
                orderId: generatedOrderId,
                status,
                products,
                totalPrice,
                deliveryId,
                userId,
                address: orderData.address,
                payment_method: orderData.payment_method
            });
            if (assignedDeliveryMan) {
                assignedDeliveryMan.orders.push({
                    orderId: generatedOrderId,
                    status: 'Confirmed',
                    totalPrice
                });
                await assignedDeliveryMan.save();
            }
            return order;
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new DatabaseError(`Error creating order: ${error.message}`);
        }
    }

    async assignDeliveryToOrder(orderId, deliveryId, status = 'Confirmed') {
        try {
            const order = await this.models.order.findOneAndUpdate(
                { orderId },
                {
                    deliveryId: deliveryId,
                    status: status 
                },
                { new: true }
            );
            if (!order) {
                throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
            }
            return order;
        } catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new DatabaseError(`Error assigning delivery to order: ${error.message}`);
        }
    }

    async getOrdersByUserId(userId) {
        try {
            const orders = await this.models.order.find({ userId });
            return orders;
        } catch (error) {
            throw new DatabaseError(`Error fetching orders: ${error.message}`);
        }
    }

    async getOrdersByDeliveryId(deliveryId) {
        try {
            const orders = await this.models.order.find({ deliveryId });
            return orders;
        } catch (error) {
            throw new DatabaseError(`Error fetching orders: ${error.message}`);
        }
    }

    async getOrderById(orderId) {
        try {
            const order = await this.models.order.findById(orderId);
            if (!order) {
                throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
            }
            return order;
        }
        catch (error) {
            if (error instanceof NotFoundError) {
                throw error;
            }
            throw new DatabaseError(`Error fetching order: ${error.message}`);
        }
    }

    async getAllOrders() {
        try {
            const orders = await this.models.order.find().sort({ createdAt: -1 });
            return orders;
        }
        catch (error) {
            throw new DatabaseError(`Error fetching orders: ${error.message}`);
        }
    }

    async updateOrderStatus(orderId, status) {
        try {
            const validStatuses = ['Confirmed', 'Out for Delivery', 'Delivered', 'Cancelled'];
            if (!validStatuses.includes(status)) {
                throw new ValidationError(`Invalid status value: ${status}`, [{
                    field: 'status',
                    message: `Status must be one of: ${validStatuses.join(', ')}`
                }]);
            }

            const updatedOrder = await this.models.order.findOneAndUpdate(
                { orderId },
                { status },
                { new: true }
            );
            if (!updatedOrder) {
                throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
            }
            return updatedOrder;
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof ValidationError) {
                throw error;
            }
            throw new DatabaseError(`Error updating order status: ${error.message}`);
        }
    }

    async getOrderStats() {
        try {
            const totalOrders = await this.models.order.countDocuments();
            const totalSales = await this.models.order.aggregate([
                { $match: { status: { $in: ["Pending", "Confirmed", "Out for Delivery", "Delivered"] } } },
                { $group: { _id: null, total: { $sum: "$totalPrice" } } }
            ]);
            const completedSales = await this.models.order.aggregate([
                { $match: { status: "Delivered" } },
                { $group: { _id: null, total: { $sum: "$totalPrice" } } }
            ]);
            const ordersByStatus = await this.models.order.aggregate([
                { $group: { _id: "$status", count: { $sum: 1 } } }
            ]);
            const allStatuses = ['Pending', 'Confirmed', 'Out for Delivery', 'Delivered', 'Cancelled'];
            const statusCounts = {};
            allStatuses.forEach(status => {
                const found = ordersByStatus.find(s => s._id === status);
                statusCounts[status] = found ? found.count : 0;
            });
            return {
                totalOrders,
                totalSales: totalSales[0] ? totalSales[0].total : 0,
                pendingSales: totalSales[0] ? totalSales[0].total - (completedSales[0] ? completedSales[0].total : 0) : 0,
                completedSales: completedSales[0] ? completedSales[0].total : 0,
                statusCounts: statusCounts
            };
        } catch (error) {
            throw new DatabaseError(`Error fetching order stats: ${error.message}`);
        }
    }

    async getOrdersByStatus(status) {
        try {
            const orders = await this.models.order.find({ status }).sort({ createdAt: -1 });
            return orders;
        } catch (error) {
            throw new DatabaseError(`Error fetching orders by status: ${error.message}`);
        }
    }

}

module.exports = OrderService;