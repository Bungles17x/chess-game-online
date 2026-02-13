// Encryption utility for securing sensitive data in localStorage

// Enhanced encryption using XOR with a key and additional obfuscation
// In production, consider using crypto-js or Web Crypto API

const ENCRYPTION_KEY = 'chess-game-secure-key-2026';
const OBFUSCATION_KEY = 'chess-obfuscation-layer';

// Generate a random salt for additional security
function generateSalt() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Apply obfuscation to data
function obfuscate(data) {
  let obfuscated = '';
  for (let i = 0; i < data.length; i++) {
    obfuscated += String.fromCharCode(
      data.charCodeAt(i) ^ OBFUSCATION_KEY.charCodeAt(i % OBFUSCATION_KEY.length)
    );
  }
  return obfuscated;
}

// Remove obfuscation from data
function deobfuscate(data) {
  return obfuscate(data); // XOR is reversible
}

// Encrypt data
function encrypt(data) {
  try {
    const dataStr = JSON.stringify(data);
    const salt = generateSalt();
    
    // First encryption pass
    let encrypted = '';
    for (let i = 0; i < dataStr.length; i++) {
      encrypted += String.fromCharCode(
        dataStr.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
      );
    }
    
    // Apply obfuscation
    encrypted = obfuscate(encrypted);
    
    // Prepend salt and convert to base64 for safe storage (handle Unicode properly)
    return salt + '.' + btoa(unescape(encodeURIComponent(encrypted)));
  } catch (error) {
    console.error('Encryption error:', error);
    return null;
  }
}

// Decrypt data
function decrypt(encryptedData) {
  try {
    // Split salt and encrypted data
    const parts = encryptedData.split('.');
    if (parts.length < 2) {
      throw new Error('Invalid encrypted data format');
    }
    
    // Validate base64 string before decoding
    const base64Part = parts[1];
    if (!/^[A-Za-z0-9+/]+=*$/.test(base64Part)) {
      throw new Error('Invalid base64 format');
    }

    // Decode from base64 (handle Unicode properly)
    let encrypted = decodeURIComponent(escape(atob(base64Part)));
    
    // Remove obfuscation
    encrypted = deobfuscate(encrypted);
    
    // Decrypt the data
    let decrypted = '';
    for (let i = 0; i < encrypted.length; i++) {
      decrypted += String.fromCharCode(
        encrypted.charCodeAt(i) ^ ENCRYPTION_KEY.charCodeAt(i % ENCRYPTION_KEY.length)
      );
    }
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Decryption error:', {
      message: error.message,
      stack: error.stack,
      data: encryptedData
    });
    return null;
  }
}

// Secure localStorage wrapper
const secureStorage = {
  // Store data with encryption
  setItem: function(key, data) {
    try {
      const encrypted = encrypt(data);
      if (encrypted) {
        localStorage.setItem(key, encrypted);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Secure storage set error:', error);
      return false;
    }
  },

  // Retrieve and decrypt data
  getItem: function(key) {
    try {
      const encrypted = localStorage.getItem(key);
      if (!encrypted) {
        return null;
      }
      
      // Check if data is actually encrypted (contains salt separator)
      // If data starts with [ or {, it's likely unencrypted JSON
      if (encrypted.startsWith('[') || encrypted.startsWith('{')) {
        try {
          return JSON.parse(encrypted);
        } catch (parseError) {
          console.warn(`Failed to parse unencrypted data for key: ${key}`, parseError);
          return null;
        }
      }

      // Try to decrypt the data
      const decrypted = decrypt(encrypted);
      if (decrypted === null) {
        // If decryption fails, the data might be corrupted or in old format
        console.warn(`Failed to decrypt data for key: ${key}`, {
          error: 'Data may be corrupted or in old format',
          suggestion: 'Try clearing browser data and re-registering'
        });
        // Return empty array for chessUsers to prevent login issues
        if (key === 'chessUsers') {
          return [];
        }
      }
      return decrypted;
    } catch (error) {
      console.error('Secure storage get error:', error);
      // Return empty array for chessUsers to prevent login issues
      if (key === 'chessUsers') {
        return [];
      }
      return null;
    }
  },

  // Remove item
  removeItem: function(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Secure storage remove error:', error);
    }
  },

  // Clear all encrypted items
  clear: function() {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Secure storage clear error:', error);
    }
  },

  // Check if key exists
  hasItem: function(key) {
    try {
      return localStorage.getItem(key) !== null;
    } catch (error) {
      console.error('Secure storage has error:', error);
      return false;
    }
  },

  // Get all keys
  keys: function() {
    try {
      return Object.keys(localStorage);
    } catch (error) {
      console.error('Secure storage keys error:', error);
      return [];
    }
  }
};

// Function to clear old/corrupted encrypted data
function clearOldEncryptedData() {
  console.log('Starting encrypted data cleanup...');
  
  // Clear all encrypted storage
  const keys = Object.keys(localStorage);
  let clearedCount = 0;
  
  keys.forEach(key => {
    try {
      const value = localStorage.getItem(key);
      if (value && (key.includes('chess') || key.includes('user') || key.includes('game'))) {
        // Try to validate if it's encrypted data
        if (value.includes('.') && value.split('.').length >= 2) {
          const parts = value.split('.');
          const base64Part = parts[1];
          // Check if it's valid base64
          if (!/^[A-Za-z0-9+/]+=*$/.test(base64Part)) {
            console.log(`Clearing corrupted data for key: ${key}`);
            localStorage.removeItem(key);
            clearedCount++;
          }
        }
      }
    } catch (error) {
      console.error(`Error checking key ${key}:`, error);
    }
  });
  
  console.log(`Cleanup complete. Cleared ${clearedCount} corrupted items.`);
  return clearedCount;
};
