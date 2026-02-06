# Chess Game Reporting System

## Overview

The reporting system allows players to report issues, cheating, or abuse during online games. When a report is submitted, the game replay is automatically saved, and you (the admin) receive notifications via SMS and phone call.

## Features

1. **Report Submission**: Players can report other players or game issues with detailed descriptions
2. **Game Replay Capture**: Automatically saves the complete game replay (PGN, move history, board state)
3. **Notification System**: Sends SMS and phone call notifications to admin when reports are submitted
4. **Report Management**: Admin interface to view, manage, and update report statuses
5. **Replay Viewing**: Ability to review game replays to investigate reports

## Setup Instructions

### 1. Install Dependencies

First, install the required Node.js packages:

```bash
npm install
```

The following packages are required:
- `chess.js`: Chess game logic
- `ws`: WebSocket server
- `twilio`: For SMS and phone call notifications
- `express`: HTTP server (optional, for future enhancements)
- `multer`: File upload handling (optional, for future enhancements)
- `uuid`: Unique ID generation
- `cors`: Cross-origin resource sharing (optional)

### 2. Configure Twilio

To enable SMS and phone call notifications, you need to set up a Twilio account:

1. Sign up at https://www.twilio.com/
2. Get your Account SID and Auth Token from the Twilio Console
3. Purchase a Twilio phone number or use your trial number
4. Create a `.env` file in your project root with the following content:

```env
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number
ADMIN_PHONE_NUMBER=your_personal_phone_number
```

Or update the configuration in `notification-system.js`:

```javascript
const TWILIO_CONFIG = {
  accountSid: 'YOUR_TWILIO_ACCOUNT_SID',
  authToken: 'YOUR_TWILIO_AUTH_TOKEN',
  phoneNumber: 'YOUR_TWILIO_PHONE_NUMBER',
  adminPhoneNumber: 'YOUR_ADMIN_PHONE_NUMBER'
};
```

### 3. Directory Structure

The system automatically creates the following directories:
- `reports/`: Stores all submitted reports
- `game-replays/`: Stores game replay data

## Usage

### For Players

1. Start an online game
2. Click the "Report Player" button in the menu
3. Fill out the report form:
   - Select report type (Cheating, Abuse, Bug, Other)
   - Enter a brief reason
   - Provide detailed description
4. Submit the report

### For Admins

1. Open the game and log in as an admin
2. Access the reports management interface
3. View all submitted reports with details
4. Watch game replays to investigate issues
5. Update report statuses (pending, investigating, resolved, dismissed)

## Report Types

- **Cheating**: Report suspicious gameplay or cheating behavior
- **Abuse**: Report abusive language or harassment
- **Bug**: Report game bugs or technical issues
- **Other**: Any other issues not covered by the above categories

## Report Status

- **pending**: New report, not yet reviewed
- **investigating**: Report is being investigated
- **resolved**: Issue has been resolved
- **dismissed**: Report was found to be invalid

## Notification Details

When a report is submitted, you will receive:

1. **SMS Notification**: Contains:
   - Report ID
   - Report type
   - Reporter username
   - Room ID
   - Brief reason

2. **Phone Call**: Automated call informing you of the new report

## Security Considerations

1. Keep your Twilio credentials secure and never commit them to version control
2. Use environment variables for sensitive configuration
3. Implement admin authentication for the reports management interface
4. Regularly review and archive old reports
5. Consider implementing rate limiting for report submissions

## Troubleshooting

### Notifications not working

1. Verify your Twilio credentials are correct
2. Check that your Twilio account has sufficient credits
3. Ensure your phone number is verified in Twilio (for trial accounts)
4. Check the server logs for error messages

### Reports not saving

1. Ensure the `reports/` and `game-replays/` directories exist
2. Check file system permissions
3. Review server logs for error messages

### Game replay not loading

1. Verify the replay file exists in the `game-replays/` directory
2. Check that the replay data is not corrupted
3. Ensure the chess.js library is properly loaded

## Future Enhancements

Potential improvements to consider:

1. Email notifications in addition to SMS/calls
2. Report categorization and filtering
3. Automated report analysis
4. Integration with user accounts for tracking
5. Report statistics and analytics dashboard
6. Ability to attach screenshots or other evidence
7. Multi-language support for reports
8. Report response system to notify reporters of outcomes

## Support

For issues or questions about the reporting system, please:
1. Check the server logs for error messages
2. Verify all dependencies are installed
3. Ensure Twilio configuration is correct
4. Test the WebSocket connection

## License

This reporting system is part of the Chess Game project and follows the same license.
