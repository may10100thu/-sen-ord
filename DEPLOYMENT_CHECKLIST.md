# Deployment Checklist ✅

Use this checklist to ensure smooth deployment to Render.

---

## Pre-Deployment Checklist

- [ ] Create GitHub account
- [ ] Create Render account  
- [ ] Create MongoDB Atlas account
- [ ] Have your code ready in the `supplier-portal` folder

---

## GitHub Setup (5 minutes)

- [ ] Create new repository on GitHub
- [ ] Name it `supplier-portal`
- [ ] Keep it Public
- [ ] Copy the repository URL
- [ ] Initialize git in your project folder: `git init`
- [ ] Add files: `git add .`
- [ ] Commit: `git commit -m "Initial commit"`
- [ ] Add remote: `git remote add origin YOUR-REPO-URL`
- [ ] Push: `git push -u origin main`
- [ ] Verify code appears on GitHub website

---

## MongoDB Atlas Setup (10 minutes)

- [ ] Sign up at mongodb.com/cloud/atlas
- [ ] Create FREE M0 cluster
- [ ] Wait for cluster creation (3-5 mins)
- [ ] Create database user (username: admin)
- [ ] Save password securely
- [ ] Add IP whitelist: 0.0.0.0/0 (allow all)
- [ ] Get connection string from "Connect" button
- [ ] Replace `<password>` in connection string
- [ ] Test connection string format:
  ```
  mongodb+srv://admin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/
  ```
- [ ] Save connection string for next step

---

## Render Deployment (10 minutes)

- [ ] Go to render.com and login
- [ ] Click "New +" → "Web Service"
- [ ] Connect your GitHub account
- [ ] Select `supplier-portal` repository
- [ ] Configure service:
  - [ ] Name: supplier-portal
  - [ ] Runtime: Node
  - [ ] Build Command: `npm install`
  - [ ] Start Command: `npm start`
  - [ ] Instance Type: Free

- [ ] Add Environment Variables:
  - [ ] MONGODB_URI = (your Atlas connection string)
  - [ ] JWT_SECRET = render-secret-key-2024
  - [ ] OWNER_EMAIL = owner@example.com
  - [ ] OWNER_PASSWORD = owner123
  - [ ] NODE_ENV = production

- [ ] Click "Create Web Service"
- [ ] Wait for deployment (5-10 mins)
- [ ] Check logs for errors
- [ ] Wait for "Live" status (green dot)

---

## Post-Deployment Testing

- [ ] Copy your Render URL (e.g., https://supplier-portal-xxxx.onrender.com)
- [ ] Visit the URL in browser
- [ ] Test Owner Login:
  - [ ] Email: owner@example.com
  - [ ] Password: owner123
  - [ ] Should see Owner Dashboard
  - [ ] Logout

- [ ] Test Supplier Signup:
  - [ ] Create new supplier account
  - [ ] Fill all fields
  - [ ] Click Sign Up
  - [ ] Should see success message

- [ ] Test Supplier Login:
  - [ ] Login with new supplier credentials
  - [ ] Should see Supplier Dashboard

- [ ] Test Add Product:
  - [ ] Fill product form (SKU, name, price, unit)
  - [ ] Click Add Product
  - [ ] Product should appear in list

- [ ] Test Owner View:
  - [ ] Logout
  - [ ] Login as Owner
  - [ ] Should see all products grouped by supplier

---

## Optional: Keep App Awake (5 minutes)

If you don't want the 30-second cold start delay:

- [ ] Sign up at uptimerobot.com (free)
- [ ] Add New Monitor
- [ ] Monitor Type: HTTP(s)
- [ ] URL: Your Render URL
- [ ] Monitoring Interval: 5 minutes
- [ ] Click Create Monitor
- [ ] App will now stay awake!

---

## Common Issues & Quick Fixes

### ❌ "Build failed"
- Check Build Logs in Render
- Ensure `package.json` is in root directory
- Verify Build Command is `npm install`

### ❌ "Application failed to start"
- Check Start Logs in Render
- Verify Start Command is `npm start`
- Check if PORT is set correctly (Render sets this automatically)

### ❌ "Cannot connect to MongoDB"
- Verify MongoDB Atlas connection string
- Check password is correct (no < > symbols)
- Ensure IP whitelist includes 0.0.0.0/0
- Test connection string format

### ❌ "Environment variables not working"
- Go to Render → Your Service → Environment
- Verify all 5 variables are listed
- Click "Save Changes"
- Redeploy if needed

### ❌ "App is very slow"
- Normal on free tier (cold starts)
- Use UptimeRobot to keep awake
- Or upgrade to paid tier

### ❌ "Can't login as Owner"
- Check OWNER_EMAIL and OWNER_PASSWORD in Environment Variables
- Default: owner@example.com / owner123

---

## Success Indicators ✅

You know it's working when:
- ✅ Render status shows "Live" with green dot
- ✅ URL loads the login page
- ✅ Owner can login and see dashboard
- ✅ Suppliers can signup and add products
- ✅ No errors in Render logs
- ✅ Products persist after page refresh

---

## Your Deployment Summary

Fill this in after successful deployment:

**GitHub Repository:** _______________________________

**Render URL:** _______________________________

**MongoDB Cluster:** _______________________________

**Owner Login:**
- Email: owner@example.com
- Password: owner123

**Deployment Date:** _______________________________

**Status:** ⭐ LIVE AND WORKING! ⭐

---

## Next Steps

- [ ] Share your URL with others
- [ ] Create supplier accounts for testing
- [ ] Add sample products
- [ ] Bookmark your Render dashboard
- [ ] Set up custom domain (optional)
- [ ] Enable UptimeRobot monitoring (optional)

---

**Congratulations! Your supplier portal is now live on the internet! 🎉**

Anyone with the URL can access it, suppliers can sign up, and you have a fully functional web application deployed for FREE!
