const mongoose = require('mongoose');
const { Schema } = mongoose;

const CustomerServiceSchema = new Schema({
  firstName: { type: String, required: true, default: "" },
  lastName: { type: String, required: true, default: "" },
  phone: { type: String, required: true, default: "" },
  email: { type: String, required: true, default: "", unique: true },
  hashedPassword: { type: String, required: true, default: "" },
  confirmed: { type: Boolean, default: false },
  confirmationToken: { type: String, default: "" },
  otp: { type: String, default: "" },
  isOnline: { type: Boolean, default: false },
  socketId: { type: String, default: null },
  activeComplaints: {
    type: [{
      complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint' },
      timestamp: { type: Date, default: Date.now }
    }],
    default: []
  },
  lastActiveAt: { type: Date, default: null }

});

const CustomerService = mongoose.model('CustomerService', CustomerServiceSchema);
module.exports = CustomerService;