// Loads header.html into the page and then loads menu.js
(async function(){
  const placeholder = document.getElementById('site-header');

  // If running from the local filesystem, avoid fetch (often blocked) and use an iframe fallback.
  if (window.location && window.location.protocol === 'file:') {
    if (placeholder) {
      const iframe = document.createElement('iframe');
      iframe.src = 'header.html';
      iframe.title = 'site header';
      iframe.style.width = '100%';
      iframe.style.height = '64px';
      iframe.style.border = '0';
      iframe.loading = 'eager';
      placeholder.appendChild(iframe);
    }
    return;
  }

  try {
    const resp = await fetch('header.html');
    if (!resp.ok) {
      if (placeholder) {
        const iframe = document.createElement('iframe');
        iframe.src = 'header.html';
        iframe.title = 'site header';
        iframe.style.width = '100%';
        iframe.style.height = '64px';
        iframe.style.border = '0';
        iframe.loading = 'eager';
        placeholder.appendChild(iframe);
      }
      return;
    }
    const html = await resp.text();
    if (placeholder) {
      placeholder.innerHTML = html;
      // load menu script after header inserted
      const s = document.createElement('script');
      s.src = 'js/menu.js';
      document.body.appendChild(s);
    }
  } catch (e) {
    // suppress noisy warning — use iframe fallback instead
    if (placeholder) {
      const iframe = document.createElement('iframe');
      iframe.src = 'header.html';
      iframe.title = 'site header';
      iframe.style.width = '100%';
      iframe.style.height = '64px';
      iframe.style.border = '0';
      iframe.loading = 'eager';
      placeholder.appendChild(iframe);
    }
  }
})();
