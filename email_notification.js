// This is the email notification code to add to your handleReport function

// Add this code after line 721 in server.cjs (after console.log("Report created:", reportId, reportData);)

    // Send email notification
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: 'chessygames@yahoo.com',
      subject: `New Report: ${reportData.reportType} - ${reportData.reportedBy} vs ${reportData.opponent}`,
      text: `Report ID: ${reportId}
Type: ${reportData.reportType}
Reported by: ${reportData.reportedBy}
Opponent: ${reportData.opponent}
Room ID: ${reportData.roomId}
Reason: ${reportData.reason}
Description: ${reportData.description}
Timestamp: ${reportData.timestamp}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error("Error sending email:", error);
      } else {
        console.log("Email sent:", info.response);
      }
    });
