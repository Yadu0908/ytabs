/**
 * theme.js
 * Handles theme switching and persistence.
 */
import { Storage } from './storage.js';

export function initTheme() {
    const themeButtons = document.querySelectorAll('[data-set-theme]');
    const htmlEl = document.documentElement;

    // 1. Event Listeners for theme dots
    themeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const newTheme = btn.getAttribute('data-set-theme');
            setTheme(newTheme);
        });
    });

    /**
     * Applies the theme to the HTML element
     * @param {string} themeName
     */
    function setTheme(themeName) {
        htmlEl.setAttribute('data-theme', themeName);
        Storage.set('userTheme', themeName); // Save preference
    }
}