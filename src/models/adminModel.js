const mongoose = require('mongoose');
const { Schema } = mongoose;

const AdminSchema = new Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    hashedPassword: { type: String, required: true }
});

const Admin = mongoose.model('Admin', AdminSchema);
module.exports = Admin;
