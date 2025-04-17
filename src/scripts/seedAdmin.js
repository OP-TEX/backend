const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const connectDB = require('../lib/db');
const Admin = require('../models/adminModel');

const seedAdmin = async () => {
    try {
        await connectDB();

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ email: 'admin@gmail.com' });
        if (existingAdmin) {
            console.log('Admin already exists');
            return;
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash('Admin123!', 10);

        const admin = new Admin({
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin@gmail.com',
            hashedPassword: hashedPassword,
            phone: '01012345678'
        });

        const savedAdmin = await admin.save();
        console.log('Admin created successfully:', savedAdmin);
    } catch (error) {
        console.error('Error seeding admin:', error);
    } finally {
        await mongoose.connection.close();
    }
};

seedAdmin();