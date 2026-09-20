/* ============================================================
   progress.js — Tasks & Progress Ring Tracker
   ============================================================ */

const TASK_STORAGE_KEY = "ytabTasks";

let tasks = [];

function loadTasks(cb) {
  chrome.storage.local.get([TASK_STORAGE_KEY], res => {
    tasks = res[TASK_STORAGE_KEY] || [
      { id: 1, text: "Drink water 💧", done: false },
      { id: 2, text: "Check email ✉️", done: false }
    ];
    cb && cb();
  });
}

function saveTasks() {
  chrome.storage.local.set({ [TASK_STORAGE_KEY]: tasks }, () => {
    updateProgressRing();
  });
}

function updateProgressRing() {
  const ringPct = document.getElementById("ring-pct");
  if (!ringPct) return;

  if (!tasks.length) {
    ringPct.textContent = "0%";
    ringPct.classList.remove("complete");
    return;
  }

  const completed = tasks.filter(t => t.done).length;
  const pct = Math.round((completed / tasks.length) * 100);

  ringPct.textContent = pct === 100 ? "✓" : `${pct}%`;
  if (pct === 100) {
    ringPct.classList.add("complete");
  } else {
    ringPct.classList.remove("complete");
  }
}

function renderTaskList() {
  const listEl = document.getElementById("task-list");
  if (!listEl) return;
  listEl.innerHTML = "";

  if (!tasks.length) {
    listEl.innerHTML = `<div style="font-size:12px;color:rgba(255,255,255,0.4);text-align:center;padding:12px 0;">No tasks yet. Add one above!</div>`;
    return;
  }

  tasks.forEach((t, index) => {
    const item = document.createElement("div");
    item.className = "task-item" + (t.done ? " completed" : "");
    item.innerHTML = `
      <input type="checkbox" ${t.done ? "checked" : ""} />
      <span>${escText(t.text)}</span>
      <button class="task-del-btn" title="Delete task">&times;</button>
    `;

    item.querySelector("input").onchange = e => {
      tasks[index].done = e.target.checked;
      saveTasks();
      renderTaskList();
    };

    item.querySelector(".task-del-btn").onclick = () => {
      tasks.splice(index, 1);
      saveTasks();
      renderTaskList();
    };

    listEl.appendChild(item);
  });
}

function escText(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function addTaskFromInput() {
  const input = document.getElementById("task-input");
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;

  tasks.push({ id: Date.now(), text, done: false });
  input.value = "";
  saveTasks();
  renderTaskList();
}

function initProgress() {
  const progWidget = document.getElementById("progress-widget");
  const taskPanel  = document.getElementById("task-panel");
  const closeBtn   = document.getElementById("task-panel-close");
  const addBtn     = document.getElementById("task-add-btn");
  const input      = document.getElementById("task-input");

  if (!progWidget) return;

  progWidget.addEventListener("click", () => {
    if (taskPanel.classList.contains("hidden")) {
      renderTaskList();
      taskPanel.classList.remove("hiding", "hidden");
    } else {
      taskPanel.classList.add("hiding");
      setTimeout(() => {
        taskPanel.classList.add("hidden");
        taskPanel.classList.remove("hiding");
      }, 220);
    }
  });

  closeBtn?.addEventListener("click", () => {
    taskPanel.classList.add("hiding");
    setTimeout(() => {
      taskPanel.classList.add("hidden");
      taskPanel.classList.remove("hiding");
    }, 220);
  });

  addBtn?.addEventListener("click", addTaskFromInput);
  input?.addEventListener("keypress", e => {
    if (e.key === "Enter") addTaskFromInput();
  });

  loadTasks(() => {
    updateProgressRing();
    if (window.lucide) {
      window.lucide.createIcons();
    }
  });
}

document.addEventListener("DOMContentLoaded", initProgress);
