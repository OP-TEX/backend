const mongoose = require('mongoose');
const { Schema } = mongoose;

const ComplaintSchema = new Schema({
    orderId: { type: String, required: true },
    userId: { type: String, required: true },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    requiresLiveChat: { type: Boolean, default: false },
    status: {
        type: String, enum: ['pending', 'assigned', 'in-progress', 'resolved', 'closed'],
        default: "pending"
    },
    assignedTo: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Complaint = mongoose.model('Complaint', ComplaintSchema);
module.exports = Complaint;