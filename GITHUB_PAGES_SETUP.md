# GitHub Pages Online Mode Setup

## Overview
This document explains how to configure online multiplayer mode for GitHub Pages deployment.

## What Was Changed
1. Modified `script.js` to support online mode on GitHub Pages
2. Updated WebSocket configuration to use a public WebSocket server when deployed on GitHub Pages
3. Removed the blocking logic that prevented online mode from working on GitHub Pages

## Required Setup

### Option 1: Use a Public WebSocket Server
To enable online mode on GitHub Pages, you need to deploy a WebSocket server that supports the chess game protocol.

1. Find or deploy a public WebSocket server that supports the chess game protocol
2. Update the WebSocket URL in `script.js`:

```javascript
// In the WS_CONFIG.getWebSocketUrl() function, replace:
return 'wss://your-public-ws-server.com';

// With your actual WebSocket server URL, for example:
return 'wss://chess-server.yourdomain.com';
```

### Option 2: Use a Free WebSocket Service
Several services offer free WebSocket hosting:
- **Socket.io Cloud**: Offers free tier for development
- **Pusher**: Real-time messaging service with free tier
- **Firebase Realtime Database**: Can be adapted for WebSocket-like functionality
- **Heroku**: Free tier available for Node.js WebSocket servers

### Option 3: Deploy Your Own Server
1. Deploy the `server.cjs` file to a hosting service that supports WebSockets:
   - **Heroku**: Free tier available
   - **Render**: Free tier available
   - **Railway**: Free tier available
   - **Fly.io**: Free tier available
   - **DigitalOcean App Platform**: Paid but affordable

2. Update the WebSocket URL in `script.js` with your deployed server's URL

## Deployment Steps

1. Update the WebSocket URL in `script.js` (line 171)
2. Commit and push your changes to GitHub
3. Enable GitHub Pages in your repository settings
4. Select the branch to deploy (usually `main` or `master`)
5. Wait for GitHub to deploy your site

## Testing

After deployment:
1. Visit your GitHub Pages URL
2. Click the "Online" mode button in the menu
3. Verify that the connection is established
4. Test multiplayer functionality with another player

## Troubleshooting

### Connection Issues
- Verify your WebSocket server is running and accessible
- Check browser console for error messages
- Ensure your WebSocket URL uses `wss://` for HTTPS sites
- Test your WebSocket server independently using a WebSocket client

### Cross-Origin Issues
If you encounter CORS errors:
- Configure your WebSocket server to allow connections from your GitHub Pages domain
- Add appropriate CORS headers to your server configuration

### Development Mode
When running locally, the game will automatically connect to `ws://localhost:8080`. To test online mode locally:
1. Run your WebSocket server locally on port 8080
2. Open the game in your browser
3. Select "Online" mode

## Security Considerations

- Always use `wss://` (WebSocket Secure) in production
- Implement authentication on your WebSocket server
- Rate limit connections to prevent abuse
- Monitor server logs for suspicious activity
- Keep your server dependencies updated

## Additional Resources

- [WebSocket MDN Documentation](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [Socket.io Documentation](https://socket.io/docs/)
- [Heroku WebSocket Guide](https://devcenter.heroku.com/articles/websockets)
