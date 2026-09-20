/* ============================================================
   main.js — Core logic for YTab 2.0 New Tab Extension
   Features:
   - Shortcut rendering + editing (add/remove/edit)
   - Drag-and-drop reordering
   - Show shortcuts toggle + max-row limit
   - Theme / colour picker
   - Export & Import shortcuts (JSON)
   ============================================================ */

/* ── Data ────────────────────────────────────────────── */
let shortcuts = [];
let editingIndex = null;
let settings = { showShortcuts: true, maxRows: 3 };
let dragSrcIndex = null;

const NEW_PLUS_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
  <path d="M0 0h24v24H0z" fill="none"/>
  <path fill="currentColor" d="M11.5 12.5h-5q-.213 0-.356-.144T6 11.999t.144-.356t.356-.143h5v-5q0-.213.144-.356T12.001 6t.356.144t.143.356v5h5q.213 0 .356.144t.144.357t-.144.356t-.356.143h-5v5q0 .213-.144.356t-.357.144t-.356-.144t-.143-.356z"/>
</svg>`;

const DOTS_ICON = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>`;

const themePresets = [
  { c1: "#0d1b2e", c2: "#1a2540", c3: "#1e2d45", c4: "#060d1a" },
  { c1: "#202124", c2: "#28292c", c3: "#3c4043", c4: "#1a1a1a" },
  { c1: "#2b3648", c2: "#354052", c3: "#313a49", c4: "#242626" },
  { c1: "#ffffff", c2: "#f8f9fa", c3: "#f1f3f4", c4: "#dee1e6" },
  { c1: "#1a73e8", c2: "#d2e3fc", c3: "#e8f0fe", c4: "#185abc" },
  { c1: "#0d652d", c2: "#e6f4ea", c3: "#ceead6", c4: "#073d1c" },
  { c1: "#a50e0e", c2: "#fce8e6", c3: "#fad2cf", c4: "#610808" },
  { c1: "#e37400", c2: "#feefe3", c3: "#fdd0b5", c4: "#8c4b00" },
  { c1: "#af52de", c2: "#f3e8fd", c3: "#e1bee7", c4: "#2d1a38" },
  { c1: "#007b83", c2: "#e0f2f1", c3: "#b2dfdb", c4: "#004a4f" },
  { c1: "#ff8bcb", c2: "#fce8f3", c3: "#f8bbd0", c4: "#3a1a2a" },
  { c1: "#424242", c2: "#f5f5f5", c3: "#eeeeee", c4: "#212121" },
];

const sidebar   = document.getElementById("customizer-sidebar");
const grid      = document.getElementById("shortcuts-grid");
const themeGrid = document.getElementById("theme-presets");
const modal     = document.getElementById("modal-overlay");

/* ── Theme ───────────────────────────────────────────── */
function applyTheme(mode, color) {
  let targetMode = mode;
  if (mode === "device") {
    targetMode = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  const preset = themePresets.find(p => p.c1.toLowerCase() === color.toLowerCase());
  const sidebarColor = preset ? preset.c2 : color;
  const tileColor    = preset ? preset.c3 : "rgba(128,128,128,0.2)";
  const outerColor   = preset ? preset.c4 : "#1a1a1a";

  document.documentElement.setAttribute("data-theme", targetMode);
  document.documentElement.style.setProperty("--bg-color",    color);
  document.documentElement.style.setProperty("--side-bg",     sidebarColor);
  document.documentElement.style.setProperty("--tile-bg",     tileColor);
  document.documentElement.style.setProperty("--outer-shell", outerColor);

  document.querySelectorAll(".segmented-control button").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });
  document.querySelectorAll(".theme-box-wrapper").forEach(wrapper => {
    wrapper.classList.toggle("active", wrapper.dataset.color === color);
  });
  chrome.storage.local.set({ userTheme: { mode, color } });
}

function renderAppearanceUI() {
  if (!themeGrid) return;
  themeGrid.innerHTML = "";
  themePresets.forEach(p => {
    const wrapper = document.createElement("div");
    wrapper.className = "theme-box-wrapper";
    wrapper.dataset.color = p.c1;
    wrapper.style.backgroundColor = p.c4;
    wrapper.innerHTML = `<div class="theme-box split-bg" style="--c1:${p.c1}; --c2:${p.c2}; --c3:${p.c3};"></div>`;
    wrapper.onclick = () => {
      chrome.storage.local.get(["userTheme"], res =>
        applyTheme(res.userTheme?.mode || "dark", p.c1)
      );
    };
    themeGrid.appendChild(wrapper);
  });

  const customWrapper = document.createElement("div");
  customWrapper.className = "theme-box-wrapper";
  customWrapper.innerHTML = `
    <div class="theme-box custom-picker-box" style="background:#4285f4;color:white;">
      ${NEW_PLUS_ICON}
      <input type="color" id="custom-color-picker">
    </div>`;
  customWrapper.querySelector("input").oninput = e =>
    applyTheme("dark", e.target.value);
  themeGrid.appendChild(customWrapper);
}

/* ── Shortcuts rendering ─────────────────────────────── */
function renderShortcuts() {
  if (!grid) return;
  grid.innerHTML = "";

  const container = document.querySelector(".container");
  if (container) {
    container.style.display = settings.showShortcuts ? "" : "none";
  }

  shortcuts.forEach((s, index) => {
    const div = document.createElement("div");
    div.className = "shortcut-item";
    div.dataset.index = index;
    div.draggable = true;

    const icon = `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(s.url)}&size=64`;
    div.innerHTML = `
      <button class="edit-dots" title="Edit shortcut">${DOTS_ICON}</button>
      <div class="icon-box"><img src="${icon}" alt=""></div>
      <div class="label">${escHtml(s.name)}</div>
    `;

    // Navigate on click
    div.onclick = e => {
      if (e.target.closest(".edit-dots")) return;
      window.location.href = s.url;
    };

    // Edit dots
    div.querySelector(".edit-dots").onclick = e => {
      e.stopPropagation();
      openModal(index);
    };

    // Right-click
    div.oncontextmenu = e => { e.preventDefault(); openModal(index); };

    // ─── Drag and drop ───────────────────────────────────
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
        chrome.storage.local.set({ myShortcuts: shortcuts }, () => renderShortcuts());
      }
    });

    grid.appendChild(div);
  });

  // Apply max-rows height limit
  applyRowLimit();

  // Add shortcut button (not draggable)
  const addBtn = document.createElement("div");
  addBtn.className = "shortcut-item add-btn";
  addBtn.innerHTML = `<div class="icon-box">${NEW_PLUS_ICON}</div><div class="label">Add shortcut</div>`;
  addBtn.onclick = () => openModal(null);
  grid.appendChild(addBtn);
}

function applyRowLimit() {
  const firstItem = grid.querySelector(".shortcut-item");
  if (!firstItem) return;
  const itemH = firstItem.offsetHeight || 110;
  const gapH  = 35;
  grid.style.maxHeight = `${settings.maxRows * (itemH + gapH)}px`;
  grid.style.overflow  = "hidden";
}

function escHtml(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

/* ── Show shortcuts toggle ───────────────────────────── */
function applyShowShortcuts(show) {
  settings.showShortcuts = show;
  const container = document.querySelector(".container");
  if (container) container.style.display = show ? "" : "none";
}

/* ── Row stepper UI ──────────────────────────────────── */
function updateRowsDisplay() {
  const el = document.getElementById("rows-value");
  if (el) el.textContent = settings.maxRows;
}

/* ── Export Shortcuts ────────────────────────────────── */
function exportShortcuts() {
  if (!shortcuts.length) { showToast("⚠️ No shortcuts to export"); return; }
  const data   = JSON.stringify(shortcuts, null, 2);
  const blob   = new Blob([data], { type: "application/json" });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement("a");
  a.href       = url;
  a.download   = "ytabs-shortcuts.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast("✅ Shortcuts exported!");
}

/* ── Import Shortcuts ────────────────────────────────── */
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
          showToast(`✅ Imported ${shortcuts.length} shortcuts!`);
        });
      } else {
        showToast("❌ Invalid file format");
      }
    } catch {
      showToast("❌ Error reading file");
    }
  };
  reader.readAsText(file);
}

/* ── Toast helper ────────────────────────────────────── */
function showToast(text) {
  const old = document.getElementById("ytab-toast");
  if (old) old.remove();
  const t = document.createElement("div");
  t.id = "ytab-toast";
  t.className = "ytab-toast";
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.opacity = "0";
    t.style.transition = "opacity 0.4s";
    setTimeout(() => t.remove(), 400);
  }, 2400);
}

/* ── Modal ───────────────────────────────────────────── */
function openModal(i) {
  editingIndex = i;
  const nIn   = document.getElementById("modal-name");
  const uIn   = document.getElementById("modal-url");
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

/* ── DOMContentLoaded ────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  // Load everything from storage at once
  chrome.storage.local.get(["myShortcuts","userTheme","ytabSettings"], res => {
    shortcuts = res.myShortcuts || [{ name: "GitHub", url: "https://github.com" }];
    settings  = Object.assign({ showShortcuts: true, maxRows: 3 }, res.ytabSettings || {});

    renderShortcuts();
    renderAppearanceUI();

    const theme = res.userTheme || { mode: "dark", color: "#0d1b2e" };
    applyTheme(theme.mode, theme.color);

    // Apply show-shortcuts toggle state
    const showToggle = document.getElementById("show-shortcuts-toggle");
    if (showToggle) {
      showToggle.checked = settings.showShortcuts;
      applyShowShortcuts(settings.showShortcuts);
    }
    updateRowsDisplay();
  });

  /* ── Sidebar toggle ─────────────────────────────────── */
  document.getElementById("sidebar-toggle").onclick = () => sidebar.classList.add("active");
  document.getElementById("close-sidebar").onclick  = () => sidebar.classList.remove("active");

  /* ── Theme mode buttons ─────────────────────────────── */
  document.querySelectorAll(".segmented-control button").forEach(btn => {
    btn.onclick = () => {
      const mode = btn.dataset.mode;
      chrome.storage.local.get(["userTheme"], res => {
        const color = res.userTheme?.color || (mode === "light" ? "#ffffff" : "#0d1b2e");
        applyTheme(mode, color);
      });
    };
  });

  /* ── Show shortcuts toggle ──────────────────────────── */
  document.getElementById("show-shortcuts-toggle")?.addEventListener("change", e => {
    settings.showShortcuts = e.target.checked;
    applyShowShortcuts(settings.showShortcuts);
    chrome.storage.local.set({ ytabSettings: settings });
  });

  /* ── Row stepper ────────────────────────────────────── */
  document.getElementById("rows-minus")?.addEventListener("click", () => {
    if (settings.maxRows <= 1) return;
    settings.maxRows--;
    updateRowsDisplay();
    applyRowLimit();
    chrome.storage.local.set({ ytabSettings: settings });
  });
  document.getElementById("rows-plus")?.addEventListener("click", () => {
    if (settings.maxRows >= 6) return;
    settings.maxRows++;
    updateRowsDisplay();
    applyRowLimit();
    chrome.storage.local.set({ ytabSettings: settings });
  });

  /* ── Export / Import ────────────────────────────────── */
  document.getElementById("export-btn")?.addEventListener("click", exportShortcuts);

  document.getElementById("import-btn")?.addEventListener("click", () => {
    document.getElementById("import-file").click();
  });
  document.getElementById("import-file")?.addEventListener("change", e => {
    handleImport(e.target.files[0]);
    e.target.value = "";
  });

  /* ── Modal save ─────────────────────────────────────── */
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
