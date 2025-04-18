const mongoose = require('mongoose');
const { Schema } = mongoose;
const OrderSchema = new Schema({
    orderId: { type: String, required: true },
    status: { type: String, required: true, enum: ['Pending','Confirmed', 'Out for Delivery', 'Delivered' , 'Cancelled', ] },
    products: [
        {
            productId: { type: String, required: true },
            productName: { type: String, required: true },
            productPrice: { type: Number, required: true },
            productImage: { type: String, required: true },
            quantity: { type: Number, required: true }
        }
    ],
    totalPrice: { type: Number, required: true },
    deliveryId: { type: String, required: true },
    userId: { type: String, required: true },
    address: {
        street: { type: String, required: true },
        Gover: { type: String, required: true },
        city: { type: String, required: true },
        building: { type: String, required: true },
        floor: { type: String, required: true },
        apartment: { type: String, required: true }
    },
    payment_method : {type : String , required : true, enum: ['cash_on_delivery', 'prepaid']}
}, {
    timestamps : true
});

const Order = mongoose.model('Order', OrderSchema);
module.exports = Order;