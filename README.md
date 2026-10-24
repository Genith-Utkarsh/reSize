# AspectFlow — Universal Video Resizer & Aspect Ratio Controller

> **Stretch, zoom, crop, and fit any HTML5 video player** to **16:10**, **16:9**, **21:9**, **4:3**, **32:9**, or custom dimensions without breaking controls or webpage layouts.

---

## 🚀 Features

- 🖥️ **Tailored Display Presets**:
  - **16:10 Stretch**: Eliminates top/bottom black bars on modern laptops (MacBook Pro, Dell XPS, Lenovo ThinkPad, Asus ROG).
  - **21:9 Ultrawide & 32:9 Super Ultrawide**: Fills panoramic and curved gaming monitors.
  - **16:9 Standard HD**: Corrects squished or distorted retro video feeds.
  - **4:3 Classic TV**: Adapts vintage television and retro gaming clips.
  - **Crop / Zoom Fill (`cover`)**: Crops out black bars while maintaining natural 1:1 pixel proportions.
  - **Force 100% Fit (`fill`)**: Forces the video to span 100% of the player container box.
  - **Original (Reset)**: Instantly returns the video element to its native styles.

- 🎛️ **Dual-Axis Fine-Tuning Sliders**:
  - Independent **Scale X** and **Scale Y** multipliers ($0.50\times$ to $2.50\times$, step $0.01$).
  - **Uniform Zoom Lock**: Link $X$ and $Y$ to zoom in or out proportionally.
  - Perfect for videos with **baked-in letterboxes** (movies encoded with black bars inside a 16:9 file).

- ⌨️ **Fullscreen HUD & Keyboard Shortcuts**:
  - Switch aspect ratios and fine-tune scaling while in fullscreen without leaving the video.
  - Non-intrusive on-screen notification badge (HUD) confirms the active ratio.

- ⚡ **SPA & YouTube Seamless Support**:
  - Automatically handles YouTube navigation (`yt-navigate-finish`), resolution changes, and ad transitions using `MutationObserver`.
  - Player controls, progress bars, and subtitles remain crisp and unobstructed.

- 💾 **Per-Site Persistence**:
  - Toggle **"Remember for this website"** to auto-apply your preferred ratio whenever you visit YouTube, Twitch, Netflix, or your favorite streaming site.

- 🖼️ **Iframe & Multi-Frame Support**:
  - Injects into third-party video embeds and streaming iframes via `"all_frames": true`.

---

## 📦 How to Install in Google Chrome (or Brave / Edge / Opera)

1. **Clone or Download** this directory to your computer:
   - Target folder: `/home/nyxeos/Documents/funProjectPro/reSize`
2. Open your browser and navigate to:
   ```text
   chrome://extensions
   ```
   *(For Brave: `brave://extensions` • For Microsoft Edge: `edge://extensions`)*
3. In the top-right corner of the Extensions page, toggle **"Developer mode"** to **ON**.
4. Click the **"Load unpacked"** button in the top-left toolbar.
5. Select this project folder (`reSize`).
6. Click the Extensions puzzle piece icon in the browser toolbar and **pin AspectFlow** for 1-click access.

> [!TIP]
> AspectFlow includes automatic dynamic script injection, meaning it connects immediately even to video tabs opened before loading the extension.

---

## 🎯 How to Use

### 1. Using the Popup Menu
1. Open any video streaming website (YouTube, Netflix, Vimeo, Twitch, etc.) and start playback.
2. Click the **AspectFlow extension icon** in your toolbar.
3. The popup automatically detects the video resolution (e.g., `1920 × 1080 • 16:9`).
4. Click any preset button:
   - For **16:10 laptop screens**, click **16:10 Stretch** or **Force 100% Fit**.
   - For **Ultrawide monitors**, click **21:9 Ultrawide**.
   - To eliminate black bars without distortion, click **Crop / Fill**.
5. Use the **Scale X** and **Scale Y** sliders to manually zoom or correct baked-in black bars.

---

## ⌨️ Fullscreen Keyboard Shortcuts

Adjust aspect ratios on the fly while watching in fullscreen mode:

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| <kbd>Alt</kbd> + <kbd>R</kbd> | **Cycle Presets** | Cycles through `Original` ➔ `16:10` ➔ `16:9` ➔ `21:9` ➔ `4:3` ➔ `Crop / Fill` ➔ `Force 100%` |
| <kbd>Alt</kbd> + <kbd>W</kbd> | **Toggle 100% Fit** | Toggles stretching to fill 100% of the player container |
| <kbd>Alt</kbd> + <kbd>Z</kbd> | **Toggle Crop Fill** | Toggles zoom cover (no black bars, preserved aspect ratio) |
| <kbd>Alt</kbd> + <kbd>0</kbd> | **Reset** | Instantly resets to the original aspect ratio |
| <kbd>Alt</kbd> + <kbd>↑</kbd> | **Scale Y (+)** | Increases vertical stretch by $+0.05\times$ |
| <kbd>Alt</kbd> + <kbd>↓</kbd> | **Scale Y (-)** | Decreases vertical stretch by $-0.05\times$ |
| <kbd>Alt</kbd> + <kbd>→</kbd> | **Scale X (+)** | Increases horizontal stretch by $+0.05\times$ |
| <kbd>Alt</kbd> + <kbd>←</kbd> | **Scale X (-)** | Decreases horizontal stretch by $-0.05\times$ |

> [!NOTE]
> Shortcuts are automatically ignored whenever your cursor is inside a search box, comment area, or text input field.

---

## 🔬 How the Resizing Works (Under the Hood)

HTML5 `<video>` elements expose their source dimensions via `video.videoWidth` and `video.videoHeight`.

1. **Aspect Ratio Calculation**:
   $$\text{Native Ratio } (R_{\text{native}}) = \frac{\text{videoWidth}}{\text{videoHeight}}$$
   $$\text{Target Ratio } (R_{\text{target}}) = \frac{16}{10} \ (1.60), \quad \frac{16}{9} \ (1.778), \quad \frac{21}{9} \ (2.333)$$

2. **Smart Scaling**:
   - When stretching to a wider ratio ($R_{\text{target}} > R_{\text{native}}$):
     $$\text{Scale X} = \frac{R_{\text{target}}}{R_{\text{native}}}, \quad \text{Scale Y} = 1.0$$
   - When stretching to a taller ratio ($R_{\text{target}} < R_{\text{native}}$, such as 16:9 video on a 16:10 screen):
     $$\text{Scale X} = 1.0, \quad \text{Scale Y} = \frac{R_{\text{native}}}{R_{\text{target}}}$$
     *(Stretching vertically fills top/bottom letterboxes seamlessly).*

3. **Container Isolation**:
   - `video.parentElement.style.overflow = 'hidden !important'` guarantees that the scaled video never bleeds outside the player into the comments or sidebar.
   - Transformations are applied directly to `<video>`, ensuring that player controls, play/pause buttons, and subtitles remain crisp and unwarped.

---

## 🛠️ File Structure

```text
reSize/
├── manifest.json       # Manifest V3 configuration, permissions, content script rules
├── popup.html          # Modern dark zinc popup interface
├── popup.css           # Styling, animations, badge indicators, custom sliders
├── popup.js            # User interaction, active tab query, storage synchronization
├── content.js          # Video element engine, transforms, HUD notification, SPA watchers
├── background.js       # Manifest V3 service worker for browser-level shortcut commands
├── icons/              # Extension icons (16px, 32px, 48px, 128px)
├── LICENSE             # MIT Open Source License
└── README.md           # User manual and documentation
```

---

## ❓ Frequently Asked Questions (FAQ)

### Does this work with Netflix or Amazon Prime Video?
Yes. The extension manipulates the rendered HTML5 `<video>` DOM element via CSS transforms, meaning DRM-protected streams are safely transformed without touching the encrypted video buffer.

### What if a movie has hardcoded (baked-in) black bars?
Some older films or trailers have black bars encoded directly into the video pixels. Use the **Crop / Fill** button or manually adjust the **Scale Y** slider to zoom past the hardcoded borders.

### Why does a tab say "No video detected"?
If a tab was opened before installing the extension, simply press <kbd>F5</kbd> (or <kbd>Ctrl</kbd> + <kbd>R</kbd>) to reload the page so the extension can attach to it.

---

## 📄 License
MIT License. Free to use, modify, and distribute.
