(function(){
  const burger = document.querySelector('.mobile-burger');
  const menu = document.querySelector('.mobile-menu');
  if (!burger || !menu) return;

  const inIframe = window.self !== window.top;

  // Move menu out of header in normal mode so it can overlay the page
  if (!inIframe && menu.closest && menu.closest('header')) {
    document.body.appendChild(menu);
    Object.assign(menu.style, { position: 'fixed', zIndex: '99999', right: menu.style.right || '16px' });
  }

  if (inIframe) {
    menu.classList.add('iframe-mode');
    const headerEl = document.querySelector('header');
    if (headerEl) Object.assign(headerEl.style, { overflow: 'visible', height: 'auto', maxHeight: 'none' });
    if (burger.parentNode && menu.parentNode !== burger.parentNode) burger.parentNode.insertBefore(menu, burger.nextSibling);
    document.querySelectorAll('a[href]').forEach(a => a.setAttribute('target','_top'));
  }

  function setOpen(open){
    menu.classList.toggle('open', open);
    burger.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    menu.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open && !inIframe) positionMenu();
    if (!open && !inIframe) menu.style.display = 'none';
    if (open && !inIframe) menu.style.display = 'flex';
  }

  function positionMenu(){
    try{
      const r = burger.getBoundingClientRect();
      const right = Math.max(window.innerWidth - r.right, 12);
      Object.assign(menu.style, { position: 'fixed', top: (r.bottom + 8) + 'px', right: right + 'px', left: 'auto', zIndex: '99999', display: 'flex' });
    }catch(e){ menu.style.display = 'flex'; }
  }

  burger.addEventListener('click', e => { e.stopPropagation(); setOpen(!menu.classList.contains('open')); });

  document.addEventListener('click', e => {
    if (menu.classList.contains('open') && !menu.contains(e.target) && !burger.contains(e.target)) setOpen(false);
  });

  document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });

  menu.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (inIframe) {
      try { window.top.location.href = href; } catch(err) {}
      e.preventDefault();
      setOpen(false);
    } else {
      setOpen(false);
    }
  });
})();
