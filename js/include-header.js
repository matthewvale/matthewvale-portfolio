// Simple header include: fetch header.html (or use a small static fallback for file://),
// extract <header>, .mobile-burger and .mobile-menu, insert them into the host document,
// then load `js/menu.js` once.
(async function () {
  const placeholder = document.getElementById('site-header');
  if (!placeholder) return;

  const staticFallback = `
    <header>
      <nav class="main-nav">
        <div class="nav-main">
          <a class="button-style-1" href="index.html">HOME</a>
          <a class="button-style-1" href="personal-games.html">PERSONAL</a>
          <a class="button-style-1" href="professional-games.html">PROFESSIONAL</a>
          <a class="button-style-1" href="feedback.html">TESTIMONIALS</a>
          <a class="button-style-1" href="who-am-i.html">ABOUT ME</a>
        </div>
        <div class="nav-end">
          <a class="button-style-2" href="lets-talk.html">LET'S TALK</a>
        </div>
      </nav>
    </header>
    <div class="mobile-burger" role="button" aria-label="Open menu" aria-expanded="false">
      <span class="bar"></span><span class="bar"></span><span class="bar"></span>
    </div>
    <nav class="mobile-menu" aria-hidden="true">
      <a href="index.html">Home</a>
      <a href="personal-games.html">Personal</a>
      <a href="professional-games.html">Professional</a>
      <a href="feedback.html">Testimonials</a>
      <a href="who-am-i.html">About</a>
      <a href="lets-talk.html">Let's Talk</a>
    </nav>
  `;

  function insertHeader(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const headerEl = doc.querySelector('header');
    const burgerEl = headerEl && headerEl.querySelector('.mobile-burger');
    const menuEl = headerEl && headerEl.querySelector('.mobile-menu');

    // remove burger/menu from header fragment so we can insert them after the placeholder
    if (burgerEl) burgerEl.remove();
    if (menuEl) menuEl.remove();

    // insert header (or fallback raw html if no header element found)
    placeholder.innerHTML = headerEl ? headerEl.outerHTML : html;

    // append burger/menu after placeholder so they live in the top document
    if (burgerEl) placeholder.insertAdjacentElement('afterend', burgerEl);
    if (menuEl) placeholder.insertAdjacentElement('afterend', menuEl);

    // If header fragment didn't include a burger/menu (or they were removed),
    // create simple defaults so the mobile experience still works.
    function createDefaultBurgerAndMenu() {
      const b = document.createElement('div');
      b.className = 'mobile-burger';
      b.setAttribute('role','button');
      b.setAttribute('aria-label','Open menu');
      b.setAttribute('aria-expanded','false');
      b.innerHTML = '<span class="bar"></span><span class="bar"></span><span class="bar"></span>';

      const m = document.createElement('nav');
      m.className = 'mobile-menu';
      m.setAttribute('aria-hidden','true');
      m.innerHTML = `
        <a href="index.html">Home</a>
        <a href="personal-games.html">Personal</a>
        <a href="professional-games.html">Professional</a>
        <a href="feedback.html">Testimonials</a>
        <a href="who-am-i.html">About</a>
        <a href="lets-talk.html">Let's Talk</a>
      `;
      return {b,m};
    }

    if (!document.querySelector('.mobile-burger') || !document.querySelector('.mobile-menu')) {
      const {b,m} = createDefaultBurgerAndMenu();
      // ensure we don't duplicate if one of them already exists
      if (!document.querySelector('.mobile-burger')) placeholder.insertAdjacentElement('afterend', b);
      if (!document.querySelector('.mobile-menu')) placeholder.insertAdjacentElement('afterend', m);
    }

    // ensure menu script is loaded once
    if (!document.querySelector('script[data-included="menu"]')) {
      const s = document.createElement('script');
      s.src = 'js/menu.js';
      s.setAttribute('data-included', 'menu');
      document.body.appendChild(s);
    }
  }

  if (location.protocol === 'file:') {
    insertHeader(staticFallback);
    return;
  }

  try {
    const r = await fetch('header.html');
    if (r.ok) {
      const text = await r.text();
      insertHeader(text);
    } else {
      insertHeader(staticFallback);
    }
  } catch (err) {
    insertHeader(staticFallback);
  }
})();