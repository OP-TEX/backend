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
                throw new Error('One or more products not found');
            }
            // Build products array for order
            let totalPrice = 0;
            const products = orderData.products.map(item => {
                const product = productsFromDb.find(p => p._id.toString() === item.productId);
                if (!product) throw new Error('Product not found');
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
            // lw mfesh deliveryMan hna fe el zone sebo pending we el admin yb2a y3ml assign
            const city = orderData.address.city;
            const gover = orderData.address.Gover;
            const deliveryMen = await this.models.deliveryMan.find({ $or: [{ zone: city }, { zone: gover }] });
            let assignedDeliveryMan = null;
            let status = 'Pending';
            let deliveryId = '';

            if (deliveryMen.length > 0) {

                // each delivery man, count orders with status Confirmed or Out for Delivery 
                // (el orders ely m3ah we lsa mslmhash)
                // and assign the order to the one with the least number of active orders
                // (a2l wa7ed m3ah sho8l)

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
            
            // unique id using date and random number to handle that if more than one user made an order in the same milli second
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
            // 5. Update delivery man if assigned
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
            throw new Error('Error creating order: ' + error.message);
        }
    }

    async assignDeliveryToOrder(orderId, deliveryId) {
        try {
            const order = await this.models.order.findOneAndUpdate(
                { orderId },
                { deliveryId },
                { new: true }
            );
            if (!order) {
                throw new Error('Order not found');
            }
            return order;
        } catch (error) {
            throw new Error('Error assigning delivery to order: ' + error.message);
        }
    }

    async getOrdersByUserId(userId) {
        try {
            const orders = await this.models.order.find({ userId });
            return orders;
        } catch (error) {
            throw new Error('Error fetching orders: ' + error.message);
        }
    }

    async getOrdersByDeliveryId(deliveryId) {
        try {
            const orders = await this.models.order.find({ deliveryId });
            return orders;
        } catch (error) {
            throw new Error('Error fetching orders: ' + error.message);
        }
    }

    async getOrderById(orderId) {
        try {
            const order = await this.models.order.findById(orderId)
            return order;
        }
        catch (error) {
            throw new Error('Error fetching order: ' + error.message);
        }
    }

    async getAllOrders() //sorted with the newest for admin panel
    {
        try {
            const orders = await this.models.order.find().sort({ createdAt: -1 });
            return orders;
        }
        catch (error) {
            throw new Error('Error fetching orders: ' + error.message);
        }
    }

    async updateOrderStatus(orderId, status) {
        try {
            // Only allow valid statuses
            const validStatuses = ['Confirmed', 'Out for Delivery', 'Delivered', 'Cancelled'];
            if (!validStatuses.includes(status)) {
                throw new Error('Invalid status value');
            }

            const updatedOrder = await this.models.order.findOneAndUpdate(
                { orderId },
                { status },
                { new: true }
            );
            if (!updatedOrder) {
                throw new Error('Order not found');
            }
            return updatedOrder;
        } catch (error) {
            throw new Error('Error updating order status: ' + error.message);
        }
    }

    // get statistics for admin dashboard: total orders, total sales, completed sales, pending sales (for admin)
    // total sales = all orders with status Pending, Confirmed, Out for Delivery, Delivered
    // completed sales = all orders with status Delivered
    // pending sales = all orders with status Pending, Confirmed, Out for Delivery
    // simply pending sales = total sales - completed sales
    // orders count by status = all orders with status Pending, Confirmed, Out for Delivery, Delivered, Cancelled
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
            throw new Error('Error fetching order stats: ' + error.message);
        }
    }

    // Retrieve orders filtered by their status (for admin)
    async getOrdersByStatus(status) {
        try {
            const orders = await this.models.order.find({ status }).sort({ createdAt: -1 });
            return orders;
        } catch (error) {
            throw new Error('Error fetching orders by status: ' + error.message);
        }
    }

}

module.exports = OrderService;