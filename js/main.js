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
    div.innerHTML = `
      <button class="edit-dots" title="Edit shortcut">${DOTS_ICON}</button>
      <div class="icon-box"><img src="${icon}" alt=""></div>
      <div class="label">${escHtml(s.name)}</div>
    `;

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
  addBtn.innerHTML = `<div class="icon-box">${NEW_PLUS_ICON}</div><div class="label">Add shortcut</div>`;
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

/* ── Initialization ──────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  // Load shortcuts
  chrome.storage.local.get(["myShortcuts", "bgHue", "bgNoise"], res => {
    shortcuts = res.myShortcuts || [
      { name: "Reddit",    url: "https://reddit.com" },
      { name: "Github",    url: "https://github.com" },
      { name: "Claude",    url: "https://claude.ai" },
      { name: "Youtube",   url: "https://youtube.com" }
    ];
    renderShortcuts();
    
    // Apply Settings
    const hue = res.bgHue !== undefined ? res.bgHue : 220;
    const noise = res.bgNoise !== undefined ? res.bgNoise : true;
    const showQuote = res.showQuote !== undefined ? res.showQuote : true;
    
    document.documentElement.style.setProperty("--bg-hue", hue);
    document.documentElement.style.setProperty("--bg-noise-opacity", noise ? 0.05 : 0);
    document.getElementById("hue-slider").value = hue;
    document.getElementById("noise-toggle").checked = noise;
    document.getElementById("quote-toggle").checked = showQuote;
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

  document.getElementById("hue-slider")?.addEventListener("input", (e) => {
    const val = e.target.value;
    document.documentElement.style.setProperty("--bg-hue", val);
    chrome.storage.local.set({ bgHue: val });
  });

  document.getElementById("noise-toggle")?.addEventListener("change", (e) => {
    const val = e.target.checked;
    document.documentElement.style.setProperty("--bg-noise-opacity", val ? 0.05 : 0);
    chrome.storage.local.set({ bgNoise: val });
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
