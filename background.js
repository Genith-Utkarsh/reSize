// background.js - AspectFlow Service Worker

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;

  if (command === 'cycle_ratio') {
    chrome.tabs.sendMessage(tab.id, { action: 'TRIGGER_CYCLE' });
  } else if (command === 'reset_ratio') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'RESIZE_VIDEO',
      mode: 'reset',
      scaleX: 1.0,
      scaleY: 1.0,
      label: 'Original'
    });
  } else if (command === 'toggle_fit') {
    chrome.tabs.sendMessage(tab.id, {
      action: 'RESIZE_VIDEO',
      mode: 'force-fill',
      label: 'Force 100% Fit'
    });
  }
});
