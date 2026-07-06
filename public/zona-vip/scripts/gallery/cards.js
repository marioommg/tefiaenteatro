export function createCard(
  item,
  eventLookup
) {
  const article = document.createElement('article');
  article.className = 'gallery-card';
  article.dataset.people = Array.isArray(item.peopleSlugs) ? item.peopleSlugs.join(' ') : '';
  article.dataset.event = item.eventSlug ?? '';
  article.dataset.musical = item.musicalNumberSlug ?? '';
  article.dataset.id = String(item.id);

  if (item.height > item.width) {
    article.dataset.vertical = 'true';
  }

  const slug = typeof item.slug === 'string' && item.slug.length
    ? item.slug
    : String(item.id).toLowerCase();

  const href = typeof item.detailUrl === 'string' && item.detailUrl.length
    ? item.detailUrl
    : `/zona-vip/galeria/${slug}/`;

  const figure = document.createElement('figure');
  figure.className = 'gallery-card-figure';

  const media = document.createElement('div');
  media.className = 'gallery-card-media';

  const link = document.createElement('a');
  link.className = 'gallery-card-link';
  link.href = href;
  link.setAttribute('data-photo-link', '');
  if (item.alt) {
    link.setAttribute('aria-label', `Ver fotografía: ${item.alt}`);
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'img-wrapper';

  const img = document.createElement('img');
  img.src = item.src.replace('/zona-vip/galeria/', '/zona-vip/galeria/thumbnails/');
  img.alt = item.alt;
  img.loading = 'lazy';
  if (item.width) {
    img.width = item.width;
  }
  if (item.height) {
    img.height = item.height;
  }
  img.addEventListener('error', (e) => {
    const target = e.target;
    if (!target.src.endsWith('/placeholder-image.svg')) {
      const placeholder = document.createElement('img');
      placeholder.src = '/placeholder-image.svg';
      placeholder.alt = 'Imagen no disponible';
      placeholder.width = target.width;
      placeholder.height = target.height;
      placeholder.className = target.className;
      wrapper.replaceChild(placeholder, target);
    }
  });

  wrapper.appendChild(img);
  link.appendChild(wrapper);

  const downloadBtn = document.createElement('button');
  downloadBtn.className = 'gallery-card-download';
  downloadBtn.type = 'button';
  downloadBtn.dataset.downloadSrc = item.src;
  downloadBtn.dataset.downloadFile = item.file || 'imagen.webp';
  downloadBtn.setAttribute(
    'aria-label',
    item.alt ? `Descargar fotografía: ${item.alt}` : 'Descargar fotografía'
  );
  downloadBtn.title = 'Descargar fotografía en JPG';
  downloadBtn.innerHTML =
    '<svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true" focusable="false"><path fill="currentColor" transform="translate(0, 2) scale(0.065)" d="M451.655 414.239H33.048C14.798 414.239 0 428.659 0 446.91c0 18.25 14.798 32.67 33.048 32.67h418.607c18.249 0 33.047-14.42 33.047-32.67 0-18.251-14.798-32.671-33.047-32.671zM217.351 370.521c13.862 19.657 37.98 17.842 50.002 0 30.482-45.242 126.299-177.947 126.299-177.947 7.233-10.19 6.901-23.929-.812-33.762a28.23 28.23 0 0 0-32.602-8.819l-73.499 29.111 9.703-143.854a28.213 28.213 0 0 0-7.6-21.238 28.245 28.245 0 0 0-20.729-8.889h-51.525a28.24 28.24 0 0 0-20.73 8.889 28.222 28.222 0 0 0-7.6 21.238l9.704 143.854-73.499-29.111a28.23 28.23 0 0 0-32.602 8.819c-7.713 9.833-8.045 23.571-.811 33.762.002-.001 94.861 133.365 126.301 177.947z"></path></svg>';

  media.appendChild(link);
  media.appendChild(downloadBtn);

  const eventLabel = item.eventSlug ? eventLookup.get(item.eventSlug) : undefined;
  if (eventLabel) {
    const eventSpan = document.createElement('span');
    eventSpan.className = 'gallery-card-event';
    eventSpan.textContent = eventLabel;
    media.appendChild(eventSpan);
  }

  figure.appendChild(media);
  article.appendChild(figure);

  return article;
}

export function renderBatch(
  grid,
  queue,
  batchSize,
  eventLookup
) {
  if (!queue.length) {
    return 0;
  }

  const batch = queue.splice(0, batchSize);
  if (!batch.length) {
    return 0;
  }

  const fragment = document.createDocumentFragment();
  batch.forEach((item) => {
    fragment.appendChild(createCard(item, eventLookup));
  });

  grid.appendChild(fragment);
  return batch.length;
}

export function collectCards(grid) {
  return Array.from(grid.querySelectorAll('.gallery-card'));
}