// Insert a plain static footer into pages. No fetch, no iframe — simple and predictable.
(function(){
  const placeholder = document.getElementById('site-footer');
  if (!placeholder) return;

  placeholder.innerHTML = `
    <footer>
      <div class="footer-container">
        <div class="footer-section">
          <h3>Portfolio last updated:</h3>
          <i>September 2026</i>
        </div>
      </div>
    </footer>
  `;
})();
