const express = require('express');
const router = express.Router();
const Product = require('../models/product');
const WarehouseOperation = require('../models/warehouseOperations');
const User = require('../models/user');
const Location = require('../models/location');
const Supplier = require('../models/supplier');



async function createWarehouseOperation(productId, operationType, quantity, location, userId) {
  try {
    const product = await Product.findById(productId);
    const user = await User.findById(userId);
    if (!product || !user) {
      throw new Error('Product or User not found');
    }

    const operation = new WarehouseOperation({
      productId: product._id,
      productName: product.name,
      operationType,
      quantity,
      location,
      userId: user._id,
      username: user.username
    });

    await operation.save();
    console.log(`Warehouse operation created: ${operationType} for product ${product.name}`);
  } catch (error) {
    console.error('Error creating warehouse operation:', error);
    throw error;
  }
}


// return all prods
router.get('/', async (req, res) => {
  try {
    let query = {};
    if (req.query.search) {
      query = {
        $or: [
          { name: { $regex: req.query.search, $options: 'i' } },
          { sku: { $regex: req.query.search, $options: 'i' } }
        ]
      };
    }
    const products = await Product.find(query)
      .populate('supplier')
      .populate('inventory.location');
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// return single prod
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('supplier')
      .populate('inventory.location');
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// create prod
router.post('/', async (req, res) => {
  try {
    const { name, description, price, category, sku, inventory, supplierId, userId } = req.body;
    
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(400).json({ message: 'Invalid supplier' });
    }

    const product = new Product({
      name,
      description,
      price,
      category,
      sku,
      supplier: supplierId,
      inventory: []
    });

    for (const inv of inventory) {
      const location = await Location.findById(inv.locationId);
      if (!location) {
        return res.status(400).json({ message: 'Invalid location' });
      }
      product.inventory.push({
        location: inv.locationId,
        quantity: inv.quantity
      });
    }

    const newProduct = await product.save();
    
    const totalQuantity = product.inventory.reduce((total, inv) => total + inv.quantity, 0);
    await createWarehouseOperation(newProduct._id, 'add', totalQuantity, 'Multiple', userId);
    
    res.status(201).json(newProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


// updatre prod
router.patch('/:id', async (req, res) => {
  try {
    const { name, description, price, category, sku, inventory, supplierId, userId } = req.body;
    
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    product.name = name;
    product.description = description;
    product.price = price;
    product.category = category;
    product.sku = sku;
    product.supplier = supplierId;


    product.inventory = [];
    for (const inv of inventory) {
      const location = await Location.findById(inv.locationId);
      if (!location) {
        return res.status(400).json({ message: 'Invalid location' });
      }
      product.inventory.push({
        location: inv.locationId,
        quantity: inv.quantity
      });
    }

    const updatedProduct = await product.save();
    await createWarehouseOperation(updatedProduct._id, 'update', 0, 'Multiple', userId);
    res.json(updatedProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});


router.delete('/:id', async (req, res) => {
  try {
      console.log('Attempting to delete product:', req.params.id);
      
      const product = await Product.findById(req.params.id);
      if (!product) {
          console.log('Product not found with ID:', req.params.id);
          return res.status(404).json({ 
              success: false, 
              message: 'Product not found' 
          });
      }

      // Calculate total quantity before deletion
      const totalQuantity = product.inventory.reduce((total, inv) => total + inv.quantity, 0);

      // Perform the deletion
      await Product.findByIdAndDelete(req.params.id);

      // Create a warehouse operation for tracking
      try {
          await createWarehouseOperation(
              product._id,
              'delete',
              totalQuantity,
              'System',
              req.body.userId
          );
      } catch (warehouseError) {
          console.warn('Warning: Could not create warehouse operation:', warehouseError);
          // Continue with deletion even if warehouse operation fails
      }

      console.log('Product deleted successfully:', product._id);
      return res.status(200).json({ 
          success: true,
          message: 'Product deleted successfully'
      });
  } catch (error) {
      console.error('Error in delete route:', error);
      return res.status(500).json({ 
          success: false,
          message: 'Error deleting product'
      });
  }
});




// dispatch prod
router.post('/:id/dispatch', async (req, res) => {
  try {
    const { quantity, locationId, userId } = req.body;
    console.log('Dispatch request received:', { quantity, locationId, userId });

    const product = await Product.findById(req.params.id).populate('inventory.location');
    if (!product) {
      console.log('Product not found');
      return res.status(404).json({ message: 'Product not found' });
    }

    const inventoryItem = product.inventory.find(inv => inv.location._id.toString() === locationId);
    if (!inventoryItem) {
      console.log('Inventory item not found for the specified location');
      return res.status(400).json({ message: 'Product not available in the specified location' });
    }

    if (inventoryItem.quantity < quantity) {
      console.log('Insufficient quantity');
      return res.status(400).json({ message: 'Insufficient quantity in the specified location' });
    }

    inventoryItem.quantity -= quantity;
    await product.save();

    await createWarehouseOperation(product._id, 'dispatch', quantity, inventoryItem.location.name, userId);
    console.log('Product dispatched successfully');
    res.json({ message: 'Product dispatched successfully', product });
  } catch (error) {
    console.error('Error dispatching product:', error);
    res.status(500).json({ message: 'An error occurred while dispatching the product', error: error.message });
  }
});


// Update the create product route to add history
router.post('/', async (req, res) => {
  const product = new Product(req.body);
  try {
    const newProduct = await product.save();
    
    // Create a new warehouse operation record
    const operation = new WarehouseOperation({
      product: newProduct._id,
      operationType: 'add',
      quantity: newProduct.quantity,
      location: 'Warehouse', 
      user: req.body.userId 
    });
    await operation.save();

    res.status(201).json(newProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// update dispatch route
router.post('/:id/dispatch', async (req, res) => {
  console.log('Dispatch request received:', req.body);
  try {
    const { quantity, location, userId } = req.body;
    const productId = req.params.id;

    console.log('Fetching product and user...');
    const [product, user] = await Promise.all([
      Product.findById(productId),
      User.findById(userId)
    ]);

    console.log('Product:', product);
    console.log('User:', user);

    if (!product) {
      console.log('Product not found');
      return res.status(404).json({ message: 'Product not found' });
    }

    if (!user) {
      console.log('User not found');
      return res.status(404).json({ message: 'User not found' });
    }

    const dispatchQuantity = parseInt(quantity, 10);

    if (product.quantity < dispatchQuantity) {
      console.log('Insufficient quantity');
      return res.status(400).json({ message: 'Insufficient quantity in stock' });
    }

    console.log('Updating product quantity...');
    product.quantity -= dispatchQuantity;
    await product.save();
    console.log('Product updated:', product);

    console.log('Creating warehouse operation...');
    const operation = new WarehouseOperation({
      productId: product._id,
      productName: product.name,
      operationType: 'dispatch',
      quantity: dispatchQuantity,
      location,
      userId: user._id,
      username: user.username
    });

    console.log('Saving warehouse operation...');
    const savedOperation = await operation.save();
    console.log('Warehouse operation saved:', savedOperation);

    res.json({ message: 'Product dispatched successfully', product });
  } catch (error) {
    console.error('Error dispatching product:', error);
    res.status(500).json({ message: 'An error occurred while dispatching the product' });
  }
});

router.get('/locations', async (req, res) => {
  try {
    const locations = await Location.find();
    res.json(locations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/suppliers', async (req, res) => {
  try {
    const suppliers = await Supplier.find();
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.get('/operations/history', async (req, res) => {
  try {
    const operations = await WarehouseOperation.find().sort({ timestamp: -1 });
    res.json({ message: 'Operations retrieved successfully', data: operations });
  } catch (error) {
    res.status(500).json({ message: 'An error occurred while fetching warehouse operations' });
  }
});


// Middleware function to get a product by ID
async function getProduct(req, res, next) {
  try {
    const product = await Product.findById(req.params.id);
    if (product == null) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.product = product;
    next();
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

module.exports = router;