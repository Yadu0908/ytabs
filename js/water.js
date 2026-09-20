/* ============================================================
   water.js — Hydration Reminder for ytabs New Tab Extension
   ============================================================
   - Shows on every new tab open (once, immediately)
   - Re-appears every 30 minutes while the tab is open
   - Tracks daily sips (max 8 dots shown)
   - Resets at midnight each day
   ============================================================ */

const WATER_STORAGE_KEY = "waterReminder";
const MAX_DOTS          = 8;          // dots shown in the streak row
const REMIND_INTERVAL   = 30 * 60 * 1000; // 30 minutes in ms
const GIF_URL           = "https://media.giphy.com/media/6zzIipmh15d0XXQbSG/giphy.gif";

// ── State ────────────────────────────────────────────────────
let waterState = { sips: 0, date: "" };
let reminderTimer = null;

// ── Helpers ──────────────────────────────────────────────────
function todayString() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function loadState(cb) {
  chrome.storage.local.get([WATER_STORAGE_KEY], (res) => {
    const saved = res[WATER_STORAGE_KEY] || {};
    const today = todayString();

    // Reset if it's a new day
    if (saved.date !== today) {
      waterState = { sips: 0, date: today };
      saveState();
    } else {
      waterState = { sips: saved.sips || 0, date: today };
    }
    cb && cb();
  });
}

function saveState() {
  chrome.storage.local.set({ [WATER_STORAGE_KEY]: waterState });
}

// ── DOM helpers ───────────────────────────────────────────────
function getWidget() { return document.getElementById("water-popup"); }

function renderDots() {
  const container = document.getElementById("sip-dots");
  if (!container) return;
  container.innerHTML = "";

  for (let i = 0; i < MAX_DOTS; i++) {
    const dot = document.createElement("div");
    dot.className = "sip-dot" + (i < waterState.sips ? " filled" : "");
    dot.title = i < waterState.sips ? `Sip #${i + 1} ✓` : `Sip #${i + 1}`;
    container.appendChild(dot);
  }
}

function updateCountLabel() {
  const el = document.getElementById("sip-count");
  if (el) el.textContent = waterState.sips;
}

// ── Widget show / hide ────────────────────────────────────────
function showWidget() {
  const w = getWidget();
  if (!w) return;

  // Re-render with fresh state
  renderDots();
  updateCountLabel();

  // Re-trigger entrance animation
  w.classList.remove("hiding");
  w.classList.remove("hidden");

  // Force reflow so animation replays
  void w.offsetWidth;
  w.style.animation = "none";
  void w.offsetWidth;
  w.style.animation = "";
}

function hideWidget(animate = true) {
  const w = getWidget();
  if (!w) return;

  if (animate) {
    w.classList.add("hiding");
    setTimeout(() => {
      w.classList.add("hidden");
      w.classList.remove("hiding");
    }, 260);
  } else {
    w.classList.add("hidden");
  }
}

// ── Sip logging ───────────────────────────────────────────────
function logSip() {
  if (waterState.sips >= MAX_DOTS * 3) return; // no hard cap but cap dots at MAX_DOTS

  waterState.sips += 1;
  saveState();
  updateCountLabel();

  // Animate the newly filled dot
  const dots = document.querySelectorAll(".sip-dot");
  const targetIndex = Math.min(waterState.sips - 1, MAX_DOTS - 1);
  const dot = dots[targetIndex];

  if (dot) {
    dot.classList.add("filled");

    // Ripple effect
    const ripple = document.createElement("div");
    ripple.className = "dot-ripple";
    dot.appendChild(ripple);
    setTimeout(() => ripple.remove(), 700);

    // Pulse
    dot.classList.add("pulsing");
    setTimeout(() => dot.classList.remove("pulsing"), 550);
  }

  // If we exceeded MAX_DOTS, re-render to show overflow dots
  if (waterState.sips > MAX_DOTS) {
    renderDots();
  }

  // Show a small "Great job!" feedback if they hit milestones
  if (waterState.sips === MAX_DOTS) {
    showSnoozeMsg("🎉 Great hydration today!");
  }
}

// ── Snooze / toast message ────────────────────────────────────
function showSnoozeMsg(text) {
  // Remove any existing
  const old = document.getElementById("water-snooze-msg");
  if (old) old.remove();

  const msg = document.createElement("div");
  msg.id = "water-snooze-msg";
  msg.className = "water-snooze-msg";
  msg.textContent = text;
  document.body.appendChild(msg);
  setTimeout(() => {
    msg.style.opacity = "0";
    msg.style.transition = "opacity 0.4s ease";
    setTimeout(() => msg.remove(), 400);
  }, 2200);
}

// ── 30-minute recurring reminder ──────────────────────────────
function scheduleReminder() {
  if (reminderTimer) clearInterval(reminderTimer);
  reminderTimer = setInterval(() => {
    // Reload state from storage (another tab may have updated it)
    loadState(() => {
      showWidget();
    });
  }, REMIND_INTERVAL);
}

// ── Initialization ────────────────────────────────────────────
function initWaterReminder() {
  const w = getWidget();
  if (!w) return;

  // Wire up buttons
  document.getElementById("log-sip-btn")?.addEventListener("click", logSip);

  document.getElementById("water-popup-close")?.addEventListener("click", () => {
    hideWidget(true);
  });

  // Cat click opens water popup
  document.getElementById("cat-widget")?.addEventListener("click", () => {
    const pop = document.getElementById("water-popup");
    if (pop) {
      if (pop.classList.contains("hidden")) {
        showWidget();
      } else {
        hideWidget(true);
      }
    }
  });

  // Load today's data and schedule reminder badge
  loadState(() => {
    renderDots();
    updateCountLabel();
    scheduleReminder();
  });
}

// ── Bootstrap ─────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", initWaterReminder);
