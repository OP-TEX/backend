const mongoose = require('mongoose');
const { Schema } = mongoose;

const DeliveryManSchema = new Schema({
  firstName: { type: String, required: true, default: "" },
  lastName: { type: String, required: true, default: "" },
  phone: { type: String, required: true, default: "" },
  email: { type: String, required: true, default: "" , unique: true },
  hashedPassword: { type: String, required: true, default: "" },
  confirmed: { type: Boolean, default: false },
  confirmationToken: { type: String, default: "" },
  otp: { type: String, default: "" },
  orders: {
    type: [{
      orderId: { type: String, required: true, default: "" },
      status: { type: String, required: true, default: "" },
      totalPrice: { type: Number, required: true, default: 0 }
    }],
    default: []
  },
  cities: { type: [String], default: [] } // Replace zone with array of cities
});

const DeliveryMan = mongoose.model('DeliveryMan', DeliveryManSchema);
module.exports = DeliveryMan;