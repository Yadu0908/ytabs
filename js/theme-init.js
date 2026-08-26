(function () {
  var saved = localStorage.getItem('userMode');
  var pref = saved || 'auto';
  if (pref === 'auto') {
    var dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.setAttribute('data-mode', dark ? 'dark' : 'light');
  } else {
    document.documentElement.setAttribute('data-mode', pref);
  }
  document.documentElement.setAttribute('data-mode-preference', pref);
})();
