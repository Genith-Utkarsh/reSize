// popup.js - AspectFlow Minimal Controller

document.addEventListener('DOMContentLoaded', async () => {
  const statusBadge = document.getElementById('video-status-badge');
  const statusText = document.getElementById('video-status-text');
  const videoInfo = document.getElementById('video-info');
  const infoRes = document.getElementById('info-res');
  const infoRatio = document.getElementById('info-ratio');
  const infoMode = document.getElementById('info-current-mode');

  const presetButtons = document.querySelectorAll('.btn');
  const scaleXInput = document.getElementById('scale-x');
  const scaleYInput = document.getElementById('scale-y');
  const scaleXVal = document.getElementById('scale-x-val');
  const scaleYVal = document.getElementById('scale-y-val');
  const linkToggle = document.getElementById('toggle-link');
  const btnResetSliders = document.getElementById('btn-reset-sliders');
  const sitePersistToggle = document.getElementById('toggle-site-persist');
  const siteDomainLabel = document.getElementById('site-domain-label');

  let activeTab = null;
  let currentDomain = '';

  // Get current active tab
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0]) {
      activeTab = tabs[0];
      if (activeTab.url) {
        try {
          const urlObj = new URL(activeTab.url);
          currentDomain = urlObj.hostname;
          if (siteDomainLabel && currentDomain) {
            siteDomainLabel.textContent = `Auto-apply on ${currentDomain}`;
          }
        } catch {
          currentDomain = '';
        }
      }
    }
  } catch (err) {
    console.error('Error querying tab:', err);
  }

  // Check if page can run extensions
  if (!activeTab || !activeTab.id || activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('chrome-extension://')) {
    setNoVideoState('Unavailable on system pages');
    return;
  }

  // Load saved persistence state
  if (currentDomain) {
    chrome.storage.local.get([`persist_${currentDomain}`], (result) => {
      if (result[`persist_${currentDomain}`]) {
        sitePersistToggle.checked = true;
      }
    });
  }

  // Request status from content script (with auto-injection fallback)
  requestTabStatus(true);

  async function requestTabStatus(canInjectFallback = true) {
    if (!activeTab || !activeTab.id) return;

    chrome.tabs.sendMessage(activeTab.id, { action: 'GET_STATUS' }, async (response) => {
      if (chrome.runtime.lastError) {
        // Content script is not yet injected on this tab (e.g. tab was open before extension install)
        if (canInjectFallback && chrome.scripting) {
          try {
            await chrome.scripting.executeScript({
              target: { tabId: activeTab.id, allFrames: true },
              files: ['content.js']
            });
            setTimeout(() => requestTabStatus(false), 120);
            return;
          } catch (e) {
            console.warn('Script injection skipped:', e.message);
          }
        }
        setNoVideoState('No video detected');
        return;
      }

      if (response && response.hasVideo) {
        setActiveVideoState(response);
      } else {
        setNoVideoState('No video detected');
      }
    });
  }

  function setActiveVideoState(data) {
    statusBadge.className = 'badge badge-active';
    statusText.textContent = 'Video Connected';
    videoInfo.classList.remove('hidden');

    if (data.videoWidth && data.videoHeight) {
      infoRes.textContent = `${data.videoWidth} × ${data.videoHeight}`;
      const ratio = (data.videoWidth / data.videoHeight).toFixed(2);
      infoRatio.textContent = formatRatioString(data.videoWidth, data.videoHeight, ratio);
    } else {
      infoRes.textContent = 'Active Video';
      infoRatio.textContent = '';
    }

    infoMode.textContent = data.currentLabel || data.currentMode || 'Original';

    // Sync sliders
    if (data.scaleX !== undefined) {
      scaleXInput.value = data.scaleX;
      scaleXVal.textContent = `${parseFloat(data.scaleX).toFixed(2)}x`;
    }
    if (data.scaleY !== undefined) {
      scaleYInput.value = data.scaleY;
      scaleYVal.textContent = `${parseFloat(data.scaleY).toFixed(2)}x`;
    }

    // Highlight preset
    highlightPreset(data.currentMode, data.targetRatio);
  }

  function setNoVideoState(msg) {
    statusBadge.className = 'badge badge-none';
    statusText.textContent = msg;
    videoInfo.classList.add('hidden');
  }

  function formatRatioString(w, h, ratio) {
    const r = parseFloat(ratio);
    if (Math.abs(r - 1.78) < 0.05) return '16:9';
    if (Math.abs(r - 1.60) < 0.05) return '16:10';
    if (Math.abs(r - 1.33) < 0.05) return '4:3';
    if (Math.abs(r - 2.33) < 0.05) return '21:9';
    return `${ratio}:1`;
  }

  function highlightPreset(mode, ratio) {
    presetButtons.forEach((btn) => {
      btn.classList.remove('active');
      const btnMode = btn.getAttribute('data-mode');
      const btnRatio = parseFloat(btn.getAttribute('data-ratio'));

      if (btnMode === mode) {
        if (mode === 'stretch' && ratio) {
          if (Math.abs(btnRatio - ratio) < 0.05) {
            btn.classList.add('active');
          }
        } else {
          btn.classList.add('active');
        }
      }
    });
  }

  // Preset Buttons Click
  presetButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode');
      const ratioStr = btn.getAttribute('data-ratio');
      const ratio = ratioStr ? parseFloat(ratioStr) : null;
      const label = btn.getAttribute('data-label') || (mode === 'reset' ? 'Original' : mode);

      if (mode === 'reset') {
        scaleXInput.value = '1.00';
        scaleYInput.value = '1.00';
        scaleXVal.textContent = '1.00x';
        scaleYVal.textContent = '1.00x';
      }

      sendTransform({
        mode,
        targetRatio: ratio,
        label,
        scaleX: parseFloat(scaleXInput.value),
        scaleY: parseFloat(scaleYInput.value)
      });

      highlightPreset(mode, ratio);
      infoMode.textContent = label;
    });
  });

  // Slider Change
  function handleSliderChange(e) {
    const isX = e.target === scaleXInput;
    let sx = parseFloat(scaleXInput.value);
    let sy = parseFloat(scaleYInput.value);

    if (linkToggle.checked) {
      if (isX) {
        sy = sx;
        scaleYInput.value = sx;
      } else {
        sx = sy;
        scaleXInput.value = sy;
      }
    }

    scaleXVal.textContent = `${sx.toFixed(2)}x`;
    scaleYVal.textContent = `${sy.toFixed(2)}x`;

    presetButtons.forEach((b) => b.classList.remove('active'));
    infoMode.textContent = `Custom (${sx.toFixed(2)}x, ${sy.toFixed(2)}x)`;

    sendTransform({
      mode: 'custom',
      scaleX: sx,
      scaleY: sy,
      label: `Custom ${sx.toFixed(2)}x`
    });
  }

  scaleXInput.addEventListener('input', handleSliderChange);
  scaleYInput.addEventListener('input', handleSliderChange);

  // Reset Sliders
  btnResetSliders.addEventListener('click', () => {
    scaleXInput.value = '1.00';
    scaleYInput.value = '1.00';
    scaleXVal.textContent = '1.00x';
    scaleYVal.textContent = '1.00x';

    sendTransform({
      mode: 'reset',
      scaleX: 1.0,
      scaleY: 1.0,
      label: 'Original'
    });
    highlightPreset('reset', null);
    infoMode.textContent = 'Original';
  });

  // Remember for this website
  sitePersistToggle.addEventListener('change', () => {
    if (!currentDomain) return;
    const isChecked = sitePersistToggle.checked;

    if (isChecked) {
      chrome.storage.local.set({ [`persist_${currentDomain}`]: true });
      chrome.tabs.sendMessage(activeTab.id, {
        action: 'SET_PERSISTENCE',
        persist: true,
        domain: currentDomain
      });
    } else {
      chrome.storage.local.remove([`persist_${currentDomain}`, `setting_${currentDomain}`]);
      chrome.tabs.sendMessage(activeTab.id, {
        action: 'SET_PERSISTENCE',
        persist: false,
        domain: currentDomain
      });
    }
  });

  function sendTransform(payload) {
    if (!activeTab || !activeTab.id) return;

    chrome.tabs.sendMessage(
      activeTab.id,
      {
        action: 'RESIZE_VIDEO',
        ...payload
      },
      (res) => {
        if (chrome.runtime.lastError) {
          console.warn('Message send error:', chrome.runtime.lastError.message);
        } else if (res && res.status === 'applied') {
          if (sitePersistToggle.checked && currentDomain) {
            chrome.storage.local.set({
              [`setting_${currentDomain}`]: payload
            });
          }
        }
      }
    );
  }
});
