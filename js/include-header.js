// Loads header.html into the page and then loads menu.js
(async function(){
  const placeholder = document.getElementById('site-header');

  // Helper to create an iframe that auto-resizes to its content so dropdowns are visible
  function makeHeaderIframe(src) {
    const iframe = document.createElement('iframe');
    iframe.src = src;
    iframe.title = 'site header';
    iframe.style.width = '100%';
    iframe.style.border = '0';
    iframe.style.display = 'block';
    iframe.style.overflow = 'visible';
    iframe.loading = 'eager';
    iframe.style.minHeight = '50px';

    iframe.addEventListener('load', () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        iframe.style.height = '50px';
        resize();
        // const resize = () => {
        //   const h = Math.max(doc.documentElement.scrollHeight || 0, doc.body.scrollHeight || 0, 64);
        //   iframe.style.height = h + 'px';
        // };
        // resize();
        const mo = new MutationObserver(resize);
        mo.observe(doc.documentElement, { childList: true, subtree: true, attributes: true, characterData: true });
      } catch (err) {
        iframe.style.height = '50px';
      }
    });

    return iframe;
  }

  // If running from the local filesystem, avoid fetch (often blocked) and use an iframe fallback.
  if (window.location && window.location.protocol === 'file:') {
    if (placeholder) {
      const iframe = makeHeaderIframe('header.html');
      placeholder.appendChild(iframe);
    }
    return;
  }

  try {
    const resp = await fetch('header.html');
    if (!resp.ok) {
      if (placeholder) {
        const iframe = makeHeaderIframe('header.html');
        placeholder.appendChild(iframe);
      }
      return;
    }
    const text = await resp.text();
    // If header.html contains a full document, parse and extract the header element.
    let headerContent = text;
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');
      const el = doc.querySelector('header');
      if (el) headerContent = el.outerHTML;
    } catch (pe) {
      // parsing failed, fall back to raw text
    }

    if (placeholder) {
      placeholder.innerHTML = headerContent;
      // load menu script after header inserted
      const s = document.createElement('script');
      s.src = 'js/menu.js';
      document.body.appendChild(s);
    }
  } catch (e) {
    // fallback to iframe if fetch or parsing fails
    if (placeholder) {
      const iframe = makeHeaderIframe('header.html');
      placeholder.appendChild(iframe);
    }
  }
})();
