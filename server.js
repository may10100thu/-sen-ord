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
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/supplier-portal';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Supplier Schema
const supplierSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  companyName: { type: String, required: true },
  contactPerson: { type: String, required: true },
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

// Owner authentication (you can set owner credentials)
const OWNER_EMAIL = process.env.OWNER_EMAIL || 'owner@example.com';
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || 'owner123';

// Routes

// Supplier Signup
app.post('/api/supplier/signup', async (req, res) => {
  try {
    const { email, password, companyName, contactPerson } = req.body;

    // Check if supplier already exists
    const existingSupplier = await Supplier.findOne({ email });
    if (existingSupplier) {
      return res.status(400).json({ error: 'Supplier already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new supplier
    const supplier = new Supplier({
      email,
      password: hashedPassword,
      companyName,
      contactPerson
    });

    await supplier.save();

    res.status(201).json({ message: 'Supplier registered successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Supplier Login
app.post('/api/supplier/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find supplier
    const supplier = await Supplier.findOne({ email });
    if (!supplier) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, supplier.password);
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

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
        email: supplier.email,
        companyName: supplier.companyName,
        contactPerson: supplier.contactPerson
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Owner Login
app.post('/api/owner/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (email !== OWNER_EMAIL || password !== OWNER_PASSWORD) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { email, role: 'owner' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      owner: { email }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add Product (Supplier only)
app.post('/api/products', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'supplier') {
      return res.status(403).json({ error: 'Access denied' });
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

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get All Products by Supplier (Owner only)
app.get('/api/owner/products', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const products = await Product.find().populate('supplierId', 'companyName contactPerson email');
    
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

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Owner credentials - Email: ${OWNER_EMAIL}, Password: ${OWNER_PASSWORD}`);
});
