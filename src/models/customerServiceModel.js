const mongoose = require('mongoose');
const { Schema } = mongoose;

const CustomerServiceSchema = new Schema({
  firstName: { type: String, required: true, default: "" },
  lastName: { type: String, required: true, default: "" },
  phone: { type: String, required: true, default: "" },
  email: { type: String, required: true, default: "" , unique: true },
  hashedPassword: { type: String, required: true, default: "" },
  confirmed: { type: Boolean, default: false },
  confirmationToken: { type: String, default: "" },
  otp: { type: String, default: "" },
  complaints: {
    type: [{
      orderId: { type: String, required: true, default: "" },
      complaint: { type: String, required: true, default: "" }
    }],
    default: []
  }
});

const CustomerService = mongoose.model('CustomerService', CustomerServiceSchema);
module.exports = CustomerService;