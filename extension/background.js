// TeamPulse Background Service Worker (Manifest V3)

let activeTabDomain = null;
let activeTabStartTime = Date.now();
let lastIdleState = 'active';

// Default site categorization
const DEFAULT_CATEGORIES = {
  'github.com': 'productive',
  'gitlab.com': 'productive',
  'stackoverflow.com': 'productive',
  'stackexchange.com': 'productive',
  'docs.microsoft.com': 'productive',
  'developer.mozilla.org': 'productive',
  'w3schools.com': 'productive',
  'linkedin.com': 'neutral',
  'google.com': 'neutral',
  'bing.com': 'neutral',
  'youtube.com': 'distracting',
  'facebook.com': 'distracting',
  'instagram.com': 'distracting',
  'twitter.com': 'distracting',
  'x.com': 'distracting',
  'reddit.com': 'distracting',
  'netflix.com': 'distracting',
  'amazon.in': 'distracting',
  'amazon.com': 'distracting'
};

// Helper: Get domain category
function getCategory(domain, customCategories = {}) {
  const merged = { ...DEFAULT_CATEGORIES, ...customCategories };
  
  // Direct match
  if (merged[domain]) return merged[domain];
  
  // Subdomain match (e.g., meta.stackoverflow.com -> productive)
  for (const key in merged) {
    if (domain.endsWith('.' + key) || domain === key) {
      return merged[key];
    }
  }
  return 'neutral'; // Default category
}

// Helper: Extract domain from URL
function getDomainFromUrl(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol.startsWith('http')) {
      return parsed.hostname;
    }
  } catch (e) {
    // Ignore invalid URLs (e.g., chrome://, about:blank)
  }
  return null;
}

// Log current active tab duration and queue it
async function logCurrentTime() {
  if (!activeTabDomain || lastIdleState !== 'active') return;

  const duration = Math.round((Date.now() - activeTabStartTime) / 1000);
  if (duration <= 0) return;

  const storage = await chrome.storage.local.get(['tp_events_queue', 'tp_user_settings']);
  const customCategories = storage.tp_user_settings?.categories || {};
  const category = getCategory(activeTabDomain, customCategories);

  const newEvent = {
    domain: activeTabDomain,
    category: category,
    duration_seconds: duration,
    start_time: new Date(activeTabStartTime).toISOString(),
    work_date: new Date(activeTabStartTime).toISOString().split('T')[0]
  };

  const queue = storage.tp_events_queue || [];
  queue.push(newEvent);
  
  // Keep queue size within reasonable limits (max 1000 items, ~24h of history)
  if (queue.length > 1000) {
    queue.shift();
  }

  await chrome.storage.local.set({ tp_events_queue: queue });

  // Update today's stats for the popup UI
  await updateTodayStats(newEvent);
}

// Update running stats for the current day
async function updateTodayStats(newEvent) {
  const todayStr = new Date().toISOString().split('T')[0];
  const storage = await chrome.storage.local.get(['tp_today_stats']);
  let stats = storage.tp_today_stats || { date: todayStr, productive: 0, neutral: 0, distracting: 0, domains: {} };

  // If date has changed, reset stats
  if (stats.date !== todayStr) {
    stats = { date: todayStr, productive: 0, neutral: 0, distracting: 0, domains: {} };
  }

  // Add duration to category
  if (newEvent.category === 'productive') stats.productive += newEvent.duration_seconds;
  else if (newEvent.category === 'neutral') stats.neutral += newEvent.duration_seconds;
  else if (newEvent.category === 'distracting') stats.distracting += newEvent.duration_seconds;

  // Add to top domains list
  stats.domains[newEvent.domain] = (stats.domains[newEvent.domain] || 0) + newEvent.duration_seconds;

  await chrome.storage.local.set({ tp_today_stats: stats });
}

// Handle Tab Switches
async function handleTabChanged(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    const domain = getDomainFromUrl(tab.url);

    // Save previous tab time
    await logCurrentTime();

    // Set new active tab
    activeTabDomain = domain;
    activeTabStartTime = Date.now();

    // Check if Focus Session is active and site is distracting
    await checkFocusOverlay(tabId, domain);
  } catch (e) {
    // Tab details might not be accessible if it is closed or special page
    await logCurrentTime();
    activeTabDomain = null;
  }
}

// Check if user is browsing a distracting site during active focus session
async function checkFocusOverlay(tabId, domain) {
  if (!domain) return;
  const storage = await chrome.storage.local.get(['tp_focus_session', 'tp_user_settings']);
  
  if (storage.tp_focus_session && storage.tp_focus_session.active) {
    const customCategories = storage.tp_user_settings?.categories || {};
    const category = getCategory(domain, customCategories);

    if (category === 'distracting') {
      // Send a message to content script to block the page
      try {
        await chrome.tabs.sendMessage(tabId, { type: 'BLOCK_SITE', domain: domain });
      } catch (err) {
        // Content script might not be injected yet
      }
    }
  }
}

// Listen for tab activation (switching tabs)
chrome.tabs.onActivated.addListener((activeInfo) => {
  handleTabChanged(activeInfo.tabId);
});

// Listen for page navigation/updates within the active tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id === tabId) {
        handleTabChanged(tabId);
      }
    });
  }
});

// Idle State Tracking (user walks away from keyboard)
chrome.idle.setDetectionInterval(60); // 60 seconds of inactivity = idle
chrome.idle.onStateChanged.addListener(async (newState) => {
  lastIdleState = newState;
  if (newState === 'idle' || newState === 'locked') {
    // Queue time accumulated up to now
    await logCurrentTime();
    activeTabDomain = null;
  } else {
    // User is active again
    activeTabStartTime = Date.now();
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        activeTabDomain = getDomainFromUrl(tabs[0].url);
      }
    });
  }
});

// Setup Sync Alarm (Periodic Sync every 5 minutes)
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('sync-alarm', { periodInMinutes: 5 });
  console.log('TeamPulse background worker initialized.');
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'sync-alarm') {
    await performSync();
  }
});

// Sync function: Push queue to database API endpoint
async function performSync() {
  await logCurrentTime(); // flush any current tab log into queue first
  activeTabStartTime = Date.now();

  const storage = await chrome.storage.local.get(['tp_events_queue', 'tp_user_settings']);
  const queue = storage.tp_events_queue || [];
  const serverUrl = storage.tp_user_settings?.serverUrl || 'https://app.teampulse.in';
  const sessionToken = storage.tp_user_settings?.sessionToken;

  if (queue.length === 0) return;
  if (!sessionToken) {
    console.warn('Sync skipped: User session token not found.');
    return;
  }

  try {
    const response = await fetch(`${serverUrl}/api/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`
      },
      body: JSON.stringify({ events: queue })
    });

    if (response.ok) {
      console.log(`Synced ${queue.length} events successfully.`);
      await chrome.storage.local.set({ tp_events_queue: [] }); // Clear queue
    } else {
      console.error('Failed to sync. Server returned:', response.statusText);
    }
  } catch (error) {
    console.error('Sync error: Network offline or backend unreachable.', error);
  }
}

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_FOCUS') {
    chrome.storage.local.set({ 
      tp_focus_session: { active: true, startTime: Date.now(), duration: message.duration }
    }).then(() => {
      // Notify active tab to trigger blockers immediately if necessary
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          const domain = getDomainFromUrl(tabs[0].url);
          checkFocusOverlay(tabs[0].id, domain);
        }
      });
      sendResponse({ status: 'ok' });
    });
    return true; // Keep message channel open for async response
  }

  if (message.type === 'STOP_FOCUS') {
    chrome.storage.local.set({ tp_focus_session: null }).then(() => {
      // Reload current tab if it was blocked
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.reload(tabs[0].id);
        }
      });
      sendResponse({ status: 'ok' });
    });
    return true;
  }
});
