const mangoose = require('mongoose');
const { Schema } = mangoose;

const ComplaintSchema = new Schema({
    orderId: { type: String, required: true },
    userId: { type: String, required: true },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    status: {
        type: String, enum: ['pending', 'assigned', 'in-progress', 'resolved', 'closed'],
        default: "pending"
    },
    assignedTo: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Complaint = mangoose.model('Complaint', ComplaintSchema);
module.exports = Complaint;