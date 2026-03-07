// Loads header.html into the page and then loads menu.js
(async function(){
  // Embedded header fallback for file:// pages (browsers block fetch on file:)
  const embeddedHeader = `<!-- Shared header fragment -->
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

    <!-- Mobile burger button -->
    <div class="mobile-burger" role="button" aria-label="Open menu" aria-expanded="false">
        <span class="bar"></span>
        <span class="bar"></span>
        <span class="bar"></span>
    </div>

    <!-- Mobile menu (hidden by default) -->
    <nav class="mobile-menu" aria-hidden="true">
        <a href="index.html">Home</a>
        <a href="personal-games.html">Personal</a>
        <a href="professional-games.html">Professional</a>
        <a href="feedback.html">Testimonials</a>
        <a href="who-am-i.html">About</a>
        <a href="lets-talk.html">Let's Talk</a>
    </nav>
</header>`;

  try {
    const placeholder = document.getElementById('site-header');
    if (!placeholder) return;

    // If opened via file:// the browser will block fetching local files — use embedded header
    if (window.location.protocol === 'file:') {
      placeholder.innerHTML = embeddedHeader;
      const s = document.createElement('script');
      s.src = 'js/menu.js';
      document.body.appendChild(s);
      console.info('Loaded embedded header (file:// fallback)');
      return;
    }

    // HTTP(s) path: determine base URL relative to this script so fetch works from any page path
    const currentScript = document.currentScript || Array.from(document.scripts).find(s=>s.src&&s.src.includes('include-header.js'));
    const scriptUrl = currentScript && currentScript.src ? currentScript.src : window.location.href;
    const base = scriptUrl.replace(/\\/js\\/include-header\.js(\?.*)?$/, '/');

    const headerUrl = new URL('header.html', base).toString();
    const resp = await fetch(headerUrl);
    if (!resp.ok) {
      console.warn('Failed to fetch header fragment:', resp.status, headerUrl);
      return;
    }
    const html = await resp.text();
    placeholder.innerHTML = html;
    // load menu script after header inserted
    const s = document.createElement('script');
    s.src = new URL('js/menu.js', base).toString();
    document.body.appendChild(s);
  } catch (e) {
    console.warn('Failed to load header fragment', e);
  }
})();
