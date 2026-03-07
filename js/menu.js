const burger = document.querySelector('.mobile-burger');
const menu = document.querySelector('.mobile-menu');

if (burger && menu) {
  burger.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('open');
    burger.setAttribute('aria-expanded', String(isOpen));
    menu.setAttribute('aria-hidden', String(!isOpen));
    // animate bars (simple transform)
    burger.classList.toggle('open');
  });

  // close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && !burger.contains(e.target) && menu.classList.contains('open')) {
      menu.classList.remove('open');
      burger.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
      menu.setAttribute('aria-hidden', 'true');
    }
  });
}
