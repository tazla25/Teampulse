// TeamPulse Extension Popup Controller

let timerInterval = null;

// Initialize Popup
document.addEventListener('DOMContentLoaded', async () => {
  await loadStats();
  await checkActiveFocusSession();
  setupEventListeners();
});

// Setup UI event listeners
function setupEventListeners() {
  // Focus preset selection
  const presets = document.querySelectorAll('.preset-btn');
  presets.forEach(btn => {
    btn.addEventListener('click', () => {
      presets.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Start focus session
  document.getElementById('start-btn').addEventListener('click', startFocusSession);

  // Stop focus session
  document.getElementById('stop-btn').addEventListener('click', stopFocusSession);
}

// Format seconds into readable duration (e.g., "12m" or "45s")
function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.round(seconds / 60)}m`;
}

// Load and render stats from local storage
async function loadStats() {
  const todayStr = new Date().toISOString().split('T')[0];
  const storage = await chrome.storage.local.get(['tp_today_stats']);
  const stats = storage.tp_today_stats;

  if (!stats || stats.date !== todayStr) {
    renderEmptyStats();
    return;
  }

  const productive = stats.productive || 0;
  const neutral = stats.neutral || 0;
  const distracting = stats.distracting || 0;
  const total = productive + neutral + distracting;

  if (total === 0) {
    renderEmptyStats();
    return;
  }

  // Calculate Productivity Score
  // Formula: Productive minutes count for 100%, neutral for 50%, distracting for 0%
  const score = Math.round(((productive + (neutral * 0.5)) / total) * 100);

  // Update score elements
  const scoreCircle = document.getElementById('score-circle');
  const scoreText = document.getElementById('score-text');
  scoreText.textContent = score;
  scoreCircle.setAttribute('stroke-dasharray', `${score}, 100`);

  // Update progress bars
  const pPct = (productive / total) * 100;
  const nPct = (neutral / total) * 100;
  const dPct = (distracting / total) * 100;

  document.getElementById('bar-productive').style.width = `${pPct}%`;
  document.getElementById('bar-neutral').style.width = `${nPct}%`;
  document.getElementById('bar-distracting').style.width = `${dPct}%`;

  // Update text labels
  document.getElementById('txt-productive').textContent = formatDuration(productive);
  document.getElementById('txt-neutral').textContent = formatDuration(neutral);
  document.getElementById('txt-distracting').textContent = formatDuration(distracting);

  // Render Top Sites
  renderTopDomains(stats.domains);
}

// Render empty states
function renderEmptyStats() {
  document.getElementById('score-text').textContent = '0';
  document.getElementById('score-circle').setAttribute('stroke-dasharray', '0, 100');
  document.getElementById('bar-productive').style.width = '0%';
  document.getElementById('bar-neutral').style.width = '0%';
  document.getElementById('bar-distracting').style.width = '0%';
  
  document.getElementById('txt-productive').textContent = '0m';
  document.getElementById('txt-neutral').textContent = '0m';
  document.getElementById('txt-distracting').textContent = '0m';
}

// Helper: Determine category of domain
// Keep in sync with background.js defaults
const DEFAULT_DOMAINS = {
  'github.com': 'productive', 'gitlab.com': 'productive', 'stackoverflow.com': 'productive',
  'linkedin.com': 'neutral', 'google.com': 'neutral',
  'youtube.com': 'distracting', 'facebook.com': 'distracting', 'instagram.com': 'distracting',
  'reddit.com': 'distracting', 'x.com': 'distracting', 'twitter.com': 'distracting'
};

function getCategory(domain) {
  if (DEFAULT_DOMAINS[domain]) return DEFAULT_DOMAINS[domain];
  for (const key in DEFAULT_DOMAINS) {
    if (domain.endsWith('.' + key)) return DEFAULT_DOMAINS[key];
  }
  return 'neutral';
}

// Render list of top domains
function renderTopDomains(domainsMap) {
  const listElement = document.getElementById('domain-list');
  listElement.innerHTML = '';

  if (!domainsMap || Object.keys(domainsMap).length === 0) {
    listElement.innerHTML = '<li class="empty-state">No sites tracked yet today.</li>';
    return;
  }

  // Sort domains by duration descending
  const sorted = Object.entries(domainsMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5); // Limit to top 5

  sorted.forEach(([domain, duration]) => {
    const category = getCategory(domain);
    const item = document.createElement('li');
    item.className = 'domain-item';
    item.innerHTML = `
      <span class="domain-name" title="${domain}">${domain}</span>
      <div class="domain-bar">
        <span class="category-tag ${category}">${category}</span>
        <span class="domain-duration">${formatDuration(duration)}</span>
      </div>
    `;
    listElement.appendChild(item);
  });
}

// Check for active focus session and sync UI state
async function checkActiveFocusSession() {
  const storage = await chrome.storage.local.get(['tp_focus_session']);
  const session = storage.tp_focus_session;

  if (session && session.active) {
    showRunningFocusTimer(session.startTime, session.duration);
  } else {
    showFocusSetup();
  }
}

// Start focus session
function startFocusSession() {
  const activePreset = document.querySelector('.preset-btn.active');
  const duration = parseInt(activePreset.getAttribute('data-duration'), 10) || 25;

  chrome.runtime.sendMessage({ type: 'START_FOCUS', duration: duration }, (response) => {
    if (response && response.status === 'ok') {
      showRunningFocusTimer(Date.now(), duration);
    }
  });
}

// Stop focus session
function stopFocusSession() {
  chrome.runtime.sendMessage({ type: 'STOP_FOCUS' }, (response) => {
    if (response && response.status === 'ok') {
      showFocusSetup();
    }
  });
}

// UI transition: Show focus timer screen
function showRunningFocusTimer(startTime, durationMinutes) {
  document.getElementById('focus-setup').classList.add('hidden');
  document.getElementById('focus-running').classList.remove('hidden');

  const durationSeconds = durationMinutes * 60;

  if (timerInterval) clearInterval(timerInterval);

  const updateTimer = () => {
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    const remainingSeconds = durationSeconds - elapsedSeconds;

    if (remainingSeconds <= 0) {
      clearInterval(timerInterval);
      showFocusSetup();
      // Show desktop notification when timer finishes
      chrome.notifications.create('focus-complete', {
        type: 'basic',
        iconUrl: 'icon.png',
        title: 'Focus Session Complete! 🎉',
        message: `Great job! You stayed focused for ${durationMinutes} minutes. Take a break.`
      });
      // Clear focus session in storage
      chrome.storage.local.set({ tp_focus_session: null });
      return;
    }

    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;
    document.getElementById('timer-display').textContent = 
      `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  updateTimer(); // Run once immediately
  timerInterval = setInterval(updateTimer, 1000);
}

// UI transition: Show settings screen
function showFocusSetup() {
  if (timerInterval) clearInterval(timerInterval);
  document.getElementById('focus-setup').classList.remove('hidden');
  document.getElementById('focus-running').classList.add('hidden');
}
