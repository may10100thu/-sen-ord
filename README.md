# Supplier Portal - Full Stack Application

A complete supplier management system where suppliers can sign up, log in, and manage their products. Owners can view all products categorized by supplier.

## Features

### For Suppliers:
- Sign up and create an account
- Login with credentials
- Add products with:
  - SKU
  - Product Name
  - Price
  - Unit (kg, pieces, liters, etc.)
  - Automatic timestamp for last updated
- View all their products
- Delete products

### For Owners:
- Login with owner credentials
- View all products from all suppliers
- Products are grouped by supplier
- See supplier information (company name, contact person, email)

## Tech Stack

**Backend:**
- Node.js
- Express.js
- MongoDB (Mongoose)
- JWT for authentication
- bcryptjs for password hashing

**Frontend:**
- Vanilla JavaScript
- HTML5
- CSS3 (with gradients and modern styling)

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)

### Step 1: Install Dependencies
```bash
cd supplier-portal
npm install
```

### Step 2: Configure Environment Variables (Optional)
Create a `.env` file in the root directory:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/supplier-portal
JWT_SECRET=your-super-secret-jwt-key-change-this
OWNER_EMAIL=owner@example.com
OWNER_PASSWORD=owner123
```

If you don't create a `.env` file, the application will use default values.

### Step 3: Start MongoDB
Make sure MongoDB is running on your system:
```bash
# If using local MongoDB
mongod
```

Or use MongoDB Atlas (cloud) by updating the MONGODB_URI in `.env`

### Step 4: Start the Application
```bash
npm start
```

The application will run on `http://localhost:3000`

## Default Owner Credentials
- **Email:** owner@example.com
- **Password:** owner123

(You can change these in the `.env` file or server.js)

## API Endpoints

### Authentication
- `POST /api/supplier/signup` - Register new supplier
- `POST /api/supplier/login` - Supplier login
- `POST /api/owner/login` - Owner login

### Products
- `POST /api/products` - Add new product (Supplier only)
- `GET /api/products/my-products` - Get supplier's products
- `PUT /api/products/:id` - Update product (Supplier only)
- `DELETE /api/products/:id` - Delete product (Supplier only)
- `GET /api/owner/products` - Get all products grouped by supplier (Owner only)

## Deployment Options

### Option 1: Deploy to Heroku

1. Create a Heroku account and install Heroku CLI
2. Login to Heroku:
```bash
heroku login
```

3. Create a new Heroku app:
```bash
heroku create your-app-name
```

4. Add MongoDB Atlas (free tier):
```bash
heroku addons:create mongolab:sandbox
```

5. Set environment variables:
```bash
heroku config:set JWT_SECRET=your-secret-key
heroku config:set OWNER_EMAIL=owner@example.com
heroku config:set OWNER_PASSWORD=owner123
```

6. Deploy:
```bash
git init
git add .
git commit -m "Initial commit"
heroku git:remote -a your-app-name
git push heroku main
```

### Option 2: Deploy to Render

1. Create account on render.com
2. Create a new Web Service
3. Connect your GitHub repository
4. Configure:
   - Build Command: `npm install`
   - Start Command: `npm start`
5. Add environment variables in Render dashboard
6. Deploy

### Option 3: Deploy to Railway

1. Create account on railway.app
2. Create new project from GitHub repo
3. Add MongoDB database in Railway
4. Configure environment variables
5. Deploy automatically

### Option 4: Deploy to DigitalOcean/AWS/GCP

1. Set up a Ubuntu server
2. Install Node.js and MongoDB
3. Clone your repository
4. Install dependencies: `npm install`
5. Use PM2 for process management:
```bash
npm install -g pm2
pm2 start server.js
pm2 save
pm2 startup
```
6. Set up Nginx as reverse proxy
7. Configure SSL with Let's Encrypt

## Usage

### For Suppliers:
1. Go to "Supplier Signup" tab
2. Enter company details and credentials
3. After signup, login with your credentials
4. Add products using the form
5. View and manage your products

### For Owners:
1. Go to "Owner Login" tab
2. Login with owner credentials
3. View all products from all suppliers
4. Products are grouped by supplier company

## Security Features
- Passwords are hashed using bcryptjs
- JWT tokens for secure authentication
- Protected API routes
- Input validation
- CORS enabled

## Database Schema

### Supplier
```javascript
{
  email: String (unique),
  password: String (hashed),
  companyName: String,
  contactPerson: String,
  createdAt: Date
}
```

### Product
```javascript
{
  supplierId: ObjectId (reference to Supplier),
  sku: String,
  name: String,
  price: Number,
  unit: String,
  lastUpdated: Date
}
```

## Future Enhancements
- Product categories
- Bulk product upload (CSV/Excel)
- Product images
- Advanced search and filtering
- Analytics dashboard for owners
- Email notifications
- Export data to PDF/Excel
- Product edit functionality
- Pagination for large datasets

