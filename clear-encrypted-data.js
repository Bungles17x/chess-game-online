// Clear encrypted data migration script
// Run this in browser console to clear old encrypted data

console.log('Starting encrypted data cleanup...');

// Clear all encrypted storage
const keys = Object.keys(localStorage);
let clearedCount = 0;

keys.forEach(key => {
  // Clear chessUsers which contains encrypted user data
  if (key === 'chessUsers') {
    localStorage.removeItem(key);
    clearedCount++;
    console.log(`Cleared: ${key}`);
  }
});

// Clear currentUser as well
if (localStorage.getItem('currentUser')) {
  localStorage.removeItem('currentUser');
  clearedCount++;
  console.log('Cleared: currentUser');
}

console.log(`\nCleared ${clearedCount} item(s)`);
console.log('Please re-register your account with the new encryption system.');
console.log('After registration, you will be able to log in normally.');
