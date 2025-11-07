const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

require('dotenv').config();
const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URL ;
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Supplier Schema - Simplified
const supplierSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true }, // Used as username for backward compatibility
  username: { type: String, unique: true, sparse: true }, // Alternative username field
  password: { type: String, required: true },
  companyName: { type: String, required: true },
  contactPerson: { type: String, required: true },
  productCount: { type: Number, default: 0 },
  lastActive: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

// Admin Schema
const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Product Schema
const productSchema = new mongoose.Schema({
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
  sku: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  unit: { type: String, required: true },
  lastUpdated: { type: Date, default: Date.now }
});

const Supplier = mongoose.model('Supplier', supplierSchema);
const Admin = mongoose.model('Admin', adminSchema);
const Product = mongoose.model('Product', productSchema);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

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
        username: defaultUsername,
        password: hashedPassword
      });
      
      await admin.save();
      console.log(`✓ Default admin account created - Username: ${defaultUsername}`);
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

// Admin creates supplier account - NO LIMIT
app.post('/api/admin/create-supplier', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Only admins can create suppliers.' });
    }

    const { username, password, companyName, contactPerson } = req.body;

    // Check if username already exists
    const existingSupplier = await Supplier.findOne({ 
      $or: [
        { email: username },
        { username: username }
      ]
    });
    
    if (existingSupplier) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new supplier
    const supplier = new Supplier({
      email: username, // For backward compatibility
      username: username,
      password: hashedPassword,
      companyName,
      contactPerson,
      productCount: 0
    });

    await supplier.save();

    res.status(201).json({ 
      message: 'Supplier created successfully',
      supplier: {
        username,
        companyName,
        contactPerson
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all suppliers with product count
app.get('/api/admin/suppliers', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const suppliers = await Supplier.find().select('-password');
    
    // Add product count for each supplier
    const suppliersWithCount = await Promise.all(suppliers.map(async (supplier) => {
      const productCount = await Product.countDocuments({ supplierId: supplier._id });
      return {
        ...supplier.toObject(),
        productCount
      };
    }));

    res.json({
      suppliers: suppliersWithCount,
      count: suppliersWithCount.length
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

    const totalSuppliers = await Supplier.countDocuments();
    const totalProducts = await Product.countDocuments();
    
    // Get suppliers active today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeToday = await Supplier.countDocuments({
      lastActive: { $gte: today }
    });

    // Get new suppliers this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const newThisWeek = await Supplier.countDocuments({
      createdAt: { $gte: weekAgo }
    });

    res.json({
      totalSuppliers,
      totalProducts,
      activeToday,
      newThisWeek
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get products for a specific supplier (Admin only)
app.get('/api/admin/supplier/:supplierId/products', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const products = await Product.find({ supplierId: req.params.supplierId });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete supplier (Admin only)
app.delete('/api/admin/suppliers/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete all products from this supplier
    await Product.deleteMany({ supplierId: req.params.id });
    
    // Delete the supplier
    const supplier = await Supplier.findByIdAndDelete(req.params.id);
    
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    res.json({ message: 'Supplier and all their products deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Supplier Login
app.post('/api/supplier/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find supplier by username or email
    const supplier = await Supplier.findOne({ 
      $or: [
        { email: username },
        { username: username }
      ]
    });
    
    if (!supplier) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, supplier.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Update last active
    supplier.lastActive = new Date();
    await supplier.save();

    // Create JWT token
    const token = jwt.sign(
      { id: supplier._id, email: supplier.email, role: 'supplier' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      supplier: {
        id: supplier._id,
        username: supplier.username || supplier.email,
        companyName: supplier.companyName,
        contactPerson: supplier.contactPerson
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

    // Find admin in database
    const admin = await Admin.findOne({ username });
    
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

// Add Product (Supplier only) - WITH 50 PRODUCT LIMIT
app.post('/api/products', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'supplier') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check product count for this supplier
    const productCount = await Product.countDocuments({ supplierId: req.user.id });
    
    if (productCount >= 50) {
      return res.status(400).json({ 
        error: 'Product limit reached. Maximum 50 products per supplier.' 
      });
    }

    const { sku, name, price, unit } = req.body;

    const product = new Product({
      supplierId: req.user.id,
      sku,
      name,
      price,
      unit,
      lastUpdated: new Date()
    });

    await product.save();

    // Update supplier's product count
    await Supplier.findByIdAndUpdate(req.user.id, {
      productCount: productCount + 1
    });

    res.status(201).json({ message: 'Product added successfully', product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get Supplier's Products
app.get('/api/products/my-products', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'supplier') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const products = await Product.find({ supplierId: req.user.id });
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Product (Supplier only)
app.put('/api/products/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'supplier') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { sku, name, price, unit } = req.body;

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, supplierId: req.user.id },
      { sku, name, price, unit, lastUpdated: new Date() },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product updated successfully', product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete Product (Supplier only)
app.delete('/api/products/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'supplier') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      supplierId: req.user.id
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Update supplier's product count
    const productCount = await Product.countDocuments({ supplierId: req.user.id });
    await Supplier.findByIdAndUpdate(req.user.id, {
      productCount: productCount
    });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get All Products by Supplier (Admin only)
app.get('/api/admin/products', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const products = await Product.find().populate('supplierId', 'companyName contactPerson email username');
    
    // Group products by supplier
    const groupedProducts = products.reduce((acc, product) => {
      const supplierId = product.supplierId._id.toString();
      if (!acc[supplierId]) {
        acc[supplierId] = {
          supplier: product.supplierId,
          products: []
        };
      }
      acc[supplierId].products.push({
        _id: product._id,
        sku: product.sku,
        name: product.name,
        price: product.price,
        unit: product.unit,
        lastUpdated: product.lastUpdated
      });
      return acc;
    }, {});

    res.json(Object.values(groupedProducts));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update Product (Admin only)
app.put('/api/admin/products/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { sku, name, price, unit } = req.body;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { sku, name, price, unit, lastUpdated: new Date() },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ message: 'Product updated successfully', product });
  } catch (error) {
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

    // Update supplier's product count
    const productCount = await Product.countDocuments({ supplierId: product.supplierId });
    await Supplier.findByIdAndUpdate(product.supplierId, {
      productCount: productCount
    });

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/supplier-management.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'supplier-management.html'));
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
