const mongoose = require('mongoose');
const { Schema } = mongoose;

const ServiceResponseSchema = new Schema({
    serviceId: { type: String, required: true },
    complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true },
    orderId: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const ServiceResponse = mongoose.model('ServiceResponse', ServiceResponseSchema);
module.exports = ServiceResponse;