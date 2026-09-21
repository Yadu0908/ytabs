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
const grid  = document.getElementById("shortcuts-grid");
const modal = document.getElementById("modal-overlay");

const NEW_PLUS_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
  <path d="M0 0h24v24H0z" fill="none"/>
  <path fill="currentColor" d="M11.5 12.5h-5q-.213 0-.356-.144T6 11.999t.144-.356t.356-.143h5v-5q0-.213.144-.356T12.001 6t.356.144t.143.356v5h5q.213 0 .356.144t.144.357t-.144.356t-.356.143h-5v5q0 .213-.144.356t-.357.144t-.356-.144t-.143-.356z"/>
</svg>`;

const DOTS_ICON = `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>`;

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

  // Add shortcut button (not draggable)
  const addBtn = document.createElement("div");
  addBtn.className = "shortcut-item add-btn";
  addBtn.innerHTML = `<div class="icon-box">${NEW_PLUS_ICON}</div><div class="label">Add shortcut</div>`;
  addBtn.onclick = () => openModal(null);
  grid.appendChild(addBtn);
}

function escHtml(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
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
  chrome.storage.local.get(["myShortcuts"], res => {
    shortcuts = res.myShortcuts || [
      { name: "YouTube", url: "https://youtube.com" },
      { name: "GitHub",  url: "https://github.com" },
      { name: "Gmail",   url: "https://mail.google.com" }
    ];
    renderShortcuts();
  });

  /* ── Modal save / delete / cancel ───────────────────── */
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
