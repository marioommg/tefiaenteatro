(function() {
  try {
    // Allow preview toggle via URL: ?preview=1 enables (persist in localStorage). Optional: ?preview=0 disables
    var params = new URLSearchParams(window.location.search);
    if (params.has('preview')) {
      var v = params.get('preview');
      if (v === '1' || v === 'true' || v === 'on') {
        try { localStorage.setItem('tefia:preview', '1'); } catch {}
      } else if (v === '0' || v === 'false' || v === 'off') {
        try { localStorage.removeItem('tefia:preview'); } catch {}
      }
      // Clean the URL (keep path and hash)
      try {
        var cleanUrl = window.location.origin + window.location.pathname + (window.location.hash || '');
        history.replaceState(null, '', cleanUrl);
      } catch {}
    }

    // If preview bypass is enabled, do nothing
    var bypass = false;
    try { bypass = localStorage.getItem('tefia:preview') === '1'; } catch {}
    if (bypass) return;

    // Normalize current path (strip trailing slash except root)
    var path = window.location.pathname.replace(/\/+$/,'');
    if (path === '') path = '/';

    // Allowed prefixes (no redirect)
    var allowed = [
      '/fortis-imaginatio',
      '/privacy-policy',
      '/aviso-legal',
      '/cookies-policy',
      '/contacto'
    ];

    var isAllowed = allowed.some(function(prefix) {
      return path === prefix || path === prefix + '/' || path.startsWith(prefix + '/');
    });

    // Dynamic exception for Revision flow
    var isRevisionEntry = path === '/revisar-elenco' && params.has('acceso');
    var isRevisionSession = false;
    try { isRevisionSession = path.startsWith('/revision/') && sessionStorage.getItem('actorMode') === '1'; } catch(e) {}
    
    if (isRevisionEntry || isRevisionSession) {
      isAllowed = true;
    }

    // Redirect everything else to Fortis Imaginatio
    if (!isAllowed) {
      var target = '/fortis-imaginatio/';
      if (path !== '/fortis-imaginatio' && path !== '/fortis-imaginatio/') {
        window.location.replace(target);
      }
    }
  } catch (e) {
    // Fail-safe: never block the page if something goes wrong
  }
})();
