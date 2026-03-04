# Modern Chess - Online Multiplayer Chess Game

A beautifully designed, feature-rich online multiplayer chess game built with vanilla JavaScript, WebSockets, and Node.js.

## Features

- **Multiple Game Modes**
  - Play against AI bot
  - Local 1v1 multiplayer
  - Online multiplayer with matchmaking

- **Advanced Features**
  - Real-time move analysis
  - Game statistics and achievements
  - Player ratings and rankings
  - Anti-cheat detection system
  - Game reporting and moderation

- **User Experience**
  - Beautiful, modern UI with multiple themes
  - Responsive design (desktop & mobile)
  - Dark/light mode toggle
  - Sound effects and visual feedback
  - Accessibility features (screen reader support, TTS)

- **Game Features**
  - Move highlighting and validation
  - Game replay system
  - Chat during games
  - Friend system
  - Tournament and season support
  - XP and level progression

## GitHub Pages Deployment

This project is configured for GitHub Pages static hosting. 

### Prerequisites

- A GitHub account
- This repository forked to your account

### Automatic Deployment

The project includes GitHub Actions workflows that automatically deploy to GitHub Pages on every push to the `main` or `master` branch.

**Workflow file:** [.github/workflows/pages-deploy.yml](.github/workflows/pages-deploy.yml)

### Manual Setup (if needed)

1. Go to your repository **Settings** → **Pages**
2. Under "Build and deployment", select:
   - **Source:** Deploy from a branch
   - **Branch:** `main` (or `master`)
   - **Folder:** `/ (root)`
3. Click **Save**

GitHub will automatically deploy your site to:
```
https://yourusername.github.io/chess-game-online/
```

### Pages Configuration

- **`_config.yml`** - Jekyll configuration (tells GitHub not to use Jekyll for everything)
- **`.nojekyll`** - Disables Jekyll processing for this repository
- **`.gitignore`** - Excludes unnecessary files from deployment

## Local Development

### Prerequisites

- Node.js (v14 or higher)
- npm

### Setup

```bash
# Install dependencies
npm install

# Start the application
npm start
```

This will start:
- HTTP file server on port 3000
- WebSocket server on port 8080

Visit `http://localhost:3000` in your browser.

### Scripts

- `npm start` - Start all servers (file + WebSocket)
- `npm run start:file` - Start file server only
- `npm run start:ws` - Start WebSocket server only
- `npm run build` - Install dependencies and verify build

## Project Structure

```
├── index.html                 # Main entry point
├── style.css                  # Main styles
├── script.js                  # Main application logic
├── chess.js                   # Chess game engine
├── auth.js                    # Authentication system
├── admin-features.js          # Admin panel
├── server/                    # Backend server files
│   └── (Node.js server code)
├── sounds/                    # Sound effects
├── avatars/                   # User avatar images
├── users/                     # User data storage
├── reports/                   # Player reports
└── game-replays/              # Saved game replays
```

## Online Mode Setup

For GitHub Pages, online multiplayer requires an external WebSocket server since GitHub Pages is static hosting only.

### Option 1: Use Free Hosting Services

Choose one of these services to host the WebSocket server:

- **Render.com** (Free tier available)
- **Railway.app** (Free tier available)
- **Fly.io** (Free tier available)
- **Heroku** (Paid, but affordable)

### Option 2: Deploy Server Files

The project includes `server.cjs` which can be deployed to any Node.js hosting service:

1. Deploy `server.cjs` to your chosen hosting service
2. Update the WebSocket URL in `script.js` (search for `WS_CONFIG`)
3. Replace with your server URL (e.g., `wss://your-server.herokuapp.com`)

## Environment Variables

Create a `.env` file in the root directory:

```env
# Twilio SMS (optional)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Email notifications (optional)
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Known Limitations

- **GitHub Pages Only:** No server-side multiplayer without external WebSocket server
- **Storage:** Limited to browser localStorage
- **No Database:** User data is stored locally in the browser

## Troubleshooting

### Connection Issues

If you see "Connection Failed" on GitHub Pages:

1. Verify the WebSocket server is running and accessible
2. Check browser console for specific error messages (F12)
3. Ensure WebSocket URL uses `wss://` (secure) for HTTPS sites
4. Try bot mode first to verify the site is loading

### Performance Issues

- Clear browser cache (Ctrl+Shift+Delete or Cmd+Shift+Delete)
- Disable browser extensions
- Try a different browser
- Check system resource usage

## Security

- Passwords are hashed with bcryptjs
- JWT tokens for session management
- Anti-cheat detection system
- Rate limiting on sensitive endpoints
- CORS protection
- Input validation and sanitization

## Contributing

To contribute to this project:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is provided as-is for educational and personal use.

## Support

For issues, questions, or suggestions:

1. Check existing GitHub Issues
2. Review the documentation files in the project root
3. Check browser console for error messages (F12)

## Related Documentation

- [GITHUB_PAGES_SETUP.md](GITHUB_PAGES_SETUP.md) - GitHub Pages deployment guide
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Server deployment instructions
- [EMAIL_SETUP.md](EMAIL_SETUP.md) - Email notification setup
- [TWILIO_SETUP.md](TWILIO_SETUP.md) - SMS notification setup
- [GITHUB_AUTH_SETUP.md](GITHUB_AUTH_SETUP.md) - GitHub OAuth setup

---

**Built with ❤️ for chess enthusiasts**
```diff
- NOTE: this project is allowing you to copy, modify (as long as you are not in original code), free of charge copyright, mess around in code (only in your desired folder, not original), merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so. changes to this application/repository are all free of charge under certain circumstances:
- 1: you must use a different folder.
- 2: you must use appropriate actions or you may get into trouble with the law based on your local law.
- 3: DO NOT CHANGE ADMIN PERMISSIONS OR ANY FILES THAT HAVE/CONTAINS ./ADMIN.
```
