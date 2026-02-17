export const UI = {
    renderClock: () => {
        const timeEl = document.getElementById('clock-time');
        const dateEl = document.getElementById('clock-date');
        const now = new Date();
        timeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        dateEl.textContent = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
    },

    renderTasks: () => {
        const list = document.getElementById('task-list');
        const tasks = [
            { text: "Review Pull Requests", done: false },
            { text: "Update Documentation", done: true },
            { text: "Team Standup", done: false },
            { text: "Fix CSS Grid bug", done: false }
        ];
        list.innerHTML = tasks.map(t => `
            <li>
                <input type="checkbox" ${t.done ? 'checked' : ''}>
                <span style="${t.done ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${t.text}</span>
            </li>
        `).join('');
    },

    /**
     * Renders the shortcut grid based on an array of objects
     * @param {Array} shortcuts - [{ title, url }]
     */
    renderShortcuts: (shortcuts) => {
        const grid = document.getElementById('shortcuts-grid');

        let html = shortcuts.map(s => {
            // Use Google's favicon service for easy icons
            const iconUrl = `https://www.google.com/s2/favicons?sz=64&domain_url=${s.url}`;
            return `
            <a href="${s.url}" class="shortcut-item">
                <img src="${iconUrl}" alt="icon">
                <span>${s.title}</span>
            </a>
            `;
        }).join('');

        // Only show Add button if less than 9 items
        if (shortcuts.length < 9) {
            html += `<div id="open-modal-btn" class="add-shortcut" title="Add Shortcut">+</div>`;
        }

        grid.innerHTML = html;
    },

    renderSuggestions: (bookmarks) => {
        const container = document.getElementById('search-suggestions');

        if (!bookmarks || bookmarks.length === 0) {
            container.classList.remove('active');
            container.innerHTML = '';
            return;
        }

        const html = bookmarks.map(b => `
            <a href="${b.url}" class="suggestion-item">
                <span>${b.title}</span>
                <span class="url">${new URL(b.url).hostname}</span>
            </a>
        `).join('');

        container.innerHTML = html;
        container.classList.add('active');
    }
};