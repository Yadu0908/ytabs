import { initTheme } from './theme.js';
import { UI } from './ui.js';

// State for shortcuts (In a real app, load this from Storage.get)
let myShortcuts = [
    { title: "GitHub", url: "https://github.com" },
    { title: "YouTube", url: "https://youtube.com" },
    { title: "ChatGPT", url: "https://chatgpt.com" }
];

document.addEventListener('DOMContentLoaded', async () => {

    // 1. Initialize System
    initTheme();

    // 2. Render UI Components
    UI.renderTasks();
    UI.renderClock();
    renderShortcutGrid(); // Use local helper to bind events

    // 3. Start Clock Interval
    setInterval(UI.renderClock, 1000);

    // 4. Setup Features
    setupSearch();
    setupModal();
});

// Helper to render and re-attach event listeners
function renderShortcutGrid() {
    UI.renderShortcuts(myShortcuts);
    const addBtn = document.getElementById('open-modal-btn');
    if(addBtn) {
        addBtn.addEventListener('click', openModal);
    }
}

/* --- MODAL LOGIC --- */
const modal = document.getElementById('modal-overlay');
const nameInput = document.getElementById('modal-name');
const urlInput = document.getElementById('modal-url');

function openModal() {
    modal.classList.remove('hidden');
    nameInput.value = '';
    urlInput.value = '';
    nameInput.focus();
}

function closeModal() {
    modal.classList.add('hidden');
}

function setupModal() {
    document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);

    document.getElementById('modal-save-btn').addEventListener('click', () => {
        const title = nameInput.value.trim();
        let url = urlInput.value.trim();

        if(!title || !url) return;

        // Basic URL fix
        if (!url.startsWith('http')) {
            url = 'https://' + url;
        }

        // Add to state
        myShortcuts.push({ title, url });

        // Re-render
        renderShortcutGrid();
        closeModal();
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
}

/* --- SEARCH LOGIC --- */
function setupSearch() {
    const input = document.getElementById('search-input');
    const suggestionsBox = document.getElementById('search-suggestions');

    // Hide suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !suggestionsBox.contains(e.target)) {
            suggestionsBox.classList.remove('active');
        }
    });

    input.addEventListener('input', (e) => {
        const query = e.target.value.trim();

        if (query.length < 2) {
            suggestionsBox.classList.remove('active');
            return;
        }

        // Check permissions and API availability
        if (chrome.bookmarks) {
            chrome.bookmarks.search(query, (results) => {
                const filtered = results
                    .filter(item => item.url) // Only items with URLs (no folders)
                    .slice(0, 5);

                UI.renderSuggestions(filtered);
            });
        } else {
            console.error("Bookmark permission not active. Reload extension.");
        }
    });
}