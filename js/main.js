import { initTheme } from './theme.js';
import { UI } from './ui.js';
import { Storage } from './storage.js';

let myShortcuts = [];
let myTasks = [];
let editingIndex = null;

const defaultShortcuts = [
    { title: "GitHub", url: "https://github.com" },
    { title: "YouTube", url: "https://youtube.com" }
];

document.addEventListener('DOMContentLoaded', async () => {
    await initTheme();

    // 1. Load Data
    await loadData();

    // 2. Check for New Day & Reset Tasks
    await checkAndResetDailyTasks();

    // 3. Render UI
    renderTasksWrapper();
    UI.renderClock();
    renderShortcutGrid();
    setupRandomQuote();

    setTimeout(calculateRealTimeStats, 500);
    setInterval(UI.renderClock, 1000);

    setupSearch();
    setupShortcutModal();
    setupTaskModal();
});

async function loadData() {
    const storedTasks = await Storage.get('myTasks');
    const storedShortcuts = await Storage.get('myShortcuts');
    myTasks = storedTasks || [];
    myShortcuts = storedShortcuts || defaultShortcuts;
}

async function saveData() {
    await Storage.set('myTasks', myTasks);
    await Storage.set('myShortcuts', myShortcuts);
}

// --- NEW FEATURE: DAILY TASK RESET ---
async function checkAndResetDailyTasks() {
    const today = new Date().toLocaleDateString(); // e.g., "2/20/2025"
    const lastReset = await Storage.get('lastTaskResetDate');

    // If dates don't match (it's a new day)
    if (lastReset !== today) {
        // Reset 'done' status to false for ALL tasks
        myTasks = myTasks.map(t => ({ ...t, done: false }));

        // Save updates
        await Storage.set('myTasks', myTasks);
        await Storage.set('lastTaskResetDate', today);
    }
}

function calculateRealTimeStats() {
    if (!chrome.history) return;
    const twentyFourHoursAgo = (new Date).getTime() - (24 * 60 * 60 * 1000);
    chrome.history.search({ 'text': '', 'startTime': twentyFourHoursAgo, 'maxResults': 2000 }, (historyItems) => {
        const domainCounts = {};
        let totalVisits = 0;
        historyItems.forEach(item => {
            if (!item.url) return;
            try {
                const urlObj = new URL(item.url);
                let hostname = urlObj.hostname.replace('www.', '');
                let name = hostname.split('.')[0];
                if (name.length > 1) name = name.charAt(0).toUpperCase() + name.slice(1);
                domainCounts[name] = (domainCounts[name] || 0) + 1;
                totalVisits++;
            } catch (e) {}
        });
        if (totalVisits === 0) { UI.updateStats([]); return; }
        const sortedDomains = Object.entries(domainCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
        const top3 = sortedDomains.slice(0, 3);
        const othersCount = sortedDomains.slice(3).reduce((sum, item) => sum + item.count, 0);
        const statsData = top3.map(item => ({ label: item.name, percent: Math.round((item.count / totalVisits) * 100) }));
        if (othersCount > 0) statsData.push({ label: 'Others', percent: Math.round((othersCount / totalVisits) * 100) });
        UI.updateStats(statsData);
    });
}

function renderTasksWrapper() {
    UI.renderTasks(myTasks);
    document.querySelectorAll('.delete-task-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.getAttribute('data-id'));
            myTasks = myTasks.filter(t => t.id !== id);
            saveData();
            renderTasksWrapper();
        });
    });
    document.querySelectorAll('.task-checkbox').forEach(box => {
        box.addEventListener('change', (e) => {
            const id = parseInt(e.target.getAttribute('data-id'));
            const task = myTasks.find(t => t.id === id);
            if(task) { task.done = e.target.checked; saveData(); }
            renderTasksWrapper();
        });
    });
}

function setupTaskModal() {
    document.body.addEventListener('click', (e) => {
        if(e.target.closest('.add-task-btn')) openTaskModal();
    });
    const modal = document.getElementById('task-modal-overlay');
    const input = document.getElementById('task-modal-input');
    const saveBtn = document.getElementById('task-modal-save');
    const cancelBtn = document.getElementById('task-modal-cancel');
    const openTaskModal = () => { modal.classList.remove('hidden'); input.value = ''; input.focus(); };
    const close = () => modal.classList.add('hidden');
    const save = () => {
        const text = input.value.trim();
        if (text) { myTasks.push({ id: Date.now(), text: text, done: false }); saveData(); renderTasksWrapper(); close(); }
    };
    cancelBtn.addEventListener('click', close);
    saveBtn.addEventListener('click', save);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') save(); });
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
}

function renderShortcutGrid() {
    UI.renderShortcuts(myShortcuts);

    const addBtn = document.getElementById('open-modal-btn');
    if(addBtn) {
        addBtn.addEventListener('click', () => openShortcutModal(null));
    }

    document.querySelectorAll('.shortcut-edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const index = parseInt(btn.getAttribute('data-index'));
            openShortcutModal(index);
        });
    });
}

const scModal = document.getElementById('modal-overlay');
const scName = document.getElementById('modal-name');
const scUrl = document.getElementById('modal-url');
const scTitle = document.getElementById('shortcut-modal-title');
const scDeleteBtn = document.getElementById('modal-delete-btn');

function openShortcutModal(index) {
    scModal.classList.remove('hidden');
    editingIndex = index;

    if (index !== null) {
        scTitle.textContent = "Edit Shortcut";
        scName.value = myShortcuts[index].title;
        scUrl.value = myShortcuts[index].url;
        scDeleteBtn.classList.remove('hidden');
    } else {
        scTitle.textContent = "Add Shortcut";
        scName.value = '';
        scUrl.value = '';
        scDeleteBtn.classList.add('hidden');
        scName.focus();
    }
}

function setupShortcutModal() {
    document.getElementById('modal-cancel-btn').addEventListener('click', () => scModal.classList.add('hidden'));

    document.getElementById('modal-save-btn').addEventListener('click', () => {
        const title = scName.value.trim();
        let url = scUrl.value.trim();
        if(!title || !url) return;
        if (!url.startsWith('http')) url = 'https://' + url;

        if (editingIndex !== null) {
            myShortcuts[editingIndex] = { title, url };
        } else {
            myShortcuts.push({ title, url });
        }

        saveData();
        renderShortcutGrid();
        scModal.classList.add('hidden');
    });

    scDeleteBtn.addEventListener('click', () => {
        if (editingIndex !== null) {
            myShortcuts.splice(editingIndex, 1);
            saveData();
            renderShortcutGrid();
            scModal.classList.add('hidden');
        }
    });

    scModal.addEventListener('click', (e) => { if (e.target === scModal) scModal.classList.add('hidden'); });
}

function setupRandomQuote() {
    const codingQuotes = ["Code is like humor. When you have to explain it, it’s bad.", "Fix the cause, not the symptom.", "Simplicity is the soul of efficiency.", "Make it work, make it right, make it fast.", "Programming is thinking, not typing."];
    const quoteEl = document.getElementById('quote-text');
    const randomIndex = Math.floor(Math.random() * codingQuotes.length);
    quoteEl.textContent = `"${codingQuotes[randomIndex]}"`;
}

function setupSearch() {
    const input = document.getElementById('search-input');
    const suggestionsBox = document.getElementById('search-suggestions');
    const body = document.body;

    input.addEventListener('focus', () => body.classList.add('search-focus'));
    input.addEventListener('blur', () => {
        setTimeout(() => {
            if (!document.activeElement.closest('.search-suggestions')) {
                body.classList.remove('search-focus');
                suggestionsBox.classList.remove('active');
            }
        }, 200);
    });

    input.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (query.length < 2) {
            suggestionsBox.classList.remove('active');
            return;
        }
        if (chrome.bookmarks) {
            chrome.bookmarks.search(query, (results) => {
                const filtered = results.filter(item => item.url).slice(0, 5);
                if (filtered.length > 0) {
                    UI.renderSuggestions(filtered);
                    suggestionsBox.classList.add('active');
                } else {
                    suggestionsBox.classList.remove('active');
                }
            });
        }
    });
}