# 🚀 Deployment Guide for Task Manager PWA

## Quick Deploy to Vercel (Recommended)

### Step 1: Push to GitHub

```bash
# Initialize git (if not already done)
cd "/Users/aaryanyadav/Desktop/TAsk manager/client"
git add .
git commit -m "Initial commit - Task Manager PWA"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/task-manager-app.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy on Vercel

1. **Go to Vercel**: https://vercel.com
2. **Sign up/Login** with your GitHub account
3. **Click "New Project"**
4. **Import your GitHub repository** (task-manager-app)
5. **Configure Environment Variables** (Important!):
   - Click "Environment Variables"
   - Add these variables:
     ```
     DATABASE_URL = your-mongodb-atlas-connection-string
     JWT_SECRET = your-jwt-secret-key
     JWT_REFRESH_SECRET = your-jwt-refresh-secret-key
     ```
6. **Click "Deploy"**

### Step 3: Wait for Deployment
- Vercel will build and deploy your app
- You'll get a URL like: `https://task-manager-app.vercel.app`
- This URL has **HTTPS** (required for PWA)

### Step 4: Install PWA on Phone

#### On iPhone (Safari):
1. Open Safari and go to your Vercel URL
2. Tap the Share button (⬆️)
3. Tap "Add to Home Screen"
4. The app will install as a standalone app!

#### On Android (Chrome):
1. Open Chrome and go to your Vercel URL
2. Tap the menu (⋮)
3. Tap "Install app"
4. The app will appear in your app drawer!

## Environment Variables Needed

Copy from your current `.env.local` file:

```env
DATABASE_URL="your-mongodb-atlas-connection-string"
JWT_SECRET="your-jwt-secret-key"
JWT_REFRESH_SECRET="your-jwt-refresh-secret-key"
```

## After Deployment

### Update MongoDB Atlas IP Whitelist
Your app needs to connect to MongoDB from Vercel's servers:
1. Go to MongoDB Atlas
2. Navigate to Network Access
3. Click "Add IP Address"
4. Click "Allow Access from Anywhere" (0.0.0.0/0)
   - Or add Vercel's IP ranges for better security

## Testing the PWA

Once deployed on Vercel with HTTPS:
- ✅ App will install as standalone (not just a browser bookmark)
- ✅ App will appear in phone's app drawer/list
- ✅ Opens without browser UI (full-screen experience)
- ✅ Service worker will enable offline capabilities

## Alternative: Railway (If you prefer)

1. Go to https://railway.app
2. Sign in with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Add environment variables
6. Deploy

## Notes

- **HTTPS is required** for PWA to work properly
- localhost/local IP addresses create bookmarks, not true PWAs
- Vercel is free and perfect for Next.js apps
- Your MongoDB Atlas database will work from anywhere with proper IP whitelist
