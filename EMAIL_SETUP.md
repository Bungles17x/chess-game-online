# Email Notification Setup Guide

## Problem
Reports are being submitted successfully but email notifications are not being sent to your phone.

## Solution

### Step 1: Install Nodemailer
If you haven't already, install nodemailer:
```bash
npm install nodemailer
```

### Step 2: Set Up Environment Variables
Create a `.env` file in your project root (or add to your existing one):

```env
EMAIL_USER=chessygames@yahoo.com
EMAIL_PASS=your_app_password_here
```

**Important:** For Yahoo Mail, you need to use an App Password, not your regular password:
1. Go to Yahoo Account Security
2. Enable "Two-Step Verification"
3. Generate an "App Password"
4. Use that app password in EMAIL_PASS

### Step 3: Apply the Email Notification Fix
Run the fix script:
```bash
node email-notification-fix.cjs
```

This will:
- Add nodemailer import to server.cjs
- Set up email transporter
- Add email notification to handleReport function

### Step 4: Restart Your Server
Stop and restart your server for changes to take effect:
```bash
# Stop the server (Ctrl+C)
# Then start it again
node server.cjs
```

### Step 5: Test the Email Notification
1. Submit a report from the game
2. Check your server console for:
   - "Email sent successfully:" message
   - Or "Error sending email:" message if something went wrong

## Troubleshooting

### If emails still aren't sending:

1. **Check Environment Variables:**
   ```bash
   # On Windows
   echo %EMAIL_USER%
   echo %EMAIL_PASS%

   # On Mac/Linux
   echo $EMAIL_USER
   echo $EMAIL_PASS
   ```

2. **Check Server Console:**
   - Look for "Error sending email:" messages
   - Check the error details

3. **Verify Yahoo Settings:**
   - Make sure Two-Step Verification is enabled
   - Make sure you're using an App Password
   - Check that the email address is correct

4. **Test Email Configuration:**
   Create a test file `test-email.cjs`:
   ```javascript
   const nodemailer = require('nodemailer');

   const transporter = nodemailer.createTransport({
     service: 'yahoo',
     auth: {
       user: process.env.EMAIL_USER || 'chessygames@yahoo.com',
       pass: process.env.EMAIL_PASS
     }
   });

   transporter.sendMail({
     from: process.env.EMAIL_USER || 'chessygames@yahoo.com',
     to: 'chessygames@yahoo.com',
     subject: 'Test Email',
     text: 'This is a test email from the chess game server'
   }, (error, info) => {
     if (error) {
       console.error('Error:', error);
     } else {
       console.log('Email sent:', info.response);
     }
   });
   ```

   Run it:
   ```bash
   node test-email.cjs
   ```

## What the Fix Does

The `email-notification-fix.cjs` script:

1. ✅ Adds nodemailer import to server.cjs
2. ✅ Creates email transporter configuration
3. ✅ Adds email notification to handleReport function
4. ✅ Sends detailed report information via email
5. ✅ Logs success/error messages for debugging

## Email Content

When a report is submitted, you'll receive an email with:
- Report ID
- Report type (cheating, harassment, etc.)
- Reporter's username
- Opponent's username
- Room ID
- Reason for report
- Description
- Timestamp

## Security Notes

⚠️ **Important Security Tips:**

1. **Never commit .env file** to version control
2. **Use App Passwords** instead of regular passwords
3. **Keep EMAIL_PASS secure** and don't share it
4. **Consider using .env.example** file as a template

## Support

If you encounter any issues:
1. Check server console for error messages
2. Verify environment variables are set correctly
3. Ensure nodemailer is installed
4. Make sure the server has been restarted after applying the fix
