// ui.js

// Using the local file 'icons/add-svgrepo-com.svg'
const ICONS = {
    trash: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>`,
    plusImg: `<img src="icons/add-svgrepo-com.svg" alt="Add" class="custom-add-icon">`,
    globe: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>`
};

export const UI = {
    renderClock: () => {
        const timeEl = document.getElementById('clock-time');
        const dateEl = document.getElementById('clock-date');
        const now = new Date();
        timeEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        dateEl.textContent = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
    },

    renderTasks: (tasks) => {
        const list = document.getElementById('task-list');
        const card = document.querySelector('.task-card');

        list.innerHTML = tasks.map(t => `
            <li>
                <label style="display: flex; align-items: center; width: 100%; cursor: pointer;">
                    <input type="checkbox" class="task-checkbox" data-id="${t.id}" ${t.done ? 'checked' : ''}>
                    <span class="custom-checkbox"></span>
                    <span class="task-text" style="margin-left: 15px;">${t.text}</span>
                </label>
                <button class="delete-task-btn" data-id="${t.id}" title="Delete Task">
                    ${ICONS.trash}
                </button>
            </li>
        `).join('');

        // Inject Floating Action Button (FAB) with Custom Icon
        let btn = document.querySelector('.add-task-btn');
        if(!btn) {
            btn = document.createElement('button');
            btn.className = 'add-task-btn';
            btn.title = "Add Task";
            btn.innerHTML = ICONS.plusImg; // Using the IMG tag
            card.appendChild(btn);
        }
    },

    updateStats: (statsArray) => {
        const container = document.querySelector('.stats-placeholder');
        container.innerHTML = '';

        if (!statsArray || statsArray.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:var(--text-muted); font-size:0.9rem;">No history available.</p>';
            return;
        }

        statsArray.forEach(item => {
            container.innerHTML += `
            <div class="stat-bar">
                <div style="display:flex; justify-content:space-between; margin-bottom:8px; color:var(--text-muted);">
                    <span>${item.label}</span>
                    <span style="color:var(--text-color); font-weight:600;">${item.percent}%</span>
                </div>
                <div class="bar-track">
                    <div class="bar-fill" style="width: ${item.percent}%;"></div>
                </div>
            </div>
            `;
        });
    },

    renderShortcuts: (shortcuts) => {
        const grid = document.getElementById('shortcuts-grid');

        let html = shortcuts.map(s => {
            const iconUrl = `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(s.url)}&size=64`;

            return `
            <a href="${s.url}" class="shortcut-item">
                <img src="${iconUrl}" alt="icon" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                <div class="fallback-icon" style="display:none; width:28px; height:28px; color:var(--accent-color);">${ICONS.globe}</div>
                <span>${s.title}</span>
            </a>
            `;
        }).join('');

        // The "Add" Tile using the custom icon
        if (shortcuts.length < 9) {
            html += `<div id="open-modal-btn" class="add-shortcut" title="Add Shortcut">${ICONS.plusImg}</div>`;
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


// ui.js



/* ... (Rest of ui.js is same as previous, just ensure this CSS is in layout.css) ... */