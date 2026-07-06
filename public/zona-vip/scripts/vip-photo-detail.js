(() => {
  const DATASET_FLAG = 'photoDetailReady';
  let windowListenerAttached = false;

  const setupPhotoDetail = () => {
    const root = document.querySelector('.vip-photo-detail');
    if (!root || root.dataset[DATASET_FLAG] === 'true') {
      return;
    }
    root.dataset[DATASET_FLAG] = 'true';

    const dataCarrier = document.getElementById('gallery-photo-data');
    let photoData = [];
    if (dataCarrier && dataCarrier.textContent) {
      try {
        photoData = JSON.parse(dataCarrier.textContent);
      } catch (error) {
        console.error('Error parsing gallery photo data', error);
        return;
      }
    }

    if (!Array.isArray(photoData) || photoData.length === 0) {
      return;
    }

    const navButtons = root.querySelectorAll('.photo-nav-button');
    const prevBtn = root.querySelector('.photo-nav-button--prev');
    const nextBtn = root.querySelector('.photo-nav-button--next');
    const photoImg = root.querySelector('#vip-photo-img');
    const photoTitle = root.querySelector('.photo-title');
    const photoMeta = root.querySelector('.photo-meta');
    const photoFile = root.querySelector('.photo-actions .download-link');
    const photoVisual = root.querySelector('.photo-visual');
    const photoDescription = root.querySelector('.photo-description');
    const modal = document.getElementById('vip-photo-modal');
    const modalImg = modal ? modal.querySelector('.vip-photo-modal-img') : null;
    const modalBg = modal ? modal.querySelector('.vip-photo-modal-bg') : null;

    const closeModal = () => {
      if (modal) {
        modal.setAttribute('aria-hidden', 'true');
      }
      document.body.style.overflow = '';
    };

    const openModal = () => {
      if (modal) {
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      }
    };

    const renderMeta = (item) => {
      if (!photoMeta) return;
      const peopleMarkup = item.people.length
        ? '<ul class="photo-people">' + item.people.map((person) => `<li>${person}</li>`).join('') + '</ul>'
        : 'No especificado';

      photoMeta.innerHTML = `
        <div class="photo-meta-row">
          <dt>Temática</dt>
          <dd>${item.theme ? item.theme : 'Sin temática'}</dd>
        </div>
        <div class="photo-meta-row">
          <dt>Personas</dt>
          <dd>${peopleMarkup}</dd>
        </div>
        <div class="photo-meta-row">
          <dt>Archivo</dt>
          <dd>${item.file}</dd>
        </div>
        <div class="photo-meta-row">
          <dt>Dimensiones</dt>
          <dd>${item.width} × ${item.height}px</dd>
        </div>
      `;
    };

    const updatePhoto = (slug) => {
      const item = photoData.find((entry) => entry.slug === slug);
      if (!item) return;

      if (photoImg) {
        photoImg.setAttribute('src', item.src);
        photoImg.setAttribute('alt', item.alt);
        photoImg.setAttribute('width', String(item.width));
        photoImg.setAttribute('height', String(item.height));
        photoImg.setAttribute('tabindex', '0');
        photoImg.setAttribute('loading', 'eager');
        photoImg.setAttribute('decoding', 'async');
      }

      if (photoVisual && photoVisual instanceof HTMLElement) {
        const aspectRatio = item.width && item.height ? Number((item.width / item.height).toFixed(6)) : 1.333333;
        photoVisual.style.setProperty('--photo-aspect', String(aspectRatio));
      }

      if (photoTitle && photoTitle instanceof HTMLElement) {
        photoTitle.textContent = item.alt;
      }

      if (photoDescription) {
        photoDescription.textContent = 'Esta fotografía pertenece a la galería exclusiva de Tefía. Aquí puedes verla en detalle y consultar la información asociada.';
      }

      renderMeta(item);

      if (photoFile) {
        photoFile.setAttribute('href', item.src);
        photoFile.setAttribute('download', item.file);
      }

      if (modalImg) {
        modalImg.setAttribute('src', item.src);
        modalImg.setAttribute('alt', item.alt);
      }

      const currentIndex = photoData.findIndex((entry) => entry.slug === slug);
      const prevItem = currentIndex > 0 ? photoData[currentIndex - 1] : null;
      const nextItem = currentIndex >= 0 && currentIndex < photoData.length - 1 ? photoData[currentIndex + 1] : null;

      navButtons.forEach((anchor) => {
        anchor.style.display = 'none';
      });

      if (prevBtn) {
        if (prevItem) {
          prevBtn.setAttribute('href', `/zona-vip/galeria/${prevItem.slug}/`);
          prevBtn.setAttribute('aria-label', `Ver fotografía anterior: ${prevItem.alt}`);
          prevBtn.style.display = '';
        } else {
          prevBtn.style.display = 'none';
        }
      }

      if (nextBtn) {
        if (nextItem) {
          nextBtn.setAttribute('href', `/zona-vip/galeria/${nextItem.slug}/`);
          nextBtn.setAttribute('aria-label', `Ver fotografía siguiente: ${nextItem.alt}`);
          nextBtn.style.display = '';
        } else {
          nextBtn.style.display = 'none';
        }
      }

      closeModal();

      if (window.history && typeof window.history.replaceState === 'function') {
        window.history.replaceState({}, '', `/zona-vip/galeria/${slug}/`);
      }

      if (photoImg && typeof photoImg.focus === 'function') {
        photoImg.focus();
      }
    };

    navButtons.forEach((anchor) => {
      anchor.addEventListener('click', (event) => {
        event.preventDefault();
        const href = anchor.getAttribute('href');
        if (!href) return;
        const slug = href.split('/').filter(Boolean).pop();
        if (slug) {
          updatePhoto(slug);
        }
      });
    });

    if (photoImg) {
      photoImg.addEventListener('click', openModal);
      photoImg.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openModal();
        }
      });
    }

    if (modalBg) {
      modalBg.addEventListener('click', closeModal);
    }

    if (modalImg) {
      modalImg.addEventListener('click', closeModal);
    }

    if (!windowListenerAttached) {
      window.addEventListener('keydown', (event) => {
        if (!modal || modal.getAttribute('aria-hidden') === 'true') return;
        if (event.key === 'Escape' || event.key === 'Esc') {
          closeModal();
        }
      });
      windowListenerAttached = true;
    }
  };

  const runSetup = () => {
    setupPhotoDetail();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runSetup, { once: true });
  } else {
    runSetup();
  }

  document.addEventListener('astro:page-load', runSetup);
})();