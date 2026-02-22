// TTS Settings Controls
// Handles TTS controls in the settings page

// Setup TTS Controls
function setupTTSControls() {
  const ttsToggle = document.getElementById('tts-toggle');
  const ttsRate = document.getElementById('tts-rate');
  const ttsRateValue = document.getElementById('tts-rate-value');
  const ttsPitch = document.getElementById('tts-pitch');
  const ttsPitchValue = document.getElementById('tts-pitch-value');
  const ttsVolume = document.getElementById('tts-volume');
  const ttsVolumeValue = document.getElementById('tts-volume-value');
  const ttsVoice = document.getElementById('tts-voice');

  // Load saved TTS settings
  if (window.ttsSystem) {
    // Set toggle state
    if (ttsToggle) {
      ttsToggle.checked = window.ttsSystem.ttsEnabled || false;
    }

    // Set rate
    if (ttsRate && ttsRateValue) {
      ttsRate.value = window.ttsSystem.ttsRate || 1.0;
      ttsRateValue.textContent = `${ttsRate.value}x`;
    }

    // Set pitch
    if (ttsPitch && ttsPitchValue) {
      ttsPitch.value = window.ttsSystem.ttsPitch || 1.0;
      ttsPitchValue.textContent = ttsPitch.value;
    }

    // Set volume
    if (ttsVolume && ttsVolumeValue) {
      ttsVolume.value = window.ttsSystem.ttsVolume || 1.0;
      ttsVolumeValue.textContent = `${Math.round(ttsVolume.value * 100)}%`;
    }

    // Load voices
    if (ttsVoice && window.speechSynthesis) {
      const voices = window.speechSynthesis.getVoices();
      voices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.name;
        option.textContent = `${voice.name} (${voice.lang})`;
        if (window.ttsSystem.ttsVoice && window.ttsSystem.ttsVoice.name === voice.name) {
          option.selected = true;
        }
        ttsVoice.appendChild(option);
      });
    }
  }

  // Setup event listeners
  if (ttsToggle) {
    ttsToggle.addEventListener('change', function() {
      if (window.ttsSystem) {
        if (this.checked) {
          window.ttsSystem.enableTTS();
        } else {
          window.ttsSystem.disableTTS();
        }
      }
    });
  }

  if (ttsRate && ttsRateValue) {
    ttsRate.addEventListener('input', function() {
      ttsRateValue.textContent = `${this.value}x`;
      if (window.ttsSystem) {
        window.ttsSystem.setTTSRate(parseFloat(this.value));
      }
    });
  }

  if (ttsPitch && ttsPitchValue) {
    ttsPitch.addEventListener('input', function() {
      ttsPitchValue.textContent = this.value;
      if (window.ttsSystem) {
        window.ttsSystem.setTTSPitch(parseFloat(this.value));
      }
    });
  }

  if (ttsVolume && ttsVolumeValue) {
    ttsVolume.addEventListener('input', function() {
      ttsVolumeValue.textContent = `${Math.round(this.value * 100)}%`;
      if (window.ttsSystem) {
        window.ttsSystem.setTTSVolume(parseFloat(this.value));
      }
    });
  }

  if (ttsVoice && window.speechSynthesis) {
    ttsVoice.addEventListener('change', function() {
      if (window.ttsSystem) {
        const voices = window.speechSynthesis.getVoices();
        const selectedVoice = voices.find(v => v.name === this.value);
        if (selectedVoice) {
          window.ttsSystem.setTTSVoice(selectedVoice);
        }
      }
    });

    // Update voices when they change
    window.speechSynthesis.onvoiceschanged = function() {
      const voices = window.speechSynthesis.getVoices();
      ttsVoice.innerHTML = '<option value="">Default Voice</option>';
      voices.forEach(voice => {
        const option = document.createElement('option');
        option.value = voice.name;
        option.textContent = `${voice.name} (${voice.lang})`;
        if (window.ttsSystem.ttsVoice && window.ttsSystem.ttsVoice.name === voice.name) {
          option.selected = true;
        }
        ttsVoice.appendChild(option);
      });
    };
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupTTSControls);
} else {
  setupTTSControls();
}

// Export function
window.setupTTSControls = setupTTSControls;
