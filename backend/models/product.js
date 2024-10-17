const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
  sku: { type: String, required: true, unique: true },
  inventory: [{
    location: { type: mongoose.Schema.Types.ObjectId, ref: 'Location', required: true },
    quantity: { type: Number, required: true, min: 0 }
  }],
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', productSchema);
