// TTS (Text-to-Speech) System
// Enhanced text-to-speech functionality for accessibility

// ============================================
// TTS STATE
// ============================================

let ttsEnabled = false;
let speechSynthesis = window.speechSynthesis;
let currentUtterance = null;
let ttsVoice = null;
let ttsRate = 1.0;
let ttsPitch = 1.0;
let ttsVolume = 1.0;

// ============================================
// TTS INITIALIZATION
// ============================================

function initTTS() {
  // Check if speech synthesis is supported
  if (!('speechSynthesis' in window)) {
    console.warn('[TTS] Speech synthesis not supported');
    return false;
  }

  // Get saved preferences (synced with screen reader)
  ttsEnabled = localStorage.getItem('screenReaderMode') === 'true';
  ttsRate = parseFloat(localStorage.getItem('ttsRate') || '1.0');
  ttsPitch = parseFloat(localStorage.getItem('ttsPitch') || '1.0');
  ttsVolume = parseFloat(localStorage.getItem('ttsVolume') || '1.0');

  // Load voices when available
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadVoices;
  }

  // Load voices immediately if available
  loadVoices();

  // Apply initial state
  if (ttsEnabled) {
    enableTTS();
  }

  console.log('[TTS] Initialized', { 
    enabled: ttsEnabled,
    rate: ttsRate,
    pitch: ttsPitch,
    volume: ttsVolume
  });

  return true;
}

// Load available voices
function loadVoices() {
  const voices = speechSynthesis.getVoices();

  if (voices.length === 0) {
    console.warn('[TTS] No voices available');
    return;
  }

  // Try to find a good English voice
  ttsVoice = voices.find(voice => 
    voice.lang.startsWith('en') && voice.name.includes('Google')
  ) || voices.find(voice => 
    voice.lang.startsWith('en-US')
  ) || voices.find(voice => 
    voice.lang.startsWith('en')
  ) || voices[0];

  console.log('[TTS] Voice selected:', ttsVoice ? ttsVoice.name : 'Default');
}

// ============================================
// TTS TOGGLE
// ============================================

// Enable TTS
function enableTTS() {
  ttsEnabled = true;
  localStorage.setItem('screenReaderMode', 'true');
  console.log('[TTS] Enabled');

  // Announce to screen reader
  if (typeof announce === 'function') {
    announce('Text-to-speech enabled');
  }

  // Speak confirmation
  speak('Text to speech enabled');
}

// Disable TTS
function disableTTS() {
  ttsEnabled = false;
  localStorage.setItem('screenReaderMode', 'false');
  stopSpeaking();
  console.log('[TTS] Disabled');

  // Announce to screen reader
  if (typeof announce === 'function') {
    announce('Text-to-speech disabled');
  }
}

// ============================================
// TTS SPEAKING
// ============================================

function speak(text, options = {}) {
  if (!ttsEnabled || !text) return;

  // Stop any current speech
  stopSpeaking();

  // Create new utterance
  const utterance = new SpeechSynthesisUtterance(text);

  // Apply settings
  utterance.voice = options.voice || ttsVoice;
  utterance.rate = options.rate || ttsRate;
  utterance.pitch = options.pitch || ttsPitch;
  utterance.volume = options.volume || ttsVolume;

  // Handle events
  utterance.onstart = () => {
    console.log('[TTS] Speaking:', text);
  };

  utterance.onend = () => {
    console.log('[TTS] Finished speaking');
    currentUtterance = null;
  };

  utterance.onerror = (event) => {
    // Ignore interruption errors - they're normal when stopping speech
    if (event.error !== 'interrupted' && event.error !== 'canceled') {
      console.error('[TTS] Error:', event.error);
    }
    currentUtterance = null;
  };

  // Store and speak
  currentUtterance = utterance;
  speechSynthesis.speak(utterance);
}

function stopSpeaking() {
  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
    currentUtterance = null;
    console.log('[TTS] Stopped speaking');
  }
}

// ============================================
// TTS SETTINGS
// ============================================

function setTTSRate(rate) {
  ttsRate = Math.max(0.5, Math.min(2.0, rate));
  localStorage.setItem('ttsRate', ttsRate.toString());
  console.log('[TTS] Rate set to:', ttsRate);
}

function setTTSPitch(pitch) {
  ttsPitch = Math.max(0.5, Math.min(2.0, pitch));
  localStorage.setItem('ttsPitch', ttsPitch.toString());
  console.log('[TTS] Pitch set to:', ttsPitch);
}

function setTTSVolume(volume) {
  ttsVolume = Math.max(0.0, Math.min(1.0, volume));
  localStorage.setItem('ttsVolume', ttsVolume.toString());
  console.log('[TTS] Volume set to:', ttsVolume);
}

function setTTSVoice(voice) {
  ttsVoice = voice;
  console.log('[TTS] Voice set to:', voice ? voice.name : 'Default');
}

// ============================================
// CHESS-SPECIFIC TTS
// ============================================

function speakMove(move) {
  if (!ttsEnabled || !move) return;

  let message = '';

  // Build move announcement
  if (move.captured) {
    message = `${move.piece} captures ${move.captured}`;
  } else {
    message = `${move.piece} to ${move.to}`;
  }

  // Add special moves
  if (move.flags.includes('k') || move.flags.includes('q')) {
    message += ', castling';
  }

  if (move.flags.includes('p')) {
    message += ', promoted to queen';
  }

  // Add check status
  if (move.san.includes('+')) {
    message += ', check';
  }

  if (move.san.includes('#')) {
    message += ', checkmate';
  }

  speak(message);
}

function speakGameStatus() {
  if (!ttsEnabled) return;

  let message = '';

  if (game.in_checkmate()) {
    const winner = game.turn() === 'w' ? 'Black' : 'White';
    message = `Checkmate! ${winner} wins`;
  } else if (game.in_stalemate()) {
    message = 'Stalemate. The game is a draw';
  } else if (game.in_draw()) {
    message = 'Draw';
  } else if (game.in_check()) {
    message = 'Check';
  } else {
    message = `${game.turn() === 'w' ? 'White' : 'Black'} to move`;
  }

  speak(message);
}

function speakPieceSelected(square, piece) {
  if (!ttsEnabled || !piece) return;

  const pieceNames = {
    'p': 'pawn',
    'n': 'knight',
    'b': 'bishop',
    'r': 'rook',
    'q': 'queen',
    'k': 'king'
  };

  const pieceName = pieceNames[piece.type] || piece.type;
  const color = piece.color === 'w' ? 'White' : 'Black';

  speak(`${color} ${pieceName} at ${square}`);
}

// ============================================
// INITIALIZATION
// ============================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTTS);
} else {
  initTTS();
}

// Export functions
window.ttsSystem = {
  speak,
  stopSpeaking,
  enableTTS,
  disableTTS,
  setTTSRate,
  setTTSPitch,
  setTTSVolume,
  setTTSVoice,
  speakMove,
  speakGameStatus,
  speakPieceSelected
};
