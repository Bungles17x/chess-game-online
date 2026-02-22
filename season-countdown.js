
// ============================================
// SEASON COUNTDOWN SYSTEM
// ============================================

// Season configuration
const SeasonConfig = {
  seasonDuration: 30, // days per season
  seasonStartDate: new Date('2024-01-01'), // First season start date
  currentSeason: 1
};

// Calculate current season and end date
function calculateSeasonInfo() {
  const now = new Date();
  const daysSinceStart = Math.floor((now - SeasonConfig.seasonStartDate) / (1000 * 60 * 60 * 24));
  const currentSeason = Math.floor(daysSinceStart / SeasonConfig.seasonDuration) + 1;
  const seasonStartDays = (currentSeason - 1) * SeasonConfig.seasonDuration;
  const seasonEndDate = new Date(SeasonConfig.seasonStartDate);
  seasonEndDate.setDate(seasonEndDate.getDate() + (currentSeason * SeasonConfig.seasonDuration));

  return {
    currentSeason,
    seasonEndDate,
    daysRemaining: Math.ceil((seasonEndDate - now) / (1000 * 60 * 60 * 24)),
    hoursRemaining: Math.ceil((seasonEndDate - now) / (1000 * 60 * 60)),
    minutesRemaining: Math.ceil((seasonEndDate - now) / (1000 * 60)),
    secondsRemaining: Math.ceil((seasonEndDate - now) / 1000)
  };
}

// Update season countdown display
function updateSeasonCountdown() {
  const seasonInfo = calculateSeasonInfo();

  // Update countdown elements
  const seasonNumber = document.getElementById('season-number');
  const daysElement = document.getElementById('season-days');
  const hoursElement = document.getElementById('season-hours');
  const minutesElement = document.getElementById('season-minutes');
  const secondsElement = document.getElementById('season-seconds');
  const progressBar = document.getElementById('season-progress-bar');

  if (seasonNumber) seasonNumber.textContent = `Season ${seasonInfo.currentSeason}`;
  if (daysElement) daysElement.textContent = seasonInfo.daysRemaining.toString().padStart(2, '0');
  if (hoursElement) hoursElement.textContent = (seasonInfo.hoursRemaining % 24).toString().padStart(2, '0');
  if (minutesElement) minutesElement.textContent = (seasonInfo.minutesRemaining % 60).toString().padStart(2, '0');
  if (secondsElement) secondsElement.textContent = (seasonInfo.secondsRemaining % 60).toString().padStart(2, '0');

  // Update progress bar
  if (progressBar) {
    const totalDays = SeasonConfig.seasonDuration;
    const daysPassed = totalDays - seasonInfo.daysRemaining;
    const progress = (daysPassed / totalDays) * 100;
    progressBar.style.width = `${progress}%`;
  }

  // Log for debugging
  console.log('[Season Countdown]', {
    season: seasonInfo.currentSeason,
    daysRemaining: seasonInfo.daysRemaining,
    hoursRemaining: seasonInfo.hoursRemaining % 24,
    minutesRemaining: seasonInfo.minutesRemaining % 60,
    secondsRemaining: seasonInfo.secondsRemaining % 60
  });
}

// Initialize season countdown
function initializeSeasonCountdown() {
  console.log('[Season Countdown] Initializing...');

  // Create season countdown element if it doesn't exist
  if (!document.getElementById('season-countdown')) {
    console.log('[Season Countdown] Season countdown element does not exist, creating...');
    const achievementsSection = document.getElementById('achievements-section');
    console.log('[Season Countdown] achievementsSection:', achievementsSection);
    if (achievementsSection) {
      const seasonHTML = `
        <div class="season-countdown-container" id="season-countdown">
          <h3 class="section-title">🏆 Season Progress</h3>
          <div class="season-info">
            <div class="season-number" id="season-number">Season 1</div>
            <div class="season-countdown">
              <div class="countdown-item">
                <span class="countdown-value" id="season-days">00</span>
                <span class="countdown-label">Days</span>
              </div>
              <span class="countdown-separator">:</span>
              <div class="countdown-item">
                <span class="countdown-value" id="season-hours">00</span>
                <span class="countdown-label">Hours</span>
              </div>
              <span class="countdown-separator">:</span>
              <div class="countdown-item">
                <span class="countdown-value" id="season-minutes">00</span>
                <span class="countdown-label">Minutes</span>
              </div>
              <span class="countdown-separator">:</span>
              <div class="countdown-item">
                <span class="countdown-value" id="season-seconds">00</span>
                <span class="countdown-label">Seconds</span>
              </div>
            </div>
            <div class="season-progress">
              <div class="progress-bar">
                <div class="progress-fill" id="season-progress-bar"></div>
              </div>
              <div class="progress-label">Season Progress</div>
            </div>
          </div>
        </div>
      `;

      // Insert after XP progress section
      const achievementsContent = document.getElementById('achievements-content');
      console.log('[Season Countdown] achievementsContent:', achievementsContent);
      console.log('[Season Countdown] achievementsContent.classList:', achievementsContent?.classList);
      if (achievementsContent) {
        const xpProgressSection = achievementsContent.querySelector('.xp-progress-section');
        console.log('[Season Countdown] xpProgressSection:', xpProgressSection);
        if (xpProgressSection) {
          xpProgressSection.insertAdjacentHTML('afterend', seasonHTML);
          console.log('[Season Countdown] Added countdown element after XP progress');
        } else {
          achievementsContent.insertAdjacentHTML('afterbegin', seasonHTML);
          console.log('[Season Countdown] Added countdown element at beginning');
        }
      } else {
        console.error('[Season Countdown] achievements-content element not found');
      }
    }
  }

  // Initial update
  updateSeasonCountdown();

  // Update every second
  setInterval(updateSeasonCountdown, 1000);

  console.log('[Season Countdown] Initialized successfully');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Wait for achievements content to be visible
    setTimeout(initializeSeasonCountdown, 2000);
  });
} else {
  // Wait for achievements content to be visible
  setTimeout(initializeSeasonCountdown, 2000);
}
