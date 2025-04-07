const mongoose = require('mongoose');
const { Schema } = mongoose;

const UserSchema = new Schema({
  firstName: { type: String, required: true, default: "" },
  lastName: { type: String, required: true, default: "" },
  email: { type: String, required: true, default: "" , unique: true },
  hashedPassword: { type: String, required: true, default: "" },
  phone: { type: String, required: true, default: "" },
  confirmed: { type: Boolean, default: false },
  confirmationToken: { type: String, default: "" },
  otp: { type: String, default: "" },
  address: {
    street: { type: String, default: "" },
    Gover: { type: String, default: "" },
    city: { type: String, default: "" },
    building: { type: String, default: "" },
    floor: { type: String, default: "" },
    apartment: { type: String, default: "" }
  },
  cart: {
    items: {
      type: [{
        productId: { type: String, required: true, default: "" },
        quantity: { type: Number, required: true, default: 0 }
      }],
      default: []
    }
  }
});

const User = mongoose.model('User', UserSchema);
module.exports = User;