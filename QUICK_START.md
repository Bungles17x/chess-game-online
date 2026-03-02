# Quick Start Deployment Guide

Get your chess game online in minutes!

## 🚀 Quick Setup (5 minutes)

### Step 1: Deploy Server to Render (3 minutes)

1. Go to [render.com](https://render.com) and sign up/login
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `chess-game-online`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.cjs`
   - **Instance Type**: Free
5. Click **"Create Web Service"**
6. Wait for deployment (2-3 minutes)
7. Copy your Render URL (e.g., `https://chess-game-online-u34h.onrender.com`)

### Step 2: Deploy Frontend to GitHub Pages (2 minutes)

1. Go to your GitHub repository
2. Click **Settings** → **Pages**
3. Under "Build and deployment":
   - **Source**: Deploy from a branch
   - **Branch**: `main` (or `master`)
   - **Folder**: `/ (root)`
4. Click **Save**
5. Wait for deployment (1-2 minutes)
6. Visit your GitHub Pages URL (e.g., `https://yourusername.github.io/chess-game-online-main/`)

## ✅ That's It!

Your chess game is now live! The application will automatically:

- Use your Render WebSocket server when on GitHub Pages
- Use your Render WebSocket server when on Render
- Use localhost when developing locally

## 🎮 Test Your Deployment

1. Open your GitHub Pages URL
2. Click **"Online Mode"**
3. Register a new account
4. Create a room or join an existing one
5. Play chess with friends!

## 📱 Test on Mobile

1. Make sure your phone is connected to the internet
2. Open your browser
3. Visit your GitHub Pages URL
4. Login with the same account
5. Play!

## 🔄 Updates

To update your game:

1. Make changes to your code
2. Commit and push to GitHub
3. Render and GitHub Pages will automatically update!

## 🆘 Troubleshooting

### Can't connect to server?

1. Check if your Render server is running (visit Render dashboard)
2. Wait a few minutes for the server to start up
3. Refresh your browser

### Site not loading on GitHub Pages?

1. Wait a few minutes for deployment to complete
2. Check GitHub Pages settings
3. Make sure you've selected the correct branch

### Can't register or login?

1. Check Render server logs
2. Make sure the server is running
3. Try refreshing the page

## 📚 Full Documentation

For detailed setup instructions, troubleshooting, and advanced configuration, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md).

## 🎉 You're All Set!

Your chess game is now accessible from anywhere in the world! Share your GitHub Pages URL with friends and start playing!
