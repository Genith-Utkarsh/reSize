// content.js - AspectFlow Clean Video Engine

(function () {
  'use strict';

  if (window.__aspectFlowLoaded) return;
  window.__aspectFlowLoaded = true;

  let activeState = {
    mode: 'reset',
    targetRatio: null,
    scaleX: 1.0,
    scaleY: 1.0,
    label: 'Original'
  };

  let sitePersistenceEnabled = false;
  const currentDomain = window.location.hostname;
  let hudTimeout = null;

  // Presets cycle for Alt+R
  const CYCLE_PRESETS = [
    { mode: 'reset', targetRatio: null, label: 'Original' },
    { mode: 'stretch', targetRatio: 1.6, label: '16:10 Stretch' },
    { mode: 'stretch', targetRatio: 1.777777, label: '16:9 Stretch' },
    { mode: 'stretch', targetRatio: 2.333333, label: '21:9 Ultrawide' },
    { mode: 'stretch', targetRatio: 1.333333, label: '4:3 Stretch' },
    { mode: 'force-fill', targetRatio: null, label: 'Fit to Screen' },
    { mode: 'fill', targetRatio: null, label: 'Zoom Fill' }
  ];
  let cycleIndex = 0;

  // Load saved preference for this domain
  if (currentDomain && chrome.storage && chrome.storage.local) {
    chrome.storage.local.get([`persist_${currentDomain}`, `setting_${currentDomain}`], (res) => {
      if (res[`persist_${currentDomain}`]) {
        sitePersistenceEnabled = true;
        if (res[`setting_${currentDomain}`]) {
          activeState = res[`setting_${currentDomain}`];
          setTimeout(() => applyTransform(false), 300);
        }
      }
    });
  }

  /**
   * Fail-proof detection of the primary video element
   */
  function findMainVideo() {
    // 1. YouTube specific: the primary player video
    const ytVideo = document.querySelector('video.html5-main-video, #movie_player video');
    if (ytVideo) return ytVideo;

    // 2. Direct streaming video elements with src or source child
    const streamVideos = Array.from(document.querySelectorAll('video')).filter(v => {
      return (
        v.src ||
        v.srcObject ||
        v.querySelector('source') ||
        v.classList.contains('video-stream') ||
        v.classList.contains('vjs-tech')
      );
    });

    if (streamVideos.length > 0) {
      // Prioritize currently playing
      const playing = streamVideos.find(v => !v.paused && !v.ended && v.currentTime > 0);
      if (playing) return playing;
      return streamVideos[0];
    }

    // 3. Any video in DOM
    const allVideos = Array.from(document.querySelectorAll('video'));
    if (allVideos.length === 0) return null;

    // Pick largest visible or first
    allVideos.sort((a, b) => (b.offsetWidth * b.offsetHeight) - (a.offsetWidth * a.offsetHeight));
    return allVideos[0];
  }

  /**
   * Calculate scale factors safely
   */
  function calculateScales(video, state) {
    const { mode, targetRatio, scaleX, scaleY } = state;

    if (mode === 'reset') {
      return { sx: 1.0, sy: 1.0, isReset: true };
    }

    if (mode === 'custom') {
      return {
        sx: scaleX !== undefined ? scaleX : 1.0,
        sy: scaleY !== undefined ? scaleY : 1.0,
        isReset: false
      };
    }

    const vw = video.videoWidth || video.offsetWidth || 1920;
    const vh = video.videoHeight || video.offsetHeight || 1080;
    const nativeRatio = vw / vh;

    if (mode === 'stretch' && targetRatio) {
      let sx = 1.0;
      let sy = 1.0;

      if (targetRatio > nativeRatio) {
        // Target is wider (e.g. 21:9 from 16:9): widen horizontally
        sx = targetRatio / nativeRatio;
        sy = 1.0;
      } else {
        // Target is taller (e.g. 16:10 from 16:9): stretch vertically to fill black bars
        sx = 1.0;
        sy = nativeRatio / targetRatio;
      }
      return { sx, sy, isReset: false };
    }

    // Fit to container (100% player box)
    if (mode === 'force-fill') {
      const player = video.closest('#movie_player, .html5-video-player, .video-player') || video.parentElement;
      if (player && player.clientWidth > 0 && player.clientHeight > 0) {
        const cRatio = player.clientWidth / player.clientHeight;
        if (cRatio > nativeRatio) {
          return { sx: cRatio / nativeRatio, sy: 1.0, isReset: false };
        } else {
          return { sx: 1.0, sy: nativeRatio / cRatio, isReset: false };
        }
      }
      // Fallback for 16:10 display
      return { sx: 1.0, sy: 1.1111, isReset: false };
    }

    // Zoom Fill (Crop bars, uniform aspect ratio)
    if (mode === 'fill') {
      const player = video.closest('#movie_player, .html5-video-player, .video-player') || video.parentElement;
      if (player && player.clientWidth > 0 && player.clientHeight > 0) {
        const cRatio = player.clientWidth / player.clientHeight;
        const zoom = Math.max(cRatio / nativeRatio, nativeRatio / cRatio);
        return { sx: zoom, sy: zoom, isReset: false };
      }
      return { sx: 1.1111, sy: 1.1111, isReset: false };
    }

    return { sx: 1.0, sy: 1.0, isReset: true };
  }

  /**
   * Apply transform to video without breaking YouTube ambient mode or causing blur
   */
  function applyTransform(showHud = false) {
    const video = findMainVideo();
    if (!video) return false;

    const { sx, sy, isReset } = calculateScales(video, activeState);

    // YouTube's player already clips overflow. For other generic sites, set overflow hidden on parent
    const isYouTube = !!video.closest('#movie_player, .html5-video-player');
    if (!isYouTube && video.parentElement) {
      video.parentElement.style.overflow = 'hidden';
    }

    if (isReset) {
      video.style.transform = '';
      video.style.transformOrigin = '';
      video.style.transition = 'transform 0.15s ease-out';
    } else {
      video.style.transformOrigin = 'center center';
      video.style.transition = 'transform 0.15s ease-out';
      video.style.transform = `scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`;
    }

    if (showHud) {
      displayHud(activeState.label || activeState.mode);
    }

    // Save if persistence enabled
    if (sitePersistenceEnabled && currentDomain && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [`setting_${currentDomain}`]: activeState });
    }

    return true;
  }

  /**
   * Clean Solid HUD Badge (NO backdrop-filter bug, placed on outer player)
   */
  function displayHud(text) {
    const host =
      document.fullscreenElement ||
      document.querySelector('#movie_player, .html5-video-player') ||
      document.body;

    let hud = document.getElementById('aspectflow-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'aspectflow-hud';
      host.appendChild(hud);
    } else if (hud.parentElement !== host) {
      host.appendChild(hud);
    }

    // Solid styling without backdrop-filter
    Object.assign(hud.style, {
      position: 'absolute',
      top: '28px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: '#18181b',
      border: '1px solid #3f3f46',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.75)',
      color: '#f4f4f5',
      padding: '7px 16px',
      borderRadius: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '13px',
      fontWeight: '600',
      letterSpacing: '0.01em',
      zIndex: '2147483647',
      pointerEvents: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: '7px',
      opacity: '1',
      transition: 'opacity 0.2s ease, transform 0.2s ease'
    });

    hud.innerHTML = `<span style="color:#60a5fa;">⛶</span><span>${text}</span>`;

    if (hudTimeout) clearTimeout(hudTimeout);
    hudTimeout = setTimeout(() => {
      if (hud) {
        hud.style.opacity = '0';
        hud.style.transform = 'translateX(-50%) translateY(-4px)';
        setTimeout(() => {
          if (hud && hud.parentElement) {
            hud.parentElement.removeChild(hud);
          }
        }, 220);
      }
    }, 1300);
  }

  /**
   * Listen to video metadata / play events
   */
  function attachListeners(video) {
    if (!video || video.__aspectFlowBound) return;
    video.__aspectFlowBound = true;

    video.addEventListener('loadedmetadata', () => {
      if (activeState.mode !== 'reset') {
        applyTransform(false);
      }
    });

    video.addEventListener('play', () => {
      if (activeState.mode !== 'reset') {
        applyTransform(false);
      }
    });
  }

  // Hook initial video
  const initialVideo = findMainVideo();
  if (initialVideo) attachListeners(initialVideo);

  // Watch for dynamic video changes (SPA navigation like YouTube)
  const domObserver = new MutationObserver(() => {
    const v = findMainVideo();
    if (v && !v.__aspectFlowBound) {
      attachListeners(v);
      if (activeState.mode !== 'reset') {
        applyTransform(false);
      }
    }
  });

  domObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  // YouTube navigation event
  window.addEventListener('yt-navigate-finish', () => {
    setTimeout(() => {
      const v = findMainVideo();
      if (v) {
        attachListeners(v);
        if (activeState.mode !== 'reset') {
          applyTransform(false);
        }
      }
    }, 300);
  });

  // Fullscreen change
  document.addEventListener('fullscreenchange', () => {
    if (activeState.mode !== 'reset') {
      setTimeout(() => applyTransform(false), 150);
    }
  });

  /**
   * Keyboard Shortcuts
   */
  window.addEventListener('keydown', (e) => {
    const target = e.target;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable ||
      target.getAttribute('role') === 'textbox'
    ) {
      return;
    }

    if (!e.altKey) return;

    // Alt + R: Cycle Presets
    if (e.key.toLowerCase() === 'r') {
      e.preventDefault();
      cycleIndex = (cycleIndex + 1) % CYCLE_PRESETS.length;
      const next = CYCLE_PRESETS[cycleIndex];
      activeState = {
        ...next,
        scaleX: 1.0,
        scaleY: 1.0
      };
      applyTransform(true);
      return;
    }

    // Alt + W: Toggle Fit Screen
    if (e.key.toLowerCase() === 'w') {
      e.preventDefault();
      if (activeState.mode === 'force-fill') {
        activeState = { mode: 'reset', targetRatio: null, scaleX: 1.0, scaleY: 1.0, label: 'Original' };
      } else {
        activeState = { mode: 'force-fill', targetRatio: null, scaleX: 1.0, scaleY: 1.0, label: 'Fit to Screen' };
      }
      applyTransform(true);
      return;
    }

    // Alt + Z: Toggle Zoom Fill
    if (e.key.toLowerCase() === 'z') {
      e.preventDefault();
      if (activeState.mode === 'fill') {
        activeState = { mode: 'reset', targetRatio: null, scaleX: 1.0, scaleY: 1.0, label: 'Original' };
      } else {
        activeState = { mode: 'fill', targetRatio: null, scaleX: 1.0, scaleY: 1.0, label: 'Zoom Fill' };
      }
      applyTransform(true);
      return;
    }

    // Alt + 0: Reset
    if (e.key === '0' || e.code === 'Digit0') {
      e.preventDefault();
      activeState = { mode: 'reset', targetRatio: null, scaleX: 1.0, scaleY: 1.0, label: 'Original' };
      applyTransform(true);
      return;
    }

    // Fine-tune Height (Alt + Arrow Up / Down)
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeState.mode = 'custom';
      activeState.scaleY = parseFloat(Math.min(2.5, (activeState.scaleY || 1.0) + 0.05).toFixed(2));
      activeState.label = `Height: ${activeState.scaleY.toFixed(2)}x`;
      applyTransform(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeState.mode = 'custom';
      activeState.scaleY = parseFloat(Math.max(0.5, (activeState.scaleY || 1.0) - 0.05).toFixed(2));
      activeState.label = `Height: ${activeState.scaleY.toFixed(2)}x`;
      applyTransform(true);
      return;
    }

    // Fine-tune Width (Alt + Arrow Right / Left)
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      activeState.mode = 'custom';
      activeState.scaleX = parseFloat(Math.min(2.5, (activeState.scaleX || 1.0) + 0.05).toFixed(2));
      activeState.label = `Width: ${activeState.scaleX.toFixed(2)}x`;
      applyTransform(true);
      return;
    }

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      activeState.mode = 'custom';
      activeState.scaleX = parseFloat(Math.max(0.5, (activeState.scaleX || 1.0) - 0.05).toFixed(2));
      activeState.label = `Width: ${activeState.scaleX.toFixed(2)}x`;
      applyTransform(true);
      return;
    }
  });

  /**
   * Messaging from popup & background
   */
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'GET_STATUS') {
      const video = findMainVideo();
      if (!video) {
        sendResponse({ hasVideo: false });
        return true;
      }

      const vw = video.videoWidth || video.offsetWidth || 0;
      const vh = video.videoHeight || video.offsetHeight || 0;

      sendResponse({
        hasVideo: true,
        videoWidth: vw,
        videoHeight: vh,
        currentMode: activeState.mode,
        currentLabel: activeState.label,
        targetRatio: activeState.targetRatio,
        scaleX: activeState.scaleX,
        scaleY: activeState.scaleY
      });
      return true;
    }

    if (request.action === 'RESIZE_VIDEO') {
      activeState = {
        mode: request.mode,
        targetRatio: request.targetRatio,
        scaleX: request.scaleX !== undefined ? request.scaleX : 1.0,
        scaleY: request.scaleY !== undefined ? request.scaleY : 1.0,
        label: request.label || request.mode
      };

      // Apply transform without showing HUD when triggered from popup
      const ok = applyTransform(false);
      sendResponse({ status: ok ? 'applied' : 'no_video' });
      return true;
    }

    if (request.action === 'TRIGGER_CYCLE') {
      cycleIndex = (cycleIndex + 1) % CYCLE_PRESETS.length;
      const next = CYCLE_PRESETS[cycleIndex];
      activeState = {
        ...next,
        scaleX: 1.0,
        scaleY: 1.0
      };
      applyTransform(true);
      sendResponse({ status: 'cycled', preset: next });
      return true;
    }

    if (request.action === 'SET_PERSISTENCE') {
      sitePersistenceEnabled = !!request.persist;
      sendResponse({ status: 'ok' });
      return true;
    }
  });
})();
