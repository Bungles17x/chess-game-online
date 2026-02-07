// Show ban popup
function showBanPopup(banData) {
  // Create popup element
  const popup = document.createElement('div');
  popup.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 40px;
    border-radius: 10px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    text-align: center;
    z-index: 10000;
    max-width: 500px;
  `;

  // Calculate expiry time based on unit
  let expiryTime;
  if (banData.unit === 'hours') {
    expiryTime = banData.timestamp + (banData.duration * 60 * 60 * 1000);
  } else if (banData.unit === 'days') {
    expiryTime = banData.timestamp + (banData.duration * 24 * 60 * 60 * 1000);
  } else {
    expiryTime = banData.timestamp + (banData.duration * 24 * 60 * 60 * 1000); // default to days
  }

  const expiryText = banData.duration
    ? `Ban Duration: ${banData.duration} ${banData.unit}\nExpires: ${new Date(expiryTime).toLocaleString()}`
    : 'Permanent ban';

  popup.innerHTML = `
    <h2 style="margin-top: 0; font-size: 28px;">⚠️ Account Banned</h2>
    <p style="font-size: 16px; margin: 20px 0;">${banData.reason}</p>
    <p style="font-size: 14px; opacity: 0.9;">Reason: ${banData.activities}</p>
    <p style="font-size: 14px; opacity: 0.9;">${expiryText}</p>
    <button onclick="location.reload()" style="
      margin-top: 20px;
      padding: 12px 30px;
      background: white;
      color: #667eea;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 16px;
      font-weight: bold;
    ">OK</button>
  `;

  // Add overlay
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    z-index: 9999;
  `;

  // Add to page
  overlay.appendChild(popup);
  document.body.appendChild(overlay);
}
