# GitHub Authentication Setup Guide

This guide will help you set up GitHub OAuth for your chess game to sync player data across devices.

## Prerequisites

1. A GitHub account
2. Access to your chess game's hosting platform (GitHub Pages, Netlify, etc.)

## Step 1: Create a GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in the following information:
   - **Application name**: Chess Game Online
   - **Homepage URL**: Your game's homepage URL (e.g., https://yourusername.github.io/chess-game-online-main/)
   - **Application description**: Online chess game with player data sync
   - **Authorization callback URL**: Your homepage URL + `/github-callback.html` (e.g., https://yourusername.github.io/chess-game-online-main/github-callback.html)
4. Click "Register application"

## Step 2: Get Your Credentials

After registering, you'll see:
- **Client ID**: Copy this
- **Client Secret**: Generate and copy this (you'll only see it once!)

## Step 3: Update the Configuration

Open `github-auth.js` and update the following values:

```javascript
const GITHUB_CONFIG = {
  CLIENT_ID: 'YOUR_GITHUB_CLIENT_ID', // Replace with your actual Client ID
  REDIRECT_URI: window.location.origin + '/github-callback.html',
  SCOPE: 'user:email',
  AUTH_URL: 'https://github.com/login/oauth/authorize'
};
```

**Important**: For security reasons, you should NOT include the Client Secret in your client-side code. Instead, you'll need a backend server to handle the token exchange. See the "Security Considerations" section below.

## Step 4: Add GitHub Auth to Your Game

Add the following to your `index.html`:

```html
<script src="github-auth.js"></script>
```

## Step 5: Add Sync Button to Your UI

Add a button to your settings/profile page to sync with GitHub:

```html
<button onclick="syncWithGitHub()" class="github-sync-button">
  Sync with GitHub
</button>
```

## Security Considerations

**Important**: The current implementation stores the Client Secret in the client-side code, which is NOT secure for production. Here's what you should do instead:

### Option 1: Use a Backend Server

1. Create a simple backend server (Node.js, Python, etc.) that:
   - Receives the authorization code from the frontend
   - Exchanges it for an access token using the Client Secret
   - Returns the access token to the frontend

2. Update `github-auth.js` to call your backend instead of GitHub directly

### Option 2: Use GitHub's PKCE Flow

For a more secure client-side only implementation, use PKCE (Proof Key for Code Exchange):

```javascript
// Generate code verifier and challenge
const codeVerifier = this.generateCodeVerifier();
const codeChallenge = await this.generateCodeChallenge(codeVerifier);

// Include in authorization URL
const authUrl = `${GITHUB_CONFIG.AUTH_URL}?client_id=${GITHUB_CONFIG.CLIENT_ID}&redirect_uri=${encodeURIComponent(GITHUB_CONFIG.REDIRECT_URI)}&scope=${GITHUB_CONFIG.SCOPE}&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
```

## How It Works

1. User clicks "Sync with GitHub"
2. Redirects to GitHub's authorization page
3. User authorizes the app
4. GitHub redirects back with an authorization code
5. Frontend exchanges code for access token
6. Uses access token to create/update a private Gist with player data
7. Player data is synced across all devices

## Data Storage

Player data is stored in a private GitHub Gist with the following structure:

```json
{
  "level": 5,
  "xp": 2500,
  "stats": {
    "gamesPlayed": 100,
    "wins": 60,
    "losses": 30,
    "draws": 10,
    "currentStreak": 5
  }
}
```

## Troubleshooting

### "Invalid callback URL" error
- Make sure the callback URL in your GitHub OAuth App settings matches exactly (including trailing slashes)

### "Failed to load move analysis script" error
- Check that `move-analysis.js` is in the correct directory
- Check browser console for additional error messages

### Data not syncing
- Check browser console for errors
- Verify GitHub access token is valid
- Check that gist ID is stored in localStorage

## Additional Resources

- GitHub OAuth Documentation: https://docs.github.com/en/developers/apps/building-oauth-apps
- GitHub Gist API: https://docs.github.com/en/rest/gists
- PKCE Flow: https://oauth.net/2/pkce/
