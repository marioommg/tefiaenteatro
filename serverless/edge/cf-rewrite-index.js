function handler(event) {
  var request = event.request;
  var uri = request.uri || '/';

  // 🚫 No reescribas rutas del API
  if (uri === '/api' || uri.startsWith('/api/')) {
    return request;
  }

  // Normaliza raíz
  if (uri === '/') {
    request.uri = '/index.html';
    return request;
  }

  // Si termina en "/", añade index.html
  if (uri.endsWith('/')) {
    request.uri = uri + 'index.html';
    return request;
  }

  // Si no tiene punto (no hay extensión), trátalo como directorio
  if (uri.indexOf('.') === -1) {
    request.uri = uri + '/index.html';
    return request;
  }

  // Con extensión: no tocar
  return request;
}
