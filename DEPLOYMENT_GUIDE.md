# Chess Game Deployment Guide

This guide will help you deploy your chess game to both Render (for the WebSocket server) and GitHub Pages (for the frontend).

## Architecture

- **Frontend (GitHub Pages)**: Static HTML/CSS/JS files
- **Backend (Render)**: WebSocket server for online multiplayer
- **Database**: Server-side user management (stored on Render)

## Prerequisites

- GitHub account
- Render account (free at https://render.com)
- Your chess game repository

---

## Part 1: Deploy WebSocket Server to Render

### Step 1: Prepare Your Repository

Ensure your repository has:
- `server-enhanced.cjs` (your WebSocket server)
- `package.json` with proper dependencies
- All necessary server files

### Step 2: Create/Update package.json

Your `package.json` should look like this:

```json
{
  "name": "chess-websocket-server",
  "version": "1.0.0",
  "description": "WebSocket server for chess game",
  "main": "server-enhanced.cjs",
  "scripts": {
    "start": "node server-enhanced.cjs"
  },
  "dependencies": {
    "ws": "^8.14.2",
    "express": "^4.18.2",
    "cors": "^2.8.5"
  },
  "engines": {
    "node": ">=14.0.0"
  }
}
```

### Step 3: Deploy to Render

1. Log in to your Render dashboard
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: chess-game-online (or your preferred name)
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server-enhanced.cjs`
   - **Instance Type**: Free
5. Click "Create Web Service"

### Step 4: Get Your Render URL

After deployment, Render will provide you with a URL like:
`https://chess-game-online-u34h.onrender.com`

**Important**: Copy this URL - you'll need it for the frontend configuration.

### Step 5: Enable WebSockets

Render automatically supports WebSockets. No additional configuration needed!

---

## Part 2: Deploy Frontend to GitHub Pages

### Step 1: Update WebSocket Configuration

The application is already configured to automatically detect the environment and use the appropriate WebSocket server:

- **GitHub Pages**: Uses Render server (`wss://chess-game-online-u34h.onrender.com`)
- **Render**: Uses Render server
- **Local development**: Uses `ws://localhost:8080`

No manual configuration needed!

### Step 2: Prepare Your Repository

Ensure your repository has:
- `index.html`
- All CSS files
- All JavaScript files (including the updated ones with environment detection)
- All assets (images, sounds, etc.)

### Step 3: Deploy to GitHub Pages

#### Option A: Using GitHub Web Interface

1. Go to your repository on GitHub
2. Click "Settings" → "Pages"
3. Under "Build and deployment":
   - **Source**: Deploy from a branch
   - **Branch**: Select `main` (or `master`)
   - **Folder**: `/ (root)`
4. Click "Save"

GitHub will automatically deploy your site. You'll see a URL like:
`https://yourusername.github.io/chess-game-online-main/`

#### Option B: Using GitHub CLI

```bash
# Install GitHub CLI if not already installed
# Then run:
gh repo edit --enable-pages --source=main --path=/
```

### Step 4: Verify Deployment

1. Wait a few minutes for GitHub to deploy
2. Visit your GitHub Pages URL
3. Test the application:
   - Try playing a bot game
   - Try registering/logging in
   - Try creating/joining an online room

---

## Part 3: Testing Your Deployment

### Test Local Development

1. Start your local server:
   ```bash
   node server-enhanced.cjs
   ```

2. Open your browser to `http://localhost:3000`
3. The app should automatically use `ws://localhost:8080`

### Test GitHub Pages

1. Visit your GitHub Pages URL
2. The app should automatically use the Render WebSocket server
3. Test registration and login

### Test Render Deployment

1. Visit your Render URL
2. The app should use the Render WebSocket server
3. Test all features

---

## Part 4: Troubleshooting

### WebSocket Connection Issues

**Problem**: Can't connect to WebSocket server

**Solutions**:
1. Check if Render server is running
2. Verify the WebSocket URL in the code matches your Render URL
3. Check Render logs for errors
4. Ensure WebSocket support is enabled in Render (it should be by default)

### GitHub Pages Issues

**Problem**: Site not loading or 404 errors

**Solutions**:
1. Check GitHub Pages settings
2. Ensure you've selected the correct branch
3. Wait a few minutes for deployment to complete
4. Check the repository name matches the URL

### Registration/Login Issues

**Problem**: Can't register or login

**Solutions**:
1. Check if server is running
2. Check server logs for errors
3. Verify the register and login handlers are implemented
4. Check if userManager is properly configured

### Mixed Content Issues

**Problem**: Browser blocking insecure WebSocket connections

**Solutions**:
1. Always use `wss://` (secure WebSocket) in production
2. Only use `ws://` for local development
3. The code already handles this automatically

---

## Part 5: Maintenance

### Updating the Application

1. Make changes to your code
2. Test locally
3. Commit and push to GitHub
4. Render will automatically redeploy the server
5. GitHub Pages will automatically redeploy the frontend

### Monitoring

- **Render Dashboard**: Monitor server status, logs, and performance
- **GitHub Pages**: Check deployment status in repository settings
- **Server Status Page**: Use the built-in server status page to monitor connectivity

---

## Part 6: Environment Variables (Optional)

If you need to configure different environments, you can use environment variables:

### On Render

1. Go to your Web Service settings
2. Scroll to "Environment Variables"
3. Add variables like:
   - `NODE_ENV=production`
   - `PORT=8080`

### In Your Code

```javascript
const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'development';
```

---

## Part 7: Security Best Practices

1. **Never commit sensitive data**: Don't commit API keys, passwords, or secrets
2. **Use environment variables**: Store configuration in environment variables
3. **Enable HTTPS**: Always use secure connections in production
4. **Validate input**: Sanitize all user input on the server
5. **Rate limiting**: Implement rate limiting to prevent abuse
6. **Regular updates**: Keep dependencies updated

---

## Part 8: Scaling

When you're ready to scale beyond the free tier:

1. **Upgrade Render**: Move to paid tier for better performance
2. **Add CDN**: Use Cloudflare or similar for static assets
3. **Database**: Consider adding a proper database (PostgreSQL, MongoDB)
4. **Load balancing**: Add multiple server instances
5. **Monitoring**: Implement proper monitoring and alerting

---

## Summary

Your chess game is now configured to work seamlessly across:

- **Local Development**: Uses `ws://localhost:8080`
- **GitHub Pages**: Uses Render WebSocket server
- **Render**: Uses Render WebSocket server

The application automatically detects the environment and uses the appropriate WebSocket server, so you don't need to manually configure anything!

For questions or issues, check the server logs on Render and the deployment status on GitHub Pages.
