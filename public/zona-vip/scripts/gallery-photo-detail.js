// gallery-photo-detail.js
// Script para navegación SPA y modal fullscreen en galería VIP

/**
 * @typedef {Object} GalleryItem
 * @property {string} slug
 * @property {string} src
 * @property {string} alt
 * @property {number} width
 * @property {number} height
 * @property {string} file
 * @property {string} [theme]
 * @property {string[]} people
 */

document.addEventListener('DOMContentLoaded', function () {
  var photoDataRaw = document.getElementById('gallery-photo-data');
  /** @type {GalleryItem[]} */
  var photoData = photoDataRaw && photoDataRaw.textContent ? JSON.parse(photoDataRaw.textContent) : [];
  var navButtons = document.querySelectorAll('.photo-nav-button');
  var photoImg = document.getElementById('vip-photo-img');
  var photoTitle = document.querySelector('.photo-title');
  var photoMeta = document.querySelector('.photo-meta');
  var photoFile = document.querySelector('.photo-actions .download-link');
  var photoInfo = document.querySelector('.photo-info');
  var photoVisual = document.querySelector('.photo-visual');
  var photoDescription = document.querySelector('.photo-description');
  var modal = document.getElementById('vip-photo-modal');
  var modalImg = modal ? modal.querySelector('.vip-photo-modal-img') : null;
  var modalBg = modal ? modal.querySelector('.vip-photo-modal-bg') : null;

  /**
   * @param {string} slug
   */
  function updatePhoto(slug) {
    var item = photoData.find(function(entry) { return entry.slug === slug; });
    if (!item) return;
    // Update image
    if (photoImg) {
      photoImg.setAttribute('src', item.src);
      photoImg.setAttribute('alt', item.alt);
      photoImg.setAttribute('width', String(item.width));
      photoImg.setAttribute('height', String(item.height));
      photoImg.setAttribute('tabindex', '0');
      photoImg.setAttribute('loading', 'eager');
      photoImg.setAttribute('decoding', 'async');
    }
    // Update aspect ratio
    var aspectRatio = item.width && item.height ? Number((item.width / item.height).toFixed(6)) : 1.333333;
    if (photoVisual && photoVisual instanceof HTMLElement) photoVisual.style.setProperty('--photo-aspect', String(aspectRatio));
    // Update title
    if (photoTitle && photoTitle instanceof HTMLElement) photoTitle.textContent = item.alt;
    // Update description
    if (photoDescription) photoDescription.textContent = 'Esta fotografía pertenece a la galería exclusiva de Tefía. Aquí puedes verla en detalle y consultar la información asociada.';
    // Update meta
    if (photoMeta) {
      var peopleHtml = '';
      if (item.people.length) {
        peopleHtml = '<ul class="photo-people">' + item.people.map(function(person) { return '<li>' + person + '</li>'; }).join('') + '</ul>';
      } else {
        peopleHtml = 'No especificado';
      }
      photoMeta.innerHTML =
        '<div class="photo-meta-row">' +
          '<dt>Temática</dt>' +
          '<dd>' + (item.theme ? item.theme : 'Sin temática') + '</dd>' +
        '</div>' +
        '<div class="photo-meta-row">' +
          '<dt>Personas</dt>' +
          '<dd>' + peopleHtml + '</dd>' +
        '</div>' +
        '<div class="photo-meta-row">' +
          '<dt>Archivo</dt>' +
          '<dd>' + item.file + '</dd>' +
        '</div>' +
        '<div class="photo-meta-row">' +
          '<dt>Dimensiones</dt>' +
          '<dd>' + item.width + ' × ' + item.height + 'px</dd>' +
        '</div>';
    }
    // Update download link
    if (photoFile) {
      photoFile.setAttribute('href', item.src);
      photoFile.setAttribute('download', item.file);
    }
    // Update modal image
    if (modalImg) {
      modalImg.setAttribute('src', item.src);
      modalImg.setAttribute('alt', item.alt);
    }
    // Update navigation buttons
    var currentIndex = photoData.findIndex(function(entry) { return entry.slug === slug; });
    var prevItem = currentIndex > 0 ? photoData[currentIndex - 1] : null;
    var nextItem = currentIndex >= 0 && currentIndex < photoData.length - 1 ? photoData[currentIndex + 1] : null;
    navButtons.forEach(function(btn) {
      if (btn instanceof HTMLElement) btn.style.display = 'none';
    });
    if (prevItem) {
      var prevBtn = document.querySelector('.photo-nav-button--prev');
      if (prevBtn && prevBtn instanceof HTMLAnchorElement) {
        prevBtn.setAttribute('href', '/zona-vip/galeria/' + prevItem.slug + '/');
        prevBtn.setAttribute('aria-label', 'Ver fotografía anterior: ' + prevItem.alt);
        prevBtn.style.display = '';
      }
    }
    if (nextItem) {
      var nextBtn = document.querySelector('.photo-nav-button--next');
      if (nextBtn && nextBtn instanceof HTMLAnchorElement) {
        nextBtn.setAttribute('href', '/zona-vip/galeria/' + nextItem.slug + '/');
        nextBtn.setAttribute('aria-label', 'Ver fotografía siguiente: ' + nextItem.alt);
        nextBtn.style.display = '';
      }
    }
    // Actualiza la URL sin recargar
    window.history.replaceState({}, '', '/zona-vip/galeria/' + slug + '/');
  }

  navButtons.forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var href = btn.getAttribute('href');
      if (!href) return;
      var slug = href.split('/').filter(Boolean).pop();
      if (typeof slug === 'string') {
        updatePhoto(slug);
      }
    });
  });

  // Modal logic
  function openModal() {
    if (modal) {
      modal.setAttribute('aria-hidden', 'false');
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  }
  function closeModal() {
    if (modal) {
      modal.setAttribute('aria-hidden', 'true');
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }

  if (photoImg) {
    photoImg.addEventListener('click', openModal);
    photoImg.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') openModal();
    });
  }
  if (modalBg) {
    modalBg.addEventListener('click', closeModal);
  }
  if (modalImg) {
    modalImg.addEventListener('click', closeModal);
  }
  window.addEventListener('keydown', function(e) {
    if (modal && modal.getAttribute('aria-hidden') === 'false' && (e.key === 'Escape' || e.key === 'Esc')) {
      closeModal();
    }
  });
});