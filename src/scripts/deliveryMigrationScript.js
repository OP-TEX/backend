const mongoose = require('mongoose');
const DeliveryMan = require('../models/deliveryManModel');
require('dotenv').config();

async function migrateZonesToCities() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find all delivery men with zone field
    const deliveryMen = await DeliveryMan.find({ zone: { $exists: true } });
    console.log(`Found ${deliveryMen.length} delivery personnel to migrate`);
    
    for (const man of deliveryMen) {
      if (man.zone && man.zone.trim() !== '') {
        // Convert zone to cities array
        man.cities = [man.zone];
        
        // Remove old zone field
        man.zone = undefined;
        
        await man.save();
        console.log(`Migrated ${man.firstName} ${man.lastName} from zone to cities`);
      }
    }
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

migrateZonesToCities();