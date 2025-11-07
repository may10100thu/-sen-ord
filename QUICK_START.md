# Quick Start Guide

## Getting Started in 3 Steps

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start MongoDB
Make sure MongoDB is running on your system, or use MongoDB Atlas (cloud)

### Step 3: Run the Application
```bash
npm start
```

Visit: `http://localhost:3000`

## Login Credentials

**Owner Account (Pre-configured):**
- Email: owner@example.com
- Password: owner123

**Supplier Account:**
- Create your own by clicking "Supplier Signup" tab

## What You Can Do

### As a Supplier:
✅ Sign up with company details
✅ Login to your account
✅ Add products (SKU, name, price, unit)
✅ View all your products
✅ Delete products
✅ Automatic timestamps on updates

### As an Owner:
✅ Login with owner credentials
✅ View ALL products from ALL suppliers
✅ See products grouped by supplier
✅ View supplier company information

## Need MongoDB?

### Option 1: Local MongoDB
Install from: https://www.mongodb.com/try/download/community

### Option 2: MongoDB Atlas (Free Cloud)
1. Go to: https://www.mongodb.com/cloud/atlas/register
2. Create free cluster
3. Get connection string
4. Create `.env` file:
```
MONGODB_URI=your-mongodb-atlas-connection-string
```

## Deploy to Cloud (Free Options)

### Render.com
1. Push code to GitHub
2. Create new Web Service on Render
3. Connect GitHub repo
4. Add MongoDB database
5. Deploy automatically

### Railway.app
1. Push code to GitHub
2. Create new project from GitHub
3. Add MongoDB plugin
4. Configure environment variables
5. Deploy

### Heroku
```bash
heroku create
heroku addons:create mongolab:sandbox
git push heroku main
```

## Troubleshooting

**Can't connect to MongoDB?**
- Make sure MongoDB is running: `mongod`
- Or use MongoDB Atlas connection string

**Port already in use?**
- Change PORT in `.env` file or use: `PORT=4000 npm start`

**Need help?**
Check the full README.md for detailed instructions!
