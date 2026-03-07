// Loads header.html into the page and then loads menu.js
(async function(){
  try {
    const resp = await fetch('header.html');
    if (!resp.ok) return;
    const html = await resp.text();
    const placeholder = document.getElementById('site-header');
    if (placeholder) {
      placeholder.innerHTML = html;
      // load menu script after header inserted
      const s = document.createElement('script');
      s.src = 'js/menu.js';
      document.body.appendChild(s);
    }
  } catch (e) {
    console.warn('Failed to load header fragment', e);
  }
})();
