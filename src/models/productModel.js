const mongoose = require('mongoose');
const { Schema } = mongoose;

const ProductSchema = new Schema({
  name: { 
    type: String, 
    required: true 
  },
  price: { 
    type: Number, 
    required: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  category: { 
    type: String, 
    required: true 
  },
  imagesUrl: { 
    type: [String], 
    default: [] 
  },
  vendor: { 
    type: String, 
    required: true 
  },
  stock: { 
    type: Number, 
    required: true,
    min: 0 
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

const Product = mongoose.model('Product', ProductSchema);
module.exports = Product;
