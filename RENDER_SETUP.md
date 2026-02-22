# Render WebSocket Server Setup Guide

## Overview
This guide will walk you through deploying your chess game WebSocket server on Render, a cloud platform that offers free hosting with WebSocket support.

## Prerequisites
- A Render account (free at https://render.com)
- Your chess game repository pushed to GitHub
- The `server.cjs` file from your project

## Step-by-Step Setup

### 1. Prepare Your Repository

Ensure your repository has:
- `server.cjs` (your WebSocket server)
- `package.json` with proper dependencies
- All necessary server files

### 2. Create package.json (if not exists)

Create a `package.json` file in your project root:

```json
{
  "name": "chess-websocket-server",
  "version": "1.0.0",
  "description": "WebSocket server for chess game",
  "main": "server.cjs",
  "scripts": {
    "start": "node server.cjs"
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

### 3. Deploy to Render

#### Option A: Web Service (Recommended for WebSocket)

1. Log in to your Render dashboard
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: chess-ws-server (or your preferred name)
   - **Region**: Choose the region closest to your users
   - **Branch**: main (or your default branch)
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server.cjs`
   - **Instance Type**: Free (or Paid for better performance)

5. Click "Create Web Service"

#### Option B: Using Render Blueprint

Create a `render.yaml` file in your repository:

```yaml
services:
  - type: web
    name: chess-ws-server
    env: node
    plan: free
    buildCommand: npm install
    startCommand: node server.cjs
    envVars:
      - key: PORT
        value: 8080
```

Then:
1. Commit and push `render.yaml` to your repository
2. In Render dashboard, go to "New +" → "Blueprint"
3. Connect your repository and deploy

### 4. Configure Your Server for Render

Update `server.cjs` to use Render's port:

```javascript
const PORT = process.env.PORT || 8080;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 5. Get Your WebSocket URL

After deployment:
1. Go to your Render service dashboard
2. Copy the service URL (e.g., `https://chess-ws-server.onrender.com`)
3. Convert to WebSocket URL: `wss://chess-ws-server.onrender.com`

### 6. Update Your Chess Game

In `script.js`, update the WebSocket URL:

```javascript
// In WS_CONFIG.getWebSocketUrl() function
if (isGitHubPages) {
  return 'wss://chess-ws-server.onrender.com'; // Your Render service URL
}
```

## Important Notes

### Free Tier Limitations
- **Sleep time**: Free services spin down after 15 minutes of inactivity
- **Cold starts**: First request after sleep takes ~30 seconds to respond
- **No SSL certificate**: Use the provided `onrender.com` domain for HTTPS/WSS

### Keeping Your Server Active

To prevent the free tier from spinning down:
1. Use a cron job or uptime monitor to ping your server regularly
2. Set up a simple health check endpoint
3. Use services like UptimeRobot (free) to ping your server every 5 minutes

### Health Check Endpoint

Add this to your `server.cjs`:

```javascript
// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

## Troubleshooting

### Connection Issues
- Verify your service is running in Render dashboard
- Check the service logs for errors
- Ensure you're using `wss://` not `ws://` for secure connections
- Test your WebSocket URL with a WebSocket client tool

### CORS Errors
Add CORS configuration to your server:

```javascript
const cors = require('cors');
app.use(cors({
  origin: ['https://your-username.github.io', 'http://localhost:3000'],
  methods: ['GET', 'POST'],
  credentials: true
}));
```

### Service Not Starting
- Check the Render service logs
- Verify `package.json` has correct start command
- Ensure all dependencies are listed in `package.json`
- Check Node.js version compatibility

## Monitoring Your Server

### View Logs
1. Go to your service in Render dashboard
2. Click "Logs" tab
3. View real-time logs and errors

### Metrics
Render provides:
- CPU usage
- Memory usage
- Response times
- Error rates

## Scaling Up

If you need better performance:
1. Upgrade to a paid plan (starts at $7/month)
2. Benefits:
   - No spin-down
   - Faster cold starts
   - More RAM/CPU
   - Better uptime

## Security Best Practices

1. **Always use WSS** (WebSocket Secure) in production
2. **Implement authentication** on your WebSocket server
3. **Rate limit connections** to prevent abuse
4. **Monitor logs** for suspicious activity
5. **Keep dependencies updated**
6. **Use environment variables** for sensitive data

## Additional Resources

- [Render Documentation](https://render.com/docs)
- [Render Web Services](https://render.com/docs/web-services)
- [Render Free Tier](https://render.com/docs/free)
- [WebSocket Security Guide](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)

## Support

If you encounter issues:
1. Check Render status page: https://status.render.com
2. Review Render documentation
3. Check your service logs
4. Verify your server configuration

## Next Steps

After deploying:
1. Test your WebSocket connection
2. Set up uptime monitoring
3. Configure alerts for downtime
4. Monitor resource usage
5. Consider upgrading to paid tier if needed
