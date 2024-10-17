const express = require('express');
const connectDB = require('./config/database');
const productRoutes = require('./routes/products');
const authRoutes = require('./routes/auth');
const suppliersRouter = require('./routes/suppliers');
const locationsRouter = require('./routes/locations');
const cors = require('cors');
require('dotenv').config();

const app = express();

connectDB();

app.use(cors());
app.use(express.json());

app.use('/api/products', productRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/locations', locationsRouter);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});