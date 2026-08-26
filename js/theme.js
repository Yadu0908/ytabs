import { Storage } from './storage.js';

function syncModeToLocal(mode) {
    try { localStorage.setItem('userMode', mode); } catch (_) {}
}

export async function initTheme() {
    const htmlEl = document.documentElement;
    const modeBtn = document.getElementById('mode-toggle');
    const accentButtons = document.querySelectorAll('[data-set-accent]');
    const systemMedia = window.matchMedia('(prefers-color-scheme: dark)');

    let preferredMode = await Storage.get('userMode') || 'auto';
    const savedAccent = await Storage.get('userAccent') || 'blue';

    function setAppliedMode(mode) {
        htmlEl.setAttribute('data-mode', mode);
    }

    function setAccent(accent) {
        htmlEl.setAttribute('data-accent', accent);
        Storage.set('userAccent', accent);
    }

    function persistPreference(pref) {
        preferredMode = pref;
        htmlEl.setAttribute('data-mode-preference', pref);
        Storage.set('userMode', pref);
        syncModeToLocal(pref);
    }

    function applyTheme() {
        if (preferredMode === 'auto') {
            setAppliedMode(systemMedia.matches ? 'dark' : 'light');
        } else {
            setAppliedMode(preferredMode);
        }
    }

    function updateButtonTitle() {
        modeBtn.title = ({
            auto: 'Auto (follow system)',
            dark: 'Switch to Light',
            light: 'Switch to Dark'
        })[preferredMode] || '';
    }

    setAccent(savedAccent);
    applyTheme();
    htmlEl.setAttribute('data-mode-preference', preferredMode);
    updateButtonTitle();

    systemMedia.addEventListener('change', () => {
        if (preferredMode === 'auto') setAppliedMode(systemMedia.matches ? 'dark' : 'light');
    });

    modeBtn.addEventListener('click', () => {
        const next = { auto: 'dark', dark: 'light', light: 'auto' };
        persistPreference(next[preferredMode] || 'auto');
        applyTheme();
        updateButtonTitle();
    });

    accentButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            setAccent(btn.getAttribute('data-set-accent'));
        });
    });
}