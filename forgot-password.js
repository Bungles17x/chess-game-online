// Forgot Password JavaScript

// Load encryption utility
const encryptionScript = document.createElement('script');
encryptionScript.src = 'encryption.js';
document.head.appendChild(encryptionScript);

// State management
let currentStep = 1;
let userEmail = '';
let userPhone = '';
let verificationCode = '';
let countdownInterval = null;
let canResend = false;


// DOM Elements
const emailForm = document.getElementById('email-form');
const phoneForm = document.getElementById('phone-form');
const verifyForm = document.getElementById('verify-form');
const resetForm = document.getElementById('reset-form');
const countdownElement = document.getElementById('countdown');
const resendLink = document.getElementById('resend-link');
const codeInputs = document.querySelectorAll('.code-input');


// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupEmailForm();
  setupPhoneForm();
  setupVerifyForm();
  setupResetForm();
  setupCodeInputs();
});

// Setup email form
function setupEmailForm() {
  if (!emailForm) return;

  emailForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();

    // Validate email
    if (!email || !validateEmail(email)) {
      showError('Please enter a valid email address');
      return;
    }

    // Check if user exists
    const users = secureStorage.getItem('chessUsers') || [];
    const user = users.find(u => u.email === email);

    if (!user) {
      showError('No account found with this email address');
      return;
    }

    // Store email and proceed to next step
    userEmail = email;
    goToStep(2);
  });
}

// Setup phone form
function setupPhoneForm() {
  if (!phoneForm) return;

  phoneForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const phone = document.getElementById('phone').value.trim();

    // Validate phone number
    if (!phone || phone.length < 10) {
      showError('Please enter a valid phone number');
      return;
    }

    // Check if phone matches user's phone (if stored)
    const users = JSON.parse(localStorage.getItem('chessUsers') || '[]');
    const user = users.find(u => u.email === userEmail);

    if (user && user.phone && user.phone !== phone) {
      showError('Phone number does not match our records');
      return;
    }

    // Store phone and generate verification code
    userPhone = phone;
    verificationCode = generateVerificationCode();

    // Store verification code temporarily
    localStorage.setItem('resetEmail', userEmail);
    localStorage.setItem('resetPhone', userPhone);
    localStorage.setItem('resetVerificationCode', verificationCode);
    localStorage.setItem('resetCodeTimestamp', Date.now().toString());

    // Track password reset request for admin monitoring
    trackPasswordResetRequest(userEmail, userPhone, verificationCode);

    // Show call instructions instead of simulating a call
    alert(`Please call +1 (814) 389-0277 to receive your verification code. When prompted, enter your phone number ending in ${userPhone.slice(-4)}. Your code is ready and will be read to you when you call.`);

    // Proceed to verification step
    goToStep(3);
  });
}

// Setup verify form
function setupVerifyForm() {
  if (!verifyForm) return;

  verifyForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // Get entered code
    const enteredCode = Array.from(codeInputs).map(input => input.value).join('');

    // Validate code
    if (enteredCode.length !== 6) {
      showError('Please enter the complete 6-digit code');
      return;
    }

    // Check if code matches
    const storedCode = localStorage.getItem('resetVerificationCode');
    if (enteredCode !== storedCode) {
      showError('Invalid verification code');
      return;
    }

    // Code verified, proceed to reset password
    goToStep(4);
  });
}

// Setup reset form
function setupResetForm() {
  if (!resetForm) return;

  resetForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // Validate passwords
    if (!newPassword || newPassword.length < 6) {
      showError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      showError('Passwords do not match');
      return;
    }

    // Update user password
    const users = JSON.parse(localStorage.getItem('chessUsers') || '[]');
    const userIndex = users.findIndex(u => u.email === userEmail);

    if (userIndex !== -1) {
      users[userIndex].password = newPassword;
      secureStorage.setItem('chessUsers', users);
    }

    // Clear reset data
    localStorage.removeItem('resetVerificationCode');
    localStorage.removeItem('resetEmail');
    localStorage.removeItem('resetPhone');
    localStorage.removeItem('resetCodeTimestamp');

    // Mark password reset request as completed
    markPasswordResetAsCompleted(userEmail);

    // Show success message and redirect
    alert('Password reset successful! You can now login with your new password.');
    window.location.href = 'login.html';
  });
}

// Setup code inputs
function setupCodeInputs() {
  codeInputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
      const value = e.target.value;

      // Only allow numbers
      if (!/\d/.test(value)) {
        e.target.value = '';
        return;
      }

      // Move to next input
      if (value && index < codeInputs.length - 1) {
        codeInputs[index + 1].focus();
      }
    });

    input.addEventListener('keydown', (e) => {
      // Move to previous input on backspace
      if (e.key === 'Backspace' && !e.target.value && index > 0) {
        codeInputs[index - 1].focus();
      }
    });

    // Handle paste
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pastedData = e.clipboardData.getData('text');
      const digits = pastedData.replace(/\D/g, '').slice(0, 6);

      digits.split('').forEach((digit, i) => {
        if (codeInputs[i]) {
          codeInputs[i].value = digit;
        }
      });

      // Focus the last filled input or the next empty one
      const lastFilledIndex = Math.min(digits.length, codeInputs.length) - 1;
      if (codeInputs[lastFilledIndex]) {
        codeInputs[lastFilledIndex].focus();
      }
    });
  });

  // Setup resend link
  if (resendLink) {
    resendLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (canResend) {
        resendCode();
      }
    });
  }
}

// Generate 6-digit verification code
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Track password reset request for admin monitoring
function trackPasswordResetRequest(email, phone, code) {
  try {
    // Get existing password reset requests
    const requests = JSON.parse(localStorage.getItem('passwordResetRequests') || '[]');
    
    // Get user info
    const users = JSON.parse(localStorage.getItem('chessUsers') || '[]');
    const user = users.find(u => u.email === email);
    
    // Create new request
    const newRequest = {
      id: Date.now(),
      username: user ? user.username : 'Unknown',
      email: email,
      phone: phone,
      verificationCode: code,
      status: 'pending',
      timestamp: Date.now()
    };
    
    // Add to requests (limit to last 100 requests)
    requests.unshift(newRequest);
    if (requests.length > 100) {
      requests.pop();
    }
    
    // Save to localStorage
    localStorage.setItem('passwordResetRequests', JSON.stringify(requests));
    
    console.log('Password reset request tracked:', newRequest);
  } catch (error) {
    console.error('Error tracking password reset request:', error);
  }
}

// Start countdown timer
function startCountdown() {
  let timeLeft = 120; // 2 minutes in seconds
  canResend = false;
  resendLink.classList.add('disabled');

  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  updateCountdownDisplay(timeLeft);

  countdownInterval = setInterval(() => {
    timeLeft--;
    updateCountdownDisplay(timeLeft);

    if (timeLeft <= 0) {
      clearInterval(countdownInterval);
      canResend = true;
      resendLink.classList.remove('disabled');
      countdownElement.textContent = '0:00';
    }
  }, 1000);
}

// Update countdown display
function updateCountdownDisplay(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  countdownElement.textContent = `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Resend verification code
function resendCode() {
  verificationCode = generateVerificationCode();

  // Simulate sending verification call
  console.log('New Verification Code:', verificationCode);
  alert(`SIMULATION: Your new verification code is ${verificationCode}. In production, you would receive a call with this code.`);

  // Update stored code
  localStorage.setItem('resetVerificationCode', verificationCode);
  localStorage.setItem('resetCodeTimestamp', Date.now().toString());

  // Clear code inputs
  codeInputs.forEach(input => input.value = '');
  codeInputs[0].focus();

  // Restart countdown
  startCountdown();
}

// Navigate to specific step
function goToStep(step) {
  // Hide all steps
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));

  // Show target step
  document.getElementById(`step${step}`).classList.add('active');

  // Update progress indicators
  for (let i = 1; i <= 4; i++) {
    const indicator = document.getElementById(`step${i}-indicator`);
    if (i < step) {
      indicator.classList.add('completed');
      indicator.classList.remove('active');
    } else if (i === step) {
      indicator.classList.add('active');
      indicator.classList.remove('completed');
    } else {
      indicator.classList.remove('active', 'completed');
    }
  }

  currentStep = step;
}

// Validate email format
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Mark password reset request as completed
function markPasswordResetAsCompleted(email) {
  try {
    const requests = JSON.parse(localStorage.getItem('passwordResetRequests') || '[]');
    const request = requests.find(r => r.email === email);
    
    if (request) {
      request.status = 'completed';
      request.completedAt = Date.now();
      localStorage.setItem('passwordResetRequests', JSON.stringify(requests));
      console.log('Password reset marked as completed:', request);
    }
  } catch (error) {
    console.error('Error marking password reset as completed:', error);
  }
}

// Show error message
function showError(message) {
  alert(message);
}
