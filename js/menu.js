const burger = document.querySelector('.mobile-burger');
const menu = document.querySelector('.mobile-menu');

if (burger && menu) {
  const inIframe = window.self !== window.top;

  if (inIframe) {
    // When header is loaded inside an iframe for local testing,
    // make the mobile menu participate in document flow so the iframe can resize to fit it.
    menu.classList.add('iframe-mode');
    // ensure header can grow when menu opens
    const headerEl = document.querySelector('header');
    if (headerEl) {
      headerEl.style.overflow = 'visible';
      headerEl.style.height = 'auto';
      headerEl.style.maxHeight = 'none';
    }
    // position menu after the burger so it flows downward
    if (burger.parentNode && menu.parentNode !== burger.parentNode) {
      burger.parentNode.insertBefore(menu, burger.nextSibling);
    }

    // Ensure links inside the iframe navigate the top window
    try {
      const links = document.querySelectorAll('a[href]');
      links.forEach(a => {
        a.setAttribute('target', '_top');
        a.addEventListener('click', (ev) => {
          const href = a.getAttribute('href');
          if (href && href.trim() !== '' && href !== '#') {
            // navigate top window and prevent iframe navigation
            try { window.top.location.href = href; } catch (err) { /* ignore */ }
            ev.preventDefault();
          }
        });
      });
    } catch (err) {
      // ignore
    }
  }

  burger.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(isOpen));
    menu.setAttribute('aria-hidden', String(!isOpen));
    // animate bars (simple transform)
    burger.classList.toggle('open');

    if (inIframe) {
      // ensure the menu is visible in-flow for the iframe scenario
      menu.style.display = isOpen ? 'flex' : 'none';
      menu.style.flexDirection = 'column';
      menu.style.gap = '8px';
      menu.style.padding = '8px';
      menu.style.background = 'transparent';
      menu.style.position = 'static';
      menu.style.zIndex = '9999';
    }
  });

  // close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && !burger.contains(e.target) && menu.classList.contains('open')) {
      menu.classList.remove('open');
      burger.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
      menu.setAttribute('aria-hidden', 'true');
      if (inIframe) {
        menu.style.display = 'none';
      }
    }
  });
}
