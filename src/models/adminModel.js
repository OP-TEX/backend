const mongoose = require('mongoose');
const { Schema } = mongoose;

const AdminSchema = new Schema({
    firstName: { type: String, required: true, default: "" },
    lastName: { type: String, required: true, default: "" },
    phone: { type: String, required: true, default: "" },
    email: { type: String, required: true, default: "", unique: true },
    hashedPassword: { type: String, required: true, default: "" },
    confirmed: { type: Boolean, default: false },
    confirmationToken: { type: String, default: "" },
    otp: { type: String, default: "" }
});

const Admin = mongoose.model('Admin', AdminSchema);
module.exports = Admin;