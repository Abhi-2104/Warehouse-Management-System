const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/warehouseDB', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('connected successfully to sharded mongodb servers');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
