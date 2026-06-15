// TeamPulse Content Script

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'BLOCK_SITE') {
    showFocusOverlay(message.domain);
  }
});

function showFocusOverlay(domain) {
  // If overlay already exists, do not duplicate
  if (document.getElementById('teampulse-focus-overlay')) return;

  // Create overlay container
  const overlay = document.createElement('div');
  overlay.id = 'teampulse-focus-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: #0f0f1a;
    color: #e8e8f0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 2147483647; /* Highest z-index possible */
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  `;

  // HTML content of focus screen
  overlay.innerHTML = `
    <div style="text-align: center; max-width: 500px; padding: 40px; border-radius: 20px; background: #16213e; border: 1px solid #2a2a4a; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
      <div style="font-size: 64px; margin-bottom: 20px; animation: bounce 2s infinite;">⏳</div>
      <h1 style="font-size: 28px; font-weight: 700; margin-bottom: 12px; color: #4a90d9; font-family: 'Space Grotesk', sans-serif;">Stay in the Zone!</h1>
      <p style="font-size: 16px; color: #8888aa; margin-bottom: 30px; line-height: 1.6;">
        You blocked <strong>${domain}</strong> to help you focus. This session will end when the timer runs out.
      </p>
      <div style="display: flex; justify-content: center; gap: 16px;">
        <button id="teampulse-close-tab" style="padding: 12px 24px; font-size: 14px; font-weight: 600; border-radius: 10px; border: none; background: linear-gradient(135deg, #4a90d9, #8e44ad); color: white; cursor: pointer; transition: transform 0.2s;">
          Close Tab
        </button>
        <button id="teampulse-stop-focus" style="padding: 12px 24px; font-size: 14px; font-weight: 600; border-radius: 10px; border: 1px solid #2a2a4a; background: #1a1a2e; color: #e8e8f0; cursor: pointer; transition: transform 0.2s;">
          I Give Up (Stop Focus)
        </button>
      </div>
    </div>
    
    <style>
      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }
      #teampulse-close-tab:hover, #teampulse-stop-focus:hover {
        transform: scale(1.05);
      }
    </style>
  `;

  document.body.appendChild(overlay);

  // Close tab event listener
  document.getElementById('teampulse-close-tab').addEventListener('click', () => {
    // Send message to background to close the active tab
    window.close();
  });

  // Cancel focus session event listener
  document.getElementById('teampulse-stop-focus').addEventListener('click', () => {
    if (confirm('Are you sure you want to stop this focus session?')) {
      chrome.runtime.sendMessage({ type: 'STOP_FOCUS' }, (response) => {
        if (response.status === 'ok') {
          overlay.remove();
        }
      });
    }
  });
}
