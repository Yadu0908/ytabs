import { Storage } from './storage.js';

export async function initTheme() {
    const htmlEl = document.documentElement;
    const modeBtn = document.getElementById('mode-toggle');
    const accentButtons = document.querySelectorAll('[data-set-accent]');

    // 1. Load Saved Preferences
    const savedMode = await Storage.get('userMode') || 'dark';
    const savedAccent = await Storage.get('userAccent') || 'blue';

    setMode(savedMode);
    setAccent(savedAccent);

    // 2. Mode Toggle Listener
    modeBtn.addEventListener('click', () => {
        const currentMode = htmlEl.getAttribute('data-mode');
        const newMode = currentMode === 'dark' ? 'light' : 'dark';
        setMode(newMode);
    });

    // 3. Accent Color Listeners
    accentButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const newAccent = btn.getAttribute('data-set-accent');
            setAccent(newAccent);
        });
    });

    function setMode(mode) {
        htmlEl.setAttribute('data-mode', mode);
        Storage.set('userMode', mode);
    }

    function setAccent(accent) {
        htmlEl.setAttribute('data-accent', accent);
        Storage.set('userAccent', accent);
    }
}