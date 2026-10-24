// popup.js - AspectFlow Glassy Vibrant Controller

document.addEventListener('DOMContentLoaded', async () => {
  const statusBadge = document.getElementById('video-status-badge');
  const statusText = document.getElementById('video-status-text');
  const videoInfo = document.getElementById('video-info');
  const infoRes = document.getElementById('info-res');
  const infoRatio = document.getElementById('info-ratio');
  const infoMode = document.getElementById('info-current-mode');

  const presetButtons = document.querySelectorAll('.glass-btn');
  const scaleXInput = document.getElementById('scale-x');
  const scaleYInput = document.getElementById('scale-y');
  const scaleXVal = document.getElementById('scale-x-val');
  const scaleYVal = document.getElementById('scale-y-val');
  const linkToggle = document.getElementById('toggle-link');
  const btnResetSliders = document.getElementById('btn-reset-sliders');
  const sitePersistToggle = document.getElementById('toggle-site-persist');
  const siteDomainLabel = document.getElementById('site-domain-label');
  const persistBadge = document.getElementById('persist-badge');

  let activeTab = null;
  let currentDomain = '';
  let currentState = {
    mode: 'reset',
    targetRatio: null,
    scaleX: 1.0,
    scaleY: 1.0,
    label: 'Original'
  };

  // Extract active tab & domain
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0]) {
      activeTab = tabs[0];
      if (activeTab.url) {
        try {
          const urlObj = new URL(activeTab.url);
          currentDomain = urlObj.hostname;
          if (siteDomainLabel && currentDomain) {
            siteDomainLabel.textContent = `Auto-applies for ${currentDomain}`;
          }
        } catch {
          currentDomain = '';
        }
      }
    }
  } catch (err) {
    console.error('Error querying tab:', err);
  }

  // Check supported page
  if (!activeTab || !activeTab.id || activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('chrome-extension://')) {
    setNoVideoState('System Page (Unsupported)');
    return;
  }

  // Load saved persistence state for domain
  if (currentDomain) {
    const storageKey = `site_${currentDomain}`;
    chrome.storage.local.get([storageKey], (result) => {
      const saved = result[storageKey];
      if (saved && saved.enabled) {
        sitePersistToggle.checked = true;
        if (persistBadge) persistBadge.classList.remove('hidden');
        if (saved.state) {
          currentState = saved.state;
          highlightPreset(currentState.mode, currentState.targetRatio);
          if (infoMode) infoMode.textContent = currentState.label || 'Saved Ratio';
          if (currentState.scaleX !== undefined) {
            scaleXInput.value = currentState.scaleX;
            scaleXVal.textContent = `${parseFloat(currentState.scaleX).toFixed(2)}x`;
          }
          if (currentState.scaleY !== undefined) {
            scaleYInput.value = currentState.scaleY;
            scaleYVal.textContent = `${parseFloat(currentState.scaleY).toFixed(2)}x`;
          }
        }
      }
    });
  }

  // Request status from content script
  requestTabStatus(true);

  async function requestTabStatus(canInjectFallback = true) {
    if (!activeTab || !activeTab.id) return;

    chrome.tabs.sendMessage(activeTab.id, { action: 'GET_STATUS' }, async (response) => {
      if (chrome.runtime.lastError) {
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
    statusBadge.className = 'status-pill status-active';
    statusText.textContent = 'Connected';
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

    currentState = {
      mode: data.currentMode || 'reset',
      targetRatio: data.targetRatio,
      scaleX: data.scaleX || 1.0,
      scaleY: data.scaleY || 1.0,
      label: data.currentLabel || 'Original'
    };

    highlightPreset(data.currentMode, data.targetRatio);
  }

  function setNoVideoState(msg) {
    statusBadge.className = 'status-pill status-none';
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

  function saveSitePreference(state) {
    if (!currentDomain) return;
    const storageKey = `site_${currentDomain}`;
    if (sitePersistToggle.checked) {
      chrome.storage.local.set({
        [storageKey]: {
          enabled: true,
          state: state
        }
      });
      if (persistBadge) persistBadge.classList.remove('hidden');
    } else {
      chrome.storage.local.remove([storageKey]);
      if (persistBadge) persistBadge.classList.add('hidden');
    }
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

      currentState = {
        mode,
        targetRatio: ratio,
        label,
        scaleX: parseFloat(scaleXInput.value),
        scaleY: parseFloat(scaleYInput.value)
      };

      sendTransform(currentState);
      highlightPreset(mode, ratio);
      infoMode.textContent = label;

      if (sitePersistToggle.checked) {
        saveSitePreference(currentState);
      }
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

    currentState = {
      mode: 'custom',
      scaleX: sx,
      scaleY: sy,
      label: `Custom ${sx.toFixed(2)}x`
    };

    sendTransform(currentState);

    if (sitePersistToggle.checked) {
      saveSitePreference(currentState);
    }
  }

  scaleXInput.addEventListener('input', handleSliderChange);
  scaleYInput.addEventListener('input', handleSliderChange);

  // Reset Sliders
  btnResetSliders.addEventListener('click', () => {
    scaleXInput.value = '1.00';
    scaleYInput.value = '1.00';
    scaleXVal.textContent = '1.00x';
    scaleYVal.textContent = '1.00x';

    currentState = {
      mode: 'reset',
      scaleX: 1.0,
      scaleY: 1.0,
      label: 'Original'
    };

    sendTransform(currentState);
    highlightPreset('reset', null);
    infoMode.textContent = 'Original';

    if (sitePersistToggle.checked) {
      saveSitePreference(currentState);
    }
  });

  // Remember for this website toggle switch
  sitePersistToggle.addEventListener('change', () => {
    if (!currentDomain) return;
    const isChecked = sitePersistToggle.checked;
    saveSitePreference(currentState);

    if (activeTab && activeTab.id) {
      chrome.tabs.sendMessage(activeTab.id, {
        action: 'SET_PERSISTENCE',
        persist: isChecked,
        state: currentState,
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
        }
      }
    );
  }
});
