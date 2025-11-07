# Deploy to Render - Step by Step Guide

## What is Render?
Render is a modern cloud platform that automatically builds and deploys your web applications. It's free to start and very easy to use!

## Prerequisites
- A GitHub account (free)
- Your supplier portal code

---

## Step-by-Step Deployment

### STEP 1: Prepare Your Code for GitHub

1. **Create a GitHub account** (if you don't have one)
   - Go to: https://github.com/signup

2. **Create a new repository**
   - Click the "+" icon in top right → "New repository"
   - Name it: `supplier-portal`
   - Keep it Public (or Private - both work)
   - Don't initialize with README (we already have one)
   - Click "Create repository"

3. **Upload your code to GitHub**
   
   **Option A: Using Git (Command Line)**
   ```bash
   cd supplier-portal
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/supplier-portal.git
   git push -u origin main
   ```

   **Option B: Using GitHub Website**
   - On your new repository page, click "uploading an existing file"
   - Drag and drop all files from supplier-portal folder
   - Click "Commit changes"

---

### STEP 2: Create Render Account

1. Go to: https://render.com/
2. Click "Get Started" or "Sign Up"
3. **Sign up with GitHub** (recommended - makes deployment easier)
4. Authorize Render to access your GitHub repositories

---

### STEP 3: Deploy MongoDB Database

1. **For MongoDB, use MongoDB Atlas (Free)**
   - Go to: https://www.mongodb.com/cloud/atlas/register
   - Sign up for free account
   - Create a **FREE cluster** (M0 Sandbox)
   - Click "Connect" → "Connect your application"
   - Copy the connection string (looks like):
     ```
     mongodb+srv://username:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```
   - Replace `<password>` with your actual password
   - Replace the database name with `supplier-portal`
   
   Final format:
   ```
   mongodb+srv://username:yourpassword@cluster0.xxxxx.mongodb.net/supplier-portal?retryWrites=true&w=majority
   ```
   
   **Save this connection string!** You'll need it in Step 4.

---

### STEP 4: Deploy Web Service on Render

1. **From Render Dashboard:**
   - Click "New +" button
   - Select "Web Service"

2. **Connect Repository:**
   - If you signed up with GitHub, you'll see your repositories
   - Find and select `supplier-portal`
   - Click "Connect"

3. **Configure the Service:**
   
   Fill in these fields:
   
   | Field | Value |
   |-------|-------|
   | **Name** | `supplier-portal` (or any name you like) |
   | **Region** | Choose closest to you |
   | **Branch** | `main` |
   | **Root Directory** | Leave empty |
   | **Runtime** | `Node` |
   | **Build Command** | `npm install` |
   | **Start Command** | `npm start` |
   | **Plan** | `Free` |

4. **Add Environment Variables:**
   
   Scroll down to "Environment Variables" section and add these:
   
   | Key | Value |
   |-----|-------|
   | `MONGODB_URI` | Your MongoDB Atlas connection string from Step 3 |
   | `JWT_SECRET` | Any random secure string (e.g., `mySuper$ecret123Key!`) |
   | `OWNER_EMAIL` | `owner@example.com` (or change it) |
   | `OWNER_PASSWORD` | `owner123` (or change it) |
   | `NODE_ENV` | `production` |

   Click "Add" for each variable.

5. **Deploy!**
   - Click "Create Web Service"
   - Render will start building and deploying
   - This takes 2-5 minutes

6. **Wait for Deployment:**
   - You'll see logs showing the build process
   - When you see "Your service is live 🎉" - it's done!

---

### STEP 5: Access Your Live Application

1. **Get Your URL:**
   - At the top of the page, you'll see your app URL
   - It looks like: `https://supplier-portal-xxxx.onrender.com`

2. **Test Your Application:**
   - Click the URL
   - You should see your supplier portal login page!
   - Try logging in as owner or creating a supplier account

---

## 🎉 Congratulations! Your App is Live!

### Share Your App:
- Give anyone the Render URL to access your portal
- Suppliers can sign up and start adding products
- You can log in as owner and view all data

---

## Important Notes

### Free Tier Limitations:
- ✅ **Unlimited bandwidth** (free forever)
- ✅ **Custom domains** supported
- ⚠️ **Sleeps after 15 minutes of inactivity** (wakes up in ~30 seconds when accessed)
- ✅ **750 hours/month free** (more than enough for one app)

### Keep Your App Awake (Optional):
If you don't want your app to sleep, use a service like:
- UptimeRobot (https://uptimerobot.com/) - Free monitoring that pings your app every 5 minutes

---

## Updating Your Application

When you make changes to your code:

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Updated features"
   git push
   ```

2. **Automatic Deployment:**
   - Render automatically detects the push
   - Rebuilds and redeploys your app
   - Takes 2-3 minutes

---

## Troubleshooting

### App won't start?
- Check "Logs" tab in Render dashboard
- Make sure MongoDB connection string is correct
- Verify all environment variables are set

### Can't connect to database?
- Go to MongoDB Atlas
- Click "Network Access"
- Add `0.0.0.0/0` to allow all IPs (for testing)
- Or add Render's specific IPs

### Build failed?
- Check that `package.json` is in the root directory
- Verify build command is `npm install`
- Check logs for specific error

---

## Upgrade to Paid (Optional)

If you want to upgrade later ($7/month):
- No sleep after inactivity
- More resources (faster performance)
- Custom domains with SSL

---

## MongoDB Atlas Free Tier

Your MongoDB database on Atlas is also free forever with:
- ✅ 512 MB storage
- ✅ Shared CPU/RAM
- ✅ Good for thousands of products

---

## Next Steps

1. ✅ Share your live URL with suppliers
2. ✅ Create your owner account and test
3. ✅ Monitor usage in Render dashboard
4. ✅ Set up custom domain (optional)
5. ✅ Add more features as needed

---

## Need Help?

- Render Docs: https://render.com/docs
- MongoDB Atlas Docs: https://docs.atlas.mongodb.com/
- Check the Render logs for any errors

**Your application is now live and accessible to anyone with the URL!** 🚀
