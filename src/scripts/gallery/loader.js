// Explicit .js extensions added for production bundling clarity
import { renderBatch, collectCards } from './cards.js';
import { downloadAsJPG } from './download.js';
import {
  buildCardIndex,
  buildLabelLookup,
  registerLabelFromCheckbox,
  renderSelectedFilters
} from './filters.js';
import { GalleryState } from './state.js';

// GalleryEvent structure for reference:
// {
//   slug: string,
//   label: string
// }

// ClientConfig structure for reference:
// {
//   batchSize?: number,
//   items?: Array,
//   events?: Array
// }

function ready(fn) {
  if (typeof document === 'undefined') {
    return;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  } else {
    fn();
  }
}

function initFilterPanels() {
  // NOTE: Removed TS generic (<HTMLDetailsElement>) for runtime compatibility
  const panels = Array.from(document.querySelectorAll('.filter-panel'));
  panels.forEach((panel) => {
    panel.addEventListener('toggle', () => {
      if (!panel.open) {
        return;
      }

      panels.forEach((other) => {
        if (other !== panel && other.open) {
          other.open = false;
        }
      });
    });
  });
}

function initFilterToggle() {
  const toolbar = document.getElementById('filter-toolbar');
  const toggle = document.getElementById('filter-toggle');
  if (!(toolbar instanceof HTMLElement) || !(toggle instanceof HTMLElement)) {
    return;
  }

  const toolbarEl = toolbar;
  const toggleEl = toggle;
  const labelEl = toggleEl.querySelector('.filter-toggle-label');
  const SHOW_LABEL = 'Mostrar filtros';
  const HIDE_LABEL = 'Ocultar filtros';
  const mq = window.matchMedia('(max-width: 640px)');
  let lastMatches = mq.matches;

  function setState(collapsed) {
    toolbarEl.dataset.collapsed = collapsed ? 'true' : 'false';
    toggleEl.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    toggleEl.classList.toggle('is-open', !collapsed);
    toggleEl.setAttribute('aria-label', collapsed ? SHOW_LABEL : HIDE_LABEL);
    if (labelEl) {
      labelEl.textContent = collapsed ? SHOW_LABEL : HIDE_LABEL;
    }
  }

  toggleEl.addEventListener('click', () => {
    const collapsed = toolbarEl.dataset.collapsed !== 'false';
    setState(!collapsed);
  });

  function applyViewportState(matches, fromChange = false) {
    if (matches) {
      const shouldCollapse = fromChange && !lastMatches ? true : toolbarEl.dataset.collapsed !== 'false';
      setState(shouldCollapse);
    } else {
      setState(false);
    }
    lastMatches = matches;
  }

  mq.addEventListener('change', (event) => {
    applyViewportState(event.matches, true);
  });

  applyViewportState(mq.matches);
}

function initGallery() {
  const grid = document.getElementById('gallery-grid');
  if (!(grid instanceof HTMLElement)) {
    return;
  }

  const gridEl = grid;

  const counter = document.getElementById('gallery-count');
  const emptyState = document.getElementById('gallery-empty');
  const dataElement = document.getElementById('gallery-data');
  const loadMoreBtn = document.getElementById('gallery-load-more');
  const selectedFiltersEl = document.getElementById('selected-filters');

  let parsedConfig = { batchSize: 24, items: [], events: [] };
  if (dataElement && dataElement.textContent) {
    try {
      parsedConfig = JSON.parse(dataElement.textContent);
    } catch (error) {
      console.error('No se pudo parsear la configuración de la galería:', error);
    }
  }

  const batchSize = Number(parsedConfig.batchSize ?? 24) || 24;
  const queue = Array.isArray(parsedConfig.items) ? parsedConfig.items.slice() : [];
  const minimumVisibleCount = Math.max(batchSize, 24);

  const eventLookup = new Map();
  if (Array.isArray(parsedConfig.events)) {
    parsedConfig.events.forEach((event) => {
      if (event?.slug) {
        eventLookup.set(event.slug, event.label ?? event.slug);
      }
    });
  }

  let cards = collectCards(gridEl);
  let cardIndex = buildCardIndex(cards);
  const labelLookup = buildLabelLookup();

  const checkboxes = Array.from(document.querySelectorAll('input[data-filter-type]'));

  // Register labels from checkboxes
  checkboxes.forEach((checkbox) => {
    registerLabelFromCheckbox(checkbox, labelLookup);
  });

  // Create unified gallery state
  const galleryState = new GalleryState(
    checkboxes,
    cards,
    eventLookup,
    labelLookup,
    undefined
  );

  // Update card index in state
  galleryState.updateCardIndex(cardIndex);

  function updateLoadMoreButton() {
    if (!(loadMoreBtn instanceof HTMLButtonElement)) {
      return;
    }
    loadMoreBtn.hidden = true;
    loadMoreBtn.disabled = true;
  }

  function updateCounter(value) {
    if (counter) {
      counter.textContent = String(value);
    }
  }

  function updateEmptyState(hasVisible, hasAnyCards) {
    if (!emptyState) {
      return;
    }

    if (!hasAnyCards) {
      emptyState.hidden = true;
      return;
    }

    emptyState.hidden = hasVisible;
  }

  function updateLoadedAttribute() {
    gridEl.dataset.loaded = String(cards.length);
  }

  function refreshCardsFromDom() {
    cards = collectCards(gridEl);
    cardIndex = buildCardIndex(cards);
    galleryState.updateCards(cards);
    galleryState.updateCardIndex(cardIndex);
    updateLoadedAttribute();
  }

  function persistFilters() {
    galleryState.syncToStorage();
  }

  // Infinite scroll variables
  let galleryObserver = null;
  let sentinelElement = null;
  let isLoadingMore = false;
  let filterChangeInProgress = false;

  function removeSentinel() {
    if (sentinelElement && sentinelElement.parentElement) {
      sentinelElement.parentElement.removeChild(sentinelElement);
    }
    sentinelElement = null;
  }

  function placeSentinel() {
    removeSentinel();
    const sentinel = document.createElement('div');
    sentinel.id = 'gallery-sentinel';
    sentinel.style.cssText = 'height: 1px; width: 100%; grid-column: 1 / -1;';
    gridEl.appendChild(sentinel);
    sentinelElement = sentinel;
    return sentinel;
  }

  function disconnectObserver() {
    if (galleryObserver) {
      galleryObserver.disconnect();
      galleryObserver = null;
    }
  }

  function setupInfiniteScroll() {
    disconnectObserver();

    if (queue.length === 0) {
      removeSentinel();
      return;
    }

    const sentinel = placeSentinel();

    galleryObserver = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && queue.length > 0 && !isLoadingMore) {
        isLoadingMore = true;

        const appended = renderBatch(gridEl, queue, batchSize, eventLookup);
        if (appended > 0) {
          refreshCardsFromDom();
          updatePhotoLinkUrls(); // Mantener URLs actualizadas

          // Aplicar filtros a las nuevas cards sin forzar carga adicional
          const visible = galleryState.getVisibleCards();
          updateCounter(visible);
          updateEmptyState(visible > 0, cards.length > 0);

          // Re-setup si hay más items
          if (queue.length > 0) {
            setupInfiniteScroll();
          } else {
            removeSentinel();
          }
        }

        isLoadingMore = false;
      }
    }, { rootMargin: '400px' });

    galleryObserver.observe(sentinel);
  }

  function applyFilters({
    requeryCards = false,
    skipPersist = false,
    loadMoreIfNeeded = false,
    delayScroll = false
  } = {}) {
    if (requeryCards) {
      refreshCardsFromDom();
    }

    let visible = galleryState.getVisibleCards();

    // Solo cargar más en la inicialización o si explícitamente se solicita
    if (loadMoreIfNeeded && visible < minimumVisibleCount && queue.length > 0) {
      let attempts = 0;
      const maxAttempts = 5;

      while (visible < minimumVisibleCount && queue.length > 0 && attempts < maxAttempts) {
        const appended = renderBatch(gridEl, queue, batchSize, eventLookup);
        if (!appended) break;
        refreshCardsFromDom();
        updatePhotoLinkUrls(); // Mantener URLs actualizadas
        visible = galleryState.getVisibleCards();
        attempts++;
      }
    }

    gridEl.dataset.state = visible === 0 ? 'empty' : 'ready';
    updateEmptyState(visible > 0, cards.length > 0);
    updateCounter(visible);
    renderSelectedFilters(selectedFiltersEl, galleryState.getFilters(), labelLookup, eventLookup, handleFilterRemoval);

    if (!skipPersist) {
      persistFilters();
    }

    // Mantener las URLs de las cards sincronizadas con los filtros activos
    updatePhotoLinkUrls();

    // Configurar infinite scroll con delay opcional al cambiar filtros
    if (queue.length > 0) {
      if (delayScroll) {
        disconnectObserver();
        removeSentinel();
        setTimeout(() => {
          setupInfiniteScroll();
        }, 300);
      } else {
        setupInfiniteScroll();
      }
    } else {
      disconnectObserver();
      removeSentinel();
    }

    return visible;
  }

  function handleFilterRemoval(type, slug) {
    galleryState.removeFilter(type, slug);
    galleryState.syncToCheckboxes();

    // Aplicar filtros sin cargar más imágenes
    const visible = galleryState.getVisibleCards();
    updateCounter(visible);
    updateEmptyState(visible > 0, cards.length > 0);
    renderSelectedFilters(selectedFiltersEl, galleryState.getFilters(), labelLookup, eventLookup, handleFilterRemoval);
    persistFilters();
    updatePhotoLinkUrls();

    // Desactivar infinite scroll temporalmente al cambiar filtros
    disconnectObserver();
    removeSentinel();

    // Reactivar infinite scroll después de un delay para evitar cargas automáticas
    if (queue.length > 0) {
      setTimeout(() => {
        setupInfiniteScroll();
      }, 300);
    }
  }

  checkboxes.forEach((checkbox) => {
    const type = checkbox.dataset.filterType ?? '';
    const value = checkbox.dataset.filterValue ?? '';
    if (!type || !value) {
      return;
    }

    checkbox.checked = galleryState.getFilters()[type]?.has(value) ?? false;

    checkbox.addEventListener('change', () => {
      galleryState.toggleFilter(type, value, checkbox.checked);
      // Usar delay al cambiar filtros para evitar cargas automáticas
      applyFilters({ loadMoreIfNeeded: false, delayScroll: true });
    });
  });

  refreshCardsFromDom();
  updateLoadMoreButton();

  // Inicializa la galería con carga inicial SOLO una vez
  applyFilters({ skipPersist: true, loadMoreIfNeeded: true });

  // Construir querystring a partir de los filtros actuales
  function buildQueryString() {
    const filters = galleryState.getFilters();
    const params = new URLSearchParams();
    filters.theme.forEach((t) => params.append('theme', t));
    filters.people.forEach((p) => params.append('person', p));
    filters.event.forEach((ev) => params.append('event', ev));
    filters.musical.forEach((m) => params.append('musical', m));
    return params.toString();
  }

  // Actualizar los href de todas las cards para reflejar los filtros activos
  function updatePhotoLinkUrls() {
    const query = buildQueryString();
    const links = gridEl.querySelectorAll('.gallery-card-link, [data-photo-link]');
    links.forEach((link) => {
      const baseHref = (link.getAttribute('href') || '').split('#')[0].split('?')[0];
      link.setAttribute('href', query ? `${baseHref}?${query}` : baseHref);
    });
  }

  // Sincronizar URLs inicialmente
  updatePhotoLinkUrls();
}

function init() {
  initFilterToggle();
  initFilterPanels();
  initGallery();
}

ready(init);
document.addEventListener('astro:page-load', init);

document.addEventListener('click', (event) => {
  const target = event.target?.closest('.gallery-card-download');
  if (!target) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const src = target.dataset.downloadSrc || target.getAttribute('data-download-src');
  const file = target.dataset.downloadFile || target.getAttribute('data-download-file') || 'imagen.webp';

  if (src) {
    void downloadAsJPG(src, file, target);
  }
});