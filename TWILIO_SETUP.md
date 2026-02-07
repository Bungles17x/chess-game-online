# Twilio Setup Instructions

This chess game uses Twilio for phone call notifications when reports are submitted.

## Local Development

1. Create a `twilio.env` file in the project root (already created)
2. Add your Twilio credentials:
   ```
   TWILIO_ACCOUNT_SID=your_account_sid_here
   TWILIO_AUTH_TOKEN=your_auth_token_here
   TWILIO_PHONE_NUMBER=+1234567890
   ADMIN_PHONE_NUMBER=+8143862290
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the server:
   ```bash
   npm start
   ```

## Production (Render)

1. Go to your Render dashboard
2. Click on your service
3. Click on the "Environment" tab
4. Add these environment variables:
   - `TWILIO_ACCOUNT_SID`: Your Twilio Account SID
   - `TWILIO_AUTH_TOKEN`: Your Twilio Auth Token
   - `TWILIO_PHONE_NUMBER`: Your Twilio phone number
   - `ADMIN_PHONE_NUMBER`: +8143862290

5. Deploy your service

## Getting Twilio Credentials

1. Go to https://www.twilio.com/ and sign up for a free account
2. Verify your phone number
3. Get your Account SID and Auth Token from the dashboard
4. Get a Twilio phone number (they provide one for free)

## Security

⚠️ **Important**: Never commit your `twilio.env` file to a public repository. It's already added to `.gitignore` to prevent this.
