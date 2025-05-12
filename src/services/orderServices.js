const {
    NotFoundError,
    ValidationError,
    DatabaseError,
    BadRequestError
} = require('../utils/baseException');
const citiesData = require('../utils/cities.json').pop().data;
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

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
    
            let assignedDeliveryMan = null;
            let status = 'Pending';
            let deliveryId = '';
    
            // Only try to assign delivery for cash on delivery orders
            if (orderData.payment_method === 'cash_on_delivery') {
                // Get customer's city and governorate
                const city = orderData.address.city;
                const gover = orderData.address.Gover;
    
                // First try to find delivery personnel who cover this city
                let deliveryMen = await this.models.delivery.find({ cities: city });
                
                // If no delivery people found for specific city, try to find any who serve this governorate
                if (deliveryMen.length === 0) {
                    // Load cities data to find all cities in this governorate
                    const governoratesData = require('../utils/governorates.json');
                    
                    // Find the governorate ID
                    const governorate = governoratesData.find(g => 
                        g.governorate_name_en === gover || g.governorate_name_ar === gover
                    );
                    
                    if (governorate) {
                        const governorateId = governorate.id;
                        
                        // Get all cities in this governorate
                        const citiesInGovernorate = citiesData
                            .filter(c => c.governorate_id === governorateId)
                            .map(c => c.city_name_en);
                        
                        // Find delivery people who serve any city in this governorate
                        for (const deliveryMan of await this.models.delivery.find()) {
                            // Check if any of the delivery person's cities are in this governorate
                            const hasMatchingCity = deliveryMan.cities.some(deliveryCity => 
                                citiesInGovernorate.includes(deliveryCity)
                            );
                            
                            if (hasMatchingCity) {
                                deliveryMen.push(deliveryMan);
                            }
                        }
                    }
                }
    
                // Assign to delivery person with fewest active orders
                if (deliveryMen.length > 0) {
                    let minOrders = Infinity;
                    for (const man of deliveryMen) {
                        const activeOrders = man.orders.filter(o => 
                            o.status === 'Confirmed' || o.status === 'Out for Delivery').length;
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
            }
            // For prepaid orders, just leave status as 'Pending' and don't assign delivery
    
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
    
            // Clear the user's cart after successful order creation
            await this.models.customer.findByIdAndUpdate(
                userId,
                { $set: { 'cart.items': [] } }
            );
    
            // Only update delivery man's orders for cash on delivery
            if (orderData.payment_method === 'cash_on_delivery' && assignedDeliveryMan) {
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
            // Change findById to findOne with orderId as the query parameter
            const order = await this.models.order.findOne({ orderId });
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
            
            console.log(orderId, status);
            
            // Convert string ID to ObjectId before querying

            
            const updatedOrder = await this.models.order.findOneAndUpdate(
                { _id: new ObjectId(orderId) },
                { status },
                { new: true }
            );
            
            console.log(updatedOrder);
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

    async updateDeliveryCities(deliveryId, cities) {
        try {

            // Allow empty array to clear cities
            if (Array.isArray(cities) && cities.length === 0) {
                // Update with empty array
                const updatedDelivery = await this.models.delivery.findByIdAndUpdate(
                    deliveryId,
                    { $set: { cities: [] } },
                    { new: true }
                );

                if (!updatedDelivery) {
                    throw new NotFoundError('Delivery account not found');
                }

                return { cities: updatedDelivery.cities };
            }

            console.log(citiesData);
            const validCityNames = citiesData.map(c => c.city_name_en);

            const invalidCities = cities.filter(city => !validCityNames.includes(city));
            if (invalidCities.length > 0) {
                throw new ValidationError(`Invalid cities: ${invalidCities.join(', ')}`,
                    invalidCities.map(city => ({
                        field: 'cities',
                        message: `${city} is not a valid city name`
                    }))
                );
            }

            const updatedDelivery = await this.models.delivery.findByIdAndUpdate(
                deliveryId,
                { $set: { cities: cities } },
                { new: true }
            );

            if (!updatedDelivery) {
                throw new NotFoundError('Delivery account not found');
            }

            return { cities: updatedDelivery.cities };
        } catch (error) {
            if (error instanceof NotFoundError || error instanceof ValidationError) {
                throw error;
            }
            throw new DatabaseError(`Error updating cities: ${error.message}`);
        }
    }

    async handlePaymentFailure(orderId) {
        const session = await mongoose.startSession();
        try {
          let updatedOrder;
          
          await session.withTransaction(async () => {
            // Find the order
            const order = await this.models.order.findOne({ orderId }).session(session);
            if (!order) {
              throw new NotFoundError('Order not found', 'ORDER_NOT_FOUND');
            }
            
            // Return items to stock
            for (const item of order.products) {
              await this.models.product.findByIdAndUpdate(
                item.productId,
                { $inc: { stock: item.quantity } }, // Increase stock by the ordered quantity
                { session }
              );
            }
            
            // Update order status to Cancelled
            order.status = 'Cancelled';
            updatedOrder = await order.save({ session });
          });
          
          return updatedOrder;
        } catch (error) {
          if (error instanceof NotFoundError) {
            throw error;
          }
          throw new DatabaseError(`Error handling payment failure: ${error.message}`);
        } finally {
          session.endSession();
        }
      }

}

module.exports = OrderService;
