const mongoose = require('mongoose');
require('dotenv').config();
const connectDB = require('../lib/db');
const User = require('../models/userModel');

const seedUser = async () => {
    await connectDB();

    try {
        const user = new User({
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@example.com',
            hashedPassword: 'samplehashedpassword',
            phone: '1234567890',
            address: {
                street: '123 Main St',
                Gover: 'Some Gover',
                city: 'Some City',
                building: 'Building 1',
                floor: '1',
                apartment: '101'
            },
            cart: {
                items: []
            }
        });

        const savedUser = await user.save();
        console.log('User created:', savedUser);
    } catch (error) {
        console.error('Error seeding user:', error);
    } finally {
        mongoose.connection.close();
    }
};

seedUser();