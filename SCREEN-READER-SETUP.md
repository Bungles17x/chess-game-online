# Screen Reader Setup Instructions

## Files Created

1. **screen-reader-simple.js** - Simple, working screen reader enhancement
2. **screen-reader-enhancements.js** - Full-featured screen reader system

## How to Add Screen Reader Functionality

### Option 1: Quick Setup (Recommended)

1. Open `index.html` in a text editor
2. Find the closing `</body>` tag near the end of the file
3. Add this line BEFORE `</body>`:

```html
<script src="screen-reader-simple.js"></script>
```

4. Save the file
5. Refresh your browser

### Option 2: Manual Integration

If you want to add the screen reader functionality to your existing code:

1. Copy the contents of `screen-reader-simple.js`
2. Paste it into your main JavaScript file (e.g., `script.js` or `game-enhancements.js`)
3. Make sure it runs after the DOM is loaded

## Testing

1. Open the Settings page
2. Look for "Screen Reader Mode" toggle in the Game Settings section
3. Toggle it on
4. Use a screen reader (NVDA, JAWS, VoiceOver) to test

## What It Does

When enabled:
- Adds ARIA labels to all chessboard squares (a1-h8)
- Creates a live region for announcements
- Announces mode changes
- Provides proper grid structure for navigation

## Browser Support

Works with all modern browsers and major screen readers:
- NVDA (Windows)
- JAWS (Windows)
- VoiceOver (Mac/iOS)
- TalkBack (Android)
- ChromeVox (Chrome OS)

## Troubleshooting

If it doesn't work:
1. Check browser console for errors (F12)
2. Ensure the script is loaded (check Network tab)
3. Verify the toggle exists in settings
4. Make sure localStorage is enabled

## Customization

You can customize announcements by modifying the `announce()` function in `screen-reader-simple.js`.
