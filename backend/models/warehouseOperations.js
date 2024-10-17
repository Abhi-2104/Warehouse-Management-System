const mongoose = require('mongoose');

const warehouseOperationSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  operationType: { type: String, enum: ['add', 'update', 'delete', 'dispatch'], required: true },
  quantity: { type: Number, required: true },
  location: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true }
});


module.exports = mongoose.model('WarehouseOperation', warehouseOperationSchema, 'warehouseOperations');
