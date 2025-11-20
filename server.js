const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Customer Schema
const customerSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  companyName: { type: String, required: true },
  contactPerson: { type: String, required: true },
  lastActive: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

// Case-insensitive index for username
customerSchema.index({ username: 1 }, { 
  unique: true,
  collation: { locale: 'en', strength: 2 }
});

// Admin Schema
const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Case-insensitive index for admin username
adminSchema.index({ username: 1 }, { 
  unique: true,
  collation: { locale: 'en', strength: 2 }
});

// Product Schema - Products are now managed by admin and assigned to customers
const productSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  sku: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  unit: { type: String, required: true },
  lastUpdated: { type: Date, default: Date.now }
});

// Compound index to ensure SKU is unique per customer (same SKU can exist for different customers)
productSchema.index({ customerId: 1, sku: 1 }, { unique: true });

// Master Product Schema - Central product catalog
const manageProductSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  unit: { type: String, required: true },
  lastUpdated: { type: Date, default: Date.now }
});

// Order Schema - Customers can only input order amounts
const orderSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  orderAmount: { type: Number, required: true },
  lastUpdated: { type: Date, default: Date.now }
});

const Customer = mongoose.model('Customer', customerSchema);
const Admin = mongoose.model('Admin', adminSchema);
const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);
const MasterProduct = mongoose.model('MasterProduct', manageProductSchema);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET;

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token.' });
    }
    req.user = user;
    next();
  });
};

// Initialize default admin account if none exists
async function initializeAdmin() {
  try {
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
      const defaultUsername = process.env.ADMIN_USERNAME || 'admin';
      const defaultPassword = process.env.ADMIN_PASSWORD || 'admin123';
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      
      const admin = new Admin({
        username: defaultUsername.toLowerCase(), // Store in lowercase
        password: hashedPassword
      });
      
      await admin.save();
      console.log(`✓ Default admin account created - Username: ${defaultUsername.toLowerCase()}`);
    } else {
      console.log(`✓ Admin account already exists (${adminCount} account(s) found)`);
    }
  } catch (error) {
    if (error.code === 11000) {
      console.log('✓ Admin account already exists in database');
    } else {
      console.error('Error initializing admin:', error);
    }
  }
}

// Call initialization after MongoDB connection
mongoose.connection.once('open', () => {
  console.log('Connected to MongoDB');
  initializeAdmin();
});

// Routes

// ===== MASTER PRODUCTS ROUTES =====

// Get all manage products
app.get('/api/admin/manage-products', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const products = await MasterProduct.find().sort({ sku: 1 });
    res.json(products);
  } catch (error) {
    console.error('Error fetching manage products:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add manage product
app.post('/api/admin/manage-products', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { sku, name, price, unit } = req.body;

    // Check if SKU already exists
    const existing = await MasterProduct.findOne({ sku });
    if (existing) {
      return res.status(400).json({ error: `Product with SKU "${sku}" already exists in manage list` });
    }

    const product = new MasterProduct({
      sku,
      name,
      price,
      unit,
      lastUpdated: new Date()
    });

    await product.save();

    res.status(201).json({ message: 'Product added successfully', product });
  } catch (error) {
    console.error('Error adding manage product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update manage product
app.put('/api/admin/manage-products/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { sku, name, price, unit } = req.body;

    // Check if new SKU conflicts with another product
    if (sku) {
      const existing = await MasterProduct.findOne({
        _id: { $ne: req.params.id },
        sku: sku
      });
      if (existing) {
        return res.status(400).json({ error: `SKU "${sku}" already exists` });
      }
    }

    const product = await MasterProduct.findByIdAndUpdate(
      req.params.id,
      { sku, name, price, unit, lastUpdated: new Date() },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product updated successfully', product });
  } catch (error) {
    console.error('Error updating manage product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete manage product
app.delete('/api/admin/manage-products/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const manageProduct = await MasterProduct.findByIdAndDelete(req.params.id);

    if (!manageProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Also remove this product from all customers
    const deletedProducts = await Product.deleteMany({ sku: manageProduct.sku });
    const deletedOrders = await Order.deleteMany({ 
      productId: { $in: (await Product.find({ sku: manageProduct.sku })).map(p => p._id) }
    });
    res.json({ message: 'Product deleted successfully from manage list and all customers' });
  } catch (error) {
    console.error('Error deleting manage product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Assign products to customers (multi-select)
app.post('/api/admin/assign-products', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { customerIds, productIds } = req.body;

    if (!customerIds || !productIds || customerIds.length === 0 || productIds.length === 0) {
      return res.status(400).json({ error: 'Please select at least one customer and one product' });
    }

    const results = {
      assigned: 0,
      skipped: 0,
      errors: []
    };

    for (const customerId of customerIds) {
      for (const productId of productIds) {
        try {
          const manageProduct = await MasterProduct.findById(productId);
          if (!manageProduct) continue;

          // Check if already assigned
          const existing = await Product.findOne({
            customerId: customerId,
            sku: manageProduct.sku
          });

          if (existing) {
            results.skipped++;
            continue;
          }

          // Create assignment
          const product = new Product({
            customerId: customerId,
            sku: manageProduct.sku,
            name: manageProduct.name,
            price: manageProduct.price,
            unit: manageProduct.unit,
            lastUpdated: new Date()
          });

          await product.save();
          results.assigned++;
        } catch (err) {
          results.errors.push(`Error assigning ${productId}: ${err.message}`);
        }
      }
    }

    res.json({
      message: `Successfully assigned ${results.assigned} products. ${results.skipped} already existed.`,
      results
    });
  } catch (error) {
    console.error('Error assigning products:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove product from customer
app.delete('/api/admin/customer/:customerId/product/:productId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const product = await Product.findOneAndDelete({
      _id: req.params.productId,
      customerId: req.params.customerId
    });

    if (!product) {
      return res.status(404).json({ error: 'Product assignment not found' });
    }

    // Delete associated orders
    await Order.deleteMany({ productId: req.params.productId });

    res.json({ message: 'Product removed from customer successfully' });
  } catch (error) {
    console.error('Error removing product from customer:', error);
    res.status(500).json({ error: error.message });
  }
});

// ===== END MASTER PRODUCTS ROUTES =====

// Routes

// Admin creates customer account
app.post('/api/admin/create-customer', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Only admins can create customers.' });
    }

    const { username, password, companyName, contactPerson } = req.body;

    // Check if username already exists (case-insensitive)
    const existingCustomer = await Customer.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    });
    
    if (existingCustomer) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new customer (store username in lowercase for consistency)
    const customer = new Customer({
      username: username.toLowerCase(),
      password: hashedPassword,
      companyName,
      contactPerson
    });

    await customer.save();

    res.status(201).json({ 
      message: 'Customer created successfully',
      customer: {
        username: username.toLowerCase(),
        companyName,
        contactPerson
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all customers
app.get('/api/admin/customers', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const customers = await Customer.find().select('-password');
    
    // Add product count for each customer
    const customersWithCount = await Promise.all(customers.map(async (customer) => {
      const productCount = await Product.countDocuments({ customerId: customer._id });
      return {
        ...customer.toObject(),
        productCount
      };
    }));

    res.json({
      customers: customersWithCount,
      count: customersWithCount.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get statistics for admin dashboard
app.get('/api/admin/statistics', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const totalCustomers = await Customer.countDocuments();
    const totalProducts = await Product.countDocuments();
    
    // Get customers active today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeToday = await Customer.countDocuments({
      lastActive: { $gte: today }
    });

    // Get new customers this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const newThisWeek = await Customer.countDocuments({
      createdAt: { $gte: weekAgo }
    });

    res.json({
      totalCustomers,
      totalProducts,
      activeToday,
      newThisWeek
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get products for a specific customer (Admin only)
app.get('/api/admin/customer/:customerId/products', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const products = await Product.find({ customerId: req.params.customerId });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete customer (Admin only)
app.delete('/api/admin/customers/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete all products from this customer
    await Product.deleteMany({ customerId: req.params.id });
    
    // Delete all orders from this customer
    await Order.deleteMany({ customerId: req.params.id });
    
    // Delete the customer
    const customer = await Customer.findByIdAndDelete(req.params.id);
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ message: 'Customer and all their products deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Customer Login (case-insensitive)
app.post('/api/customer/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find customer by username (case-insensitive)
    const customer = await Customer.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    });
    
    if (!customer) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, customer.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Update last active
    customer.lastActive = new Date();
    await customer.save();

    // Create JWT token
    const token = jwt.sign(
      { id: customer._id, username: customer.username, role: 'customer' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      customer: {
        id: customer._id,
        username: customer.username,
        companyName: customer.companyName,
        contactPerson: customer.contactPerson
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Login
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find admin in database (case-insensitive)
    const admin = await Admin.findOne({ 
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    });
    
    if (!admin) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      { id: admin._id, username: admin.username, role: 'admin' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      admin: { 
        username: admin.username
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Change Admin Password (Admin only)
app.put('/api/admin/change-password', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { currentPassword, newPassword } = req.body;

    // Find admin
    const admin = await Admin.findById(req.user.id);
    
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, admin.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    admin.password = hashedPassword;
    await admin.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Add Product and assign to customer
app.post('/api/admin/products', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { customerId, sku, name, price, unit } = req.body;

    // Verify customer exists
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Check if this customer already has a product with this SKU
    const existingProduct = await Product.findOne({ 
      customerId: customerId,
      sku: sku 
    });

    if (existingProduct) {
      return res.status(400).json({ 
        error: `Product with SKU "${sku}" already exists for customer ${customer.companyName}. Please use a different SKU or update the existing product.` 
      });
    }

    const product = new Product({
      customerId,
      sku,
      name,
      price,
      unit,
      lastUpdated: new Date()
    });

    await product.save();

    res.status(201).json({ message: 'Product added successfully', product });
  } catch (error) {
    console.error('Error adding product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get Customer's Products with order amounts
app.get('/api/products/my-products', authenticateToken, async (req, res) => {
  try {

    if (req.user.role !== 'customer') {

      return res.status(403).json({ error: 'Access denied' });
    }

    const products = await Product.find({ customerId: req.user.id });

    // Get order amounts for each product
    const productsWithOrders = await Promise.all(products.map(async (product) => {
      const order = await Order.findOne({
        customerId: req.user.id,
        productId: product._id
      });

      return {
        ...product.toObject(),
        orderAmount: order ? order.orderAmount : 0,
        lastSubmittedAmount: order ? order.lastSubmittedAmount : 0,
        lastUpdated: order ? order.lastUpdated : null
      };
    }));

    res.json(productsWithOrders);
  } catch (error) {
    console.error('Error in /api/products/my-products:', error);
    res.status(500).json({ error: error.message });
  }
});

// Customer updates order amount
app.put('/api/orders/:productId', authenticateToken, async (req, res) => {
  try {

    if (req.user.role !== 'customer') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { orderAmount } = req.body;

    // Verify product belongs to this customer
    const product = await Product.findOne({
      _id: req.params.productId,
      customerId: req.user.id
    });

    if (!product) {

      return res.status(404).json({ error: 'Product not found' });
    }

    // Update or create order
    const order = await Order.findOneAndUpdate(
      { customerId: req.user.id, productId: req.params.productId },
      { orderAmount, lastUpdated: new Date() },
      { new: true, upsert: true }
    );

    res.json({ message: 'Order amount updated successfully', order });
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Submit all orders at once (Customer only)
app.post('/api/orders/submit-all', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { orders } = req.body;

    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({ error: 'Invalid orders data' });
    }

    const timestamp = new Date();
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const orderData of orders) {
      try {
        const { productId, orderAmount } = orderData;

        // Verify product belongs to this customer
        const product = await Product.findOne({
          _id: productId,
          customerId: req.user.id
        });

        if (!product) {
          results.failed++;
          results.errors.push(`Product ${productId} not found`);
          continue;
        }

        // Update or create order with timestamp
        // Save orderAmount to lastSubmittedAmount, then reset orderAmount to 0
        await Order.findOneAndUpdate(
          { customerId: req.user.id, productId: productId },
          {
            lastSubmittedAmount: orderAmount,  // Save the submitted amount
            orderAmount: 0,                     // Reset draft to 0
            lastUpdated: timestamp
          },
          { new: true, upsert: true }
        );

        results.success++;
      } catch (err) {
        results.failed++;
        results.errors.push(`Error processing product ${orderData.productId}: ${err.message}`);
      }
    }

    res.json({
      message: `Successfully submitted ${results.success} orders`,
      timestamp: timestamp,
      results
    });
  } catch (error) {
    console.error('Error submitting all orders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update Product (Admin only)
app.put('/api/admin/products/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { sku, name, price, unit, customerId } = req.body;

    // Check if changing SKU would create a duplicate for this customer
    if (sku && customerId) {
      const existingProduct = await Product.findOne({
        _id: { $ne: req.params.id }, // Exclude current product
        customerId: customerId,
        sku: sku
      });

      if (existingProduct) {
        const customer = await Customer.findById(customerId);
        return res.status(400).json({ 
          error: `Product with SKU "${sku}" already exists for customer ${customer.companyName}. Please use a different SKU.` 
        });
      }
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { sku, name, price, unit, customerId, lastUpdated: new Date() },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product updated successfully', product });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete Product (Admin only)
app.delete('/api/admin/products/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Delete associated orders
    await Order.deleteMany({ productId: req.params.id });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get All Products by Customer (Admin only)
app.get('/api/admin/products', authenticateToken, async (req, res) => {
  try {

    if (req.user.role !== 'admin') {

      return res.status(403).json({ error: 'Access denied' });
    }

    const products = await Product.find().populate('customerId', 'companyName contactPerson username');

    // Filter out products with deleted customers and optionally clean them up
    const validProducts = [];
    const orphanedProducts = [];
    
    for (const product of products) {
      if (!product.customerId) {
        orphanedProducts.push(product._id);
      } else {
        validProducts.push(product);
      }
    }
    
    // Auto-cleanup orphaned products
    if (orphanedProducts.length > 0) {
      await Product.deleteMany({ _id: { $in: orphanedProducts } });
      await Order.deleteMany({ productId: { $in: orphanedProducts } });
    }
    

    // Get order amounts for each product
    const productsWithOrders = await Promise.all(validProducts.map(async (product) => {
      const order = await Order.findOne({
        customerId: product.customerId._id,
        productId: product._id
      });

      return {
        ...product.toObject(),
        orderAmount: order ? (order.lastSubmittedAmount || 0) : 0,  // Show last submitted amount
        orderLastUpdated: order ? order.lastUpdated : null
      };
    }));
    
    // Group products by customer
    const groupedProducts = productsWithOrders.reduce((acc, product) => {
      const customerId = product.customerId._id.toString();
      if (!acc[customerId]) {
        acc[customerId] = {
          customer: product.customerId,
          products: []
        };
      }
      acc[customerId].products.push({
        _id: product._id,
        sku: product.sku,
        name: product.name,
        price: product.price,
        unit: product.unit,
        orderAmount: product.orderAmount,
        lastUpdated: product.lastUpdated,
        orderLastUpdated: product.orderLastUpdated
      });
      return acc;
    }, {});

    const result = Object.values(groupedProducts);
    res.json(result);
  } catch (error) {
    console.error('Error in /api/admin/products:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/manage-customers.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'manage-customers.html'));
});

app.get('/products.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'products.html'));
});

const PORT = process.env.PORT || 3000;

// Initialize admin account on startup
mongoose.connection.once('open', async () => {
  console.log('Connected to MongoDB');
  await initializeAdmin();
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Admin login: Check database for admin account');
});
