// Encryption utility for securing sensitive data in localStorage

// Simple encryption using XOR with a key (for demonstration purposes)
// In production, use proper encryption libraries like crypto-js

const ENCRYPTION_KEY = 'chess-game-secure-key-2026';

// Encrypt data
function encrypt(data) {
  try {
    const dataStr = JSON.stringify(data);
    let encrypted = '';
    for (let i = 0; i < dataStr.length; i++) {
      encrypted += String.fromCharCode(
        dataStr.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
      );
    }
    // Convert to base64 for safe storage
    return btoa(encrypted);
  } catch (error) {
    console.error('Encryption error:', error);
    return null;
  }
}

// Decrypt data
function decrypt(encryptedData) {
  try {
    // Decode from base64
    const encrypted = atob(encryptedData);
    let decrypted = '';
    for (let i = 0; i < encrypted.length; i++) {
      decrypted += String.fromCharCode(
        encrypted.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
      );
    }
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
}

// Secure localStorage wrapper
const secureStorage = {
  // Store data with encryption
  setItem: function(key, data) {
    const encrypted = encrypt(data);
    if (encrypted) {
      localStorage.setItem(key, encrypted);
      return true;
    }
    return false;
  },

  // Retrieve and decrypt data
  getItem: function(key) {
    const encrypted = localStorage.getItem(key);
    if (encrypted) {
      return decrypt(encrypted);
    }
    return null;
  },

  // Remove item
  removeItem: function(key) {
    localStorage.removeItem(key);
  }
};
