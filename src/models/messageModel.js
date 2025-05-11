const mongoose = require('mongoose');
const { Schema } = mongoose;

const MessageSchema = new Schema({
    complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true },
    sender: { type: String, enum: ['customer', 'service'], required: true },
    senderId: { type: String, required: true },
    encryptedContent: { type: String, required: true },
    iv: { type: String, required: true }, // Initialization vector for encryption
    timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', MessageSchema);
module.exports = Message;
