/* ============================================================
   main.js — Minimal logic for YTab Extension
   Features:
   - Single line shortcut rendering + edit/add/delete
   - Pointer cursor drag-and-drop reordering
   - Random motivational quote at bottom center
   ============================================================ */

/* ── Data ────────────────────────────────────────────── */
let shortcuts = [];
let editingIndex = null;
let dragSrcIndex = null;

const grid  = document.getElementById("shortcuts-grid");
const modal = document.getElementById("modal-overlay");

const NEW_PLUS_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
  <path d="M0 0h24v24H0z" fill="none"/>
  <path fill="currentColor" d="M11.5 12.5h-5q-.213 0-.356-.144T6 11.999t.144-.356t.356-.143h5v-5q0-.213.144-.356T12.001 6t.356.144t.143.356v5h5q.213 0 .356.144t.144.357t-.144.356t-.356.143h-5v5q0 .213-.144.356t-.357.144t-.356-.144t-.143-.356z"/>
</svg>`;

const DOTS_ICON = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>`;

const MOTIVATIONAL_QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
  { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { text: "Your time is limited, so don't waste it living someone else's life.", author: "Steve Jobs" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
  { text: "Consistency is what transforms average into excellence.", author: "Anonymous" }
];

/* ── Render Motivational Quote ───────────────────────── */
function renderRandomQuote() {
  const quoteContainer = document.getElementById("quote-container");
  const quoteText = document.getElementById("quote-text");
  const quoteAuthor = document.getElementById("quote-author");

  if (!quoteContainer || !quoteText || !quoteAuthor) return;

  const randomQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
  quoteText.textContent = `"${randomQuote.text}"`;
  quoteAuthor.textContent = `— ${randomQuote.author}`;

  chrome.storage.local.get(["showQuote"], res => {
    const show = res.showQuote !== undefined ? res.showQuote : true;
    if (show) {
      setTimeout(() => quoteContainer.classList.add("visible"), 100);
    }
  });
}

/* ── Ambient Icon Color Extraction ───────────────────── */
const iconColorCache = new Map();

const BRAND_COLORS = {
  "youtube.com": [239, 68, 68],
  "youtu.be": [239, 68, 68],
  "reddit.com": [255, 69, 0],
  "github.com": [139, 92, 246],
  "claude.ai": [217, 119, 87],
  "anthropic.com": [217, 119, 87],
  "google.com": [59, 130, 246],
  "twitter.com": [29, 155, 240],
  "x.com": [148, 163, 184],
  "spotify.com": [34, 197, 94],
  "netflix.com": [229, 9, 20],
  "twitch.tv": [145, 70, 255],
  "discord.com": [88, 101, 242],
  "amazon.com": [245, 158, 11],
  "facebook.com": [24, 119, 242],
  "instagram.com": [236, 72, 153],
  "linkedin.com": [10, 102, 194],
  "notion.so": [100, 116, 139],
  "chatgpt.com": [16, 163, 127],
  "openai.com": [16, 163, 127],
  "stackoverflow.com": [244, 128, 36],
  "wikipedia.org": [148, 163, 184]
};

function getHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function hslToRgb(h, s, l) {
  s /= 100;
  l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function getFallbackColor(url) {
  const host = getHostname(url);
  for (const [domain, rgb] of Object.entries(BRAND_COLORS)) {
    if (host.includes(domain)) return rgb;
  }
  let hash = 0;
  for (let i = 0; i < host.length; i++) {
    hash = host.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return hslToRgb(hue, 70, 52);
}

function extractDominantColor(imgSrc, fallbackRgb, callback) {
  if (!imgSrc) {
    callback(fallbackRgb);
    return;
  }

  const tempImg = new Image();
  if (imgSrc.startsWith("http://") || imgSrc.startsWith("https://")) {
    tempImg.crossOrigin = "anonymous";
  }

  let finished = false;
  const finish = rgb => {
    if (!finished) {
      finished = true;
      callback(rgb || fallbackRgb);
    }
  };

  const timeoutId = setTimeout(() => finish(fallbackRgb), 1200);

  tempImg.onload = () => {
    clearTimeout(timeoutId);
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      canvas.width = 32;
      canvas.height = 32;
      ctx.drawImage(tempImg, 0, 0, 32, 32);

      const imgData = ctx.getImageData(0, 0, 32, 32).data;
      let bestRgb = null;
      let maxScore = -1;
      let sumR = 0, sumG = 0, sumB = 0, count = 0;

      for (let i = 0; i < imgData.length; i += 4) {
        const r = imgData[i];
        const g = imgData[i + 1];
        const b = imgData[i + 2];
        const a = imgData[i + 3];

        if (a < 80) continue;
        if (r > 240 && g > 240 && b > 240) continue;

        const isNearBlack = r < 25 && g < 25 && b < 25;
        sumR += r;
        sumG += g;
        sumB += b;
        count++;

        if (isNearBlack) continue;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturation = max === 0 ? 0 : (max - min) / max;
        const brightness = max / 255;

        const score = saturation * 2.5 + (brightness > 0.25 && brightness < 0.95 ? 1 : 0.4);
        if (score > maxScore) {
          maxScore = score;
          bestRgb = [r, g, b];
        }
      }

      if (!bestRgb && count > 0) {
        bestRgb = [
          Math.round(sumR / count),
          Math.round(sumG / count),
          Math.round(sumB / count)
        ];
      }

      finish(bestRgb || fallbackRgb);
    } catch {
      finish(fallbackRgb);
    }
  };

  tempImg.onerror = () => {
    clearTimeout(timeoutId);
    finish(fallbackRgb);
  };

  tempImg.src = imgSrc;
}

function applyAmbientColor(iconBox, rgb) {
  if (!iconBox || !rgb) return;
  const [r, g, b] = rgb;
  iconBox.style.setProperty("--icon-color", `rgba(${r}, ${g}, ${b}, 0.28)`);
  iconBox.style.setProperty("--icon-color-subtle", `rgba(${r}, ${g}, ${b}, 0.08)`);
  iconBox.style.setProperty("--icon-ambient-shadow", `rgba(${r}, ${g}, ${b}, 0.12)`);
  iconBox.style.setProperty("--icon-ambient-hover", `rgba(${r}, ${g}, ${b}, 0.26)`);
  iconBox.style.setProperty("--icon-border", `rgba(${r}, ${g}, ${b}, 0.14)`);
  iconBox.style.setProperty("--icon-border-hover", `rgba(${r}, ${g}, ${b}, 0.35)`);
}

/* ── Shortcuts Rendering ─────────────────────────────── */
function renderShortcuts() {
  if (!grid) return;
  grid.innerHTML = "";

  shortcuts.forEach((s, index) => {
    const div = document.createElement("div");
    div.className = "shortcut-item";
    div.dataset.index = index;
    div.draggable = true;

    const icon = `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(s.url)}&size=64`;
    const initialRgb = iconColorCache.get(icon) || getFallbackColor(s.url);
    const [r, g, b] = initialRgb;

    div.innerHTML = `
      <button class="edit-dots" title="Edit shortcut">${DOTS_ICON}</button>
      <div class="icon-box" style="
        --icon-color: rgba(${r}, ${g}, ${b}, 0.28);
        --icon-color-subtle: rgba(${r}, ${g}, ${b}, 0.08);
        --icon-ambient-shadow: rgba(${r}, ${g}, ${b}, 0.12);
        --icon-ambient-hover: rgba(${r}, ${g}, ${b}, 0.26);
        --icon-border: rgba(${r}, ${g}, ${b}, 0.14);
        --icon-border-hover: rgba(${r}, ${g}, ${b}, 0.35);
      ">
        <div class="icon-ambient-glow"></div>
        <img src="${icon}" alt="">
      </div>
      <div class="label">${escHtml(s.name)}</div>
    `;

    const iconBox = div.querySelector(".icon-box");
    if (!iconColorCache.has(icon)) {
      extractDominantColor(icon, initialRgb, rgb => {
        iconColorCache.set(icon, rgb);
        applyAmbientColor(iconBox, rgb);
      });
    }

    // Click to navigate
    div.onclick = e => {
      if (e.target.closest(".edit-dots")) return;
      window.location.href = s.url;
    };

    // Edit dots click
    div.querySelector(".edit-dots").onclick = e => {
      e.stopPropagation();
      openModal(index);
    };

    // Context menu edit
    div.oncontextmenu = e => { e.preventDefault(); openModal(index); };

    // ── Drag and drop ──────────────────────────────────────
    div.addEventListener("dragstart", e => {
      dragSrcIndex = index;
      div.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(index));
    });

    div.addEventListener("dragend", () => {
      dragSrcIndex = null;
      document.querySelectorAll(".shortcut-item").forEach(el =>
        el.classList.remove("dragging", "drag-over")
      );
    });

    div.addEventListener("dragover", e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      document.querySelectorAll(".shortcut-item[data-index]").forEach(el =>
        el.classList.remove("drag-over")
      );
      if (dragSrcIndex !== null && dragSrcIndex !== index) {
        div.classList.add("drag-over");
      }
    });

    div.addEventListener("dragleave", () => div.classList.remove("drag-over"));

    div.addEventListener("drop", e => {
      e.preventDefault();
      e.stopPropagation();
      if (dragSrcIndex !== null && dragSrcIndex !== index) {
        const [moved] = shortcuts.splice(dragSrcIndex, 1);
        shortcuts.splice(index, 0, moved);
        chrome.storage.local.set({ myShortcuts: shortcuts }, () => {
          renderShortcuts();
          // Add drop animation to the moved element
          const allItems = document.querySelectorAll('.shortcut-item[data-index]');
          if (allItems[index]) {
            allItems[index].classList.add('pop-drop');
            setTimeout(() => allItems[index].classList.remove('pop-drop'), 400);
          }
        });
      }
    });

    grid.appendChild(div);
  });

  // Add shortcut button (+)
  const addBtn = document.createElement("div");
  addBtn.className = "shortcut-item add-btn";
  addBtn.innerHTML = `
    <div class="icon-box">
      <div class="icon-ambient-glow" style="display:none;"></div>
      ${NEW_PLUS_ICON}
    </div>
    <div class="label">Add shortcut</div>
  `;
  addBtn.onclick = () => openModal(null);
  grid.appendChild(addBtn);
}

function escHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* ── Modal Dialog ────────────────────────────────────── */
function openModal(i) {
  editingIndex = i;
  const nIn    = document.getElementById("modal-name");
  const uIn    = document.getElementById("modal-url");
  const delBtn = document.getElementById("modal-delete");

  if (i !== null) {
    nIn.value = shortcuts[i].name;
    uIn.value = shortcuts[i].url;
    delBtn.classList.remove("hidden");
  } else {
    nIn.value = "";
    uIn.value = "";
    delBtn.classList.add("hidden");
  }
  modal.classList.remove("hidden");
  nIn.focus();
}

/* ── Export / Import Shortcuts ────────────────────────── */
function exportShortcuts() {
  if (!shortcuts || !shortcuts.length) {
    showToast("No shortcuts to export!");
    return;
  }
  const data = JSON.stringify(shortcuts, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "ytabs-shortcuts.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("Shortcuts exported successfully!");
}

function handleImport(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const imported = JSON.parse(ev.target.result);
      if (Array.isArray(imported) && imported.every(s => s.name && s.url)) {
        shortcuts = imported;
        chrome.storage.local.set({ myShortcuts: shortcuts }, () => {
          renderShortcuts();
          showToast(`Imported ${shortcuts.length} shortcuts!`);
          document.getElementById("import-modal-overlay")?.classList.add("hidden");
        });
      } else {
        showToast("Invalid file format!");
      }
    } catch {
      showToast("Error reading JSON file!");
    }
  };
  reader.readAsText(file);
}

function showToast(msg) {
  const old = document.getElementById("ytab-toast");
  if (old) old.remove();

  const toast = document.createElement("div");
  toast.id = "ytab-toast";
  toast.style.cssText = `
    position: fixed;
    bottom: 60px;
    right: 20px;
    background: #2b2b2b;
    border: 1px solid rgba(255,255,255,0.15);
    color: #ffffff;
    font-size: 12px;
    padding: 8px 14px;
    border-radius: 20px;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    transition: opacity 0.3s ease;
  `;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 2200);
}

/* ── Theme Color Helpers ─────────────────────────────── */
function isColorLight(hex) {
  if (!hex || typeof hex !== "string") return false;
  let c = hex.replace(/^#/, "");
  if (c.length === 3) c = c.split("").map(x => x + x).join("");
  if (c.length !== 6) return false;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const [rs, gs, bs] = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  const lum = 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  return lum > 0.45;
}

function applyThemeColor(color) {
  if (!color || typeof color !== "string") color = "#121212";
  if (!color.startsWith("#")) color = "#" + color;
  if (color.length === 4) {
    color = "#" + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
  }
  
  const isLight = isColorLight(color);
  
  document.documentElement.style.setProperty("--bg-color", color);
  
  if (isLight) {
    document.body.classList.add("light-mode");
  } else {
    document.body.classList.remove("light-mode");
  }
  
  const picker = document.getElementById("theme-color-picker");
  const hexLabel = document.getElementById("color-hex-label");
  if (picker) picker.value = color;
  if (hexLabel) hexLabel.textContent = color.toUpperCase();
  
  const favicon = document.querySelector("link[rel='icon']");
  if (favicon) {
    favicon.href = isLight ? "icons/favicon-light.png" : "icons/favicon-dark.svg";
  }
  
  document.querySelectorAll(".color-preset-btn").forEach(btn => {
    const btnColor = btn.dataset.color?.toLowerCase();
    if (btnColor && btnColor === color.toLowerCase()) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

/* ── Initialization ──────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  // Load shortcuts & settings
  chrome.storage.local.get(["myShortcuts", "themeColor", "themeDark", "bgHue", "showQuote", "layout"], res => {
    shortcuts = res.myShortcuts || [
      { name: "Reddit",    url: "https://reddit.com" },
      { name: "Github",    url: "https://github.com" },
      { name: "Claude",    url: "https://claude.ai" },
      { name: "Youtube",   url: "https://youtube.com" }
    ];
    renderShortcuts();
    
    // Apply Settings
    let themeColor = res.themeColor;
    if (!themeColor) {
      if (res.themeDark === false) {
        themeColor = "#f8fafc";
      } else {
        themeColor = "#121212";
      }
    }
    
    const showQuote = res.showQuote !== undefined ? res.showQuote : true;
    const layout = res.layout !== undefined ? res.layout : "single";
    
    applyThemeColor(themeColor);
    
    const quoteToggle = document.getElementById("quote-toggle");
    if (quoteToggle) quoteToggle.checked = showQuote;

    const layoutSelect = document.getElementById("layout-select");
    if (layoutSelect) layoutSelect.value = layout;

    if (layout === "wrap") {
      document.getElementById("shortcuts-grid")?.classList.add("multi-row");
    }
  });

  renderRandomQuote();

  /* ── Settings Sidebar Listeners ────────────────────── */
  const sidebar = document.getElementById("settings-sidebar");
  const settingsBtn = document.getElementById("settings-btn");
  
  settingsBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    sidebar.classList.add("open");
  });
  
  document.getElementById("close-sidebar")?.addEventListener("click", () => sidebar.classList.remove("open"));

  // Close when clicking outside
  document.addEventListener("click", (e) => {
    if (sidebar.classList.contains("open") && !sidebar.contains(e.target) && !settingsBtn.contains(e.target)) {
      sidebar.classList.remove("open");
    }
  });

  /* ── Theme Color Listeners ─────────────────────────── */
  const colorPicker = document.getElementById("theme-color-picker");
  const colorPickerControl = document.querySelector(".color-picker-control");
  const customTrigger = document.getElementById("custom-color-trigger");

  colorPicker?.addEventListener("input", (e) => {
    const val = e.target.value;
    applyThemeColor(val);
  });

  colorPicker?.addEventListener("change", (e) => {
    const val = e.target.value;
    applyThemeColor(val);
    chrome.storage.local.set({ themeColor: val });
  });

  colorPickerControl?.addEventListener("click", (e) => {
    if (e.target !== colorPicker) {
      colorPicker?.click();
    }
  });

  customTrigger?.addEventListener("click", () => {
    colorPicker?.click();
  });

  document.querySelectorAll(".color-preset-btn[data-color]").forEach(btn => {
    btn.addEventListener("click", () => {
      const color = btn.dataset.color;
      if (color) {
        applyThemeColor(color);
        chrome.storage.local.set({ themeColor: color });
      }
    });
  });

  document.getElementById("layout-select")?.addEventListener("change", (e) => {
    const val = e.target.value;
    chrome.storage.local.set({ layout: val });
    const grid = document.getElementById("shortcuts-grid");
    if (val === "wrap") grid.classList.add("multi-row");
    else grid.classList.remove("multi-row");
  });

  document.getElementById("quote-toggle")?.addEventListener("change", (e) => {
    const val = e.target.checked;
    chrome.storage.local.set({ showQuote: val });
    const qc = document.getElementById("quote-container");
    if (val) qc.classList.add("visible");
    else qc.classList.remove("visible");
  });

  /* ── Export & Import Listeners ───────────────────────── */
  document.getElementById("export-btn")?.addEventListener("click", exportShortcuts);
  
  const importModal = document.getElementById("import-modal-overlay");
  const dropZone = document.getElementById("drop-zone");
  const importFile = document.getElementById("import-file");

  document.getElementById("import-btn")?.addEventListener("click", () => {
    importModal?.classList.remove("hidden");
  });
  
  document.getElementById("import-cancel")?.addEventListener("click", () => {
    importModal?.classList.add("hidden");
  });

  dropZone?.addEventListener("click", () => {
    importFile?.click();
  });

  dropZone?.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("dragover");
  });

  dropZone?.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
  });

  dropZone?.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    if (e.dataTransfer.files.length) {
      handleImport(e.dataTransfer.files[0]);
    }
  });

  importFile?.addEventListener("change", e => {
    if (e.target.files.length) {
      handleImport(e.target.files[0]);
    }
    e.target.value = "";
  });

  /* ── Modal Listeners ────────────────────────────────── */
  document.getElementById("modal-save").onclick = () => {
    const n = document.getElementById("modal-name").value.trim();
    let   u = document.getElementById("modal-url").value.trim();
    if (!n || !u) return;
    if (!u.startsWith("http")) u = "https://" + u;
    if (editingIndex !== null) shortcuts[editingIndex] = { name: n, url: u };
    else shortcuts.push({ name: n, url: u });
    chrome.storage.local.set({ myShortcuts: shortcuts }, () => {
      renderShortcuts();
      modal.classList.add("hidden");
    });
  };

  document.getElementById("modal-delete").onclick = () => {
    if (editingIndex !== null) {
      shortcuts.splice(editingIndex, 1);
      chrome.storage.local.set({ myShortcuts: shortcuts }, () => {
        renderShortcuts();
        modal.classList.add("hidden");
      });
    }
  };

  document.getElementById("modal-cancel").onclick = () => modal.classList.add("hidden");
});
