export function createFilterState(initial) {
  return {
    people: new Set((initial && initial.people) || []),
    event: new Set((initial && initial.event) || []),
    musical: new Set((initial && initial.musical) || []),
  };
}

export function toggleFilter(filters, type, value, enabled) {
  if (!value) {
    return;
  }

  const collection = filters[type];
  if (!collection) {
    return;
  }

  if (enabled) {
    collection.add(value);
  } else {
    collection.delete(value);
  }
}

export function pruneFilters(filters, available) {
  Object.keys(filters).forEach((type) => {
    const current = filters[type];
    const valid = available[type];
    if (!valid) {
      return;
    }

    Array.from(current).forEach((value) => {
      if (!valid.has(value)) {
        current.delete(value);
      }
    });
  });
}

export function hydrateFiltersFromSnapshot(filters, snapshot) {
  Object.keys(snapshot).forEach((type) => {
    const values = snapshot[type];
    if (!values) {
      return;
    }

    const collection = filters[type];
    if (!collection) {
      return;
    }

    Array.from(values).forEach((value) => {
      if (typeof value === 'string' && value.length) {
        collection.add(value);
      }
    });
  });
}

function createEntryFromCard(card) {
  const events = new Set();
  const musicals = new Set();
  const people = new Set();

  const eventSlug = card.dataset.event ?? card.getAttribute('data-event') ?? '';
  if (eventSlug) {
    events.add(eventSlug);
  }

  const musicalSlug = card.dataset.musical ?? card.getAttribute('data-musical') ?? '';
  if (musicalSlug) {
    musicals.add(musicalSlug);
  }

  const rawPeople = card.dataset.people ?? card.getAttribute('data-people') ?? '';
  rawPeople
    .split(' ')
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((slug) => people.add(slug));

  return { people, events, musicals };
}

function hasIntersection(source, targets) {
  for (const value of targets) {
    if (source.has(value)) {
      return true;
    }
  }
  return false;
}

function getCardEntry(index, card) {
  if (!index) {
    return undefined;
  }
  const id = card.dataset.id;
  if (!id) {
    return undefined;
  }
  let entry = index.get(id);
  if (!entry) {
    entry = createEntryFromCard(card);
    index.set(id, entry);
  }
  return entry;
}

function matchesFilters(card, entry, filters) {
  if (filters.people.size) {
    if (entry) {
      if (!hasIntersection(entry.people, filters.people)) {
        return false;
      }
    } else {
      const rawPeople = card.dataset.people ?? card.getAttribute('data-people') ?? '';
      const people = rawPeople.split(' ').map((value) => value.trim()).filter(Boolean);
      const matches = people.some((slug) => filters.people.has(slug));
      if (!matches) {
        return false;
      }
    }
  }

  if (filters.event.size) {
    if (entry) {
      if (!hasIntersection(entry.events, filters.event)) {
        return false;
      }
    } else {
      const eventSlug = card.dataset.event ?? card.getAttribute('data-event') ?? '';
      if (!filters.event.has(eventSlug)) {
        return false;
      }
    }
  }

  if (filters.musical.size) {
    if (entry) {
      if (!hasIntersection(entry.musicals, filters.musical)) {
        return false;
      }
    } else {
      const musicalSlug = card.dataset.musical ?? card.getAttribute('data-musical') ?? '';
      if (!filters.musical.has(musicalSlug)) {
        return false;
      }
    }
  }

  return true;
}

export function buildCardIndex(cards) {
  const index = new Map();
  cards.forEach((card) => {
    const id = card.dataset.id;
    if (!id) {
      return;
    }
    index.set(id, createEntryFromCard(card));
  });
  return index;
}

export function applyFilters(cards, filters, index) {
  let visible = 0;

  cards.forEach((card) => {
    const entry = getCardEntry(index, card);
    const show = matchesFilters(card, entry, filters);
    card.hidden = !show;
    if (show) {
      visible += 1;
    }
  });

  return visible;
}

export function renderSelectedFilters(container, filters, labelLookup, eventLookup, onRemove) {
  if (!container) {
    return;
  }

  container.innerHTML = '';

  const selected = [];

  filters.event.forEach((slug) => {
    const label = labelLookup.event.get(slug) ?? eventLookup.get(slug) ?? slug;
    selected.push({ type: 'event', slug, label });
  });

  filters.people.forEach((slug) => {
    const label = labelLookup.people.get(slug) ?? slug;
    selected.push({ type: 'people', slug, label });
  });

  filters.musical.forEach((slug) => {
    const label = labelLookup.musical.get(slug) ?? slug;
    selected.push({ type: 'musical', slug, label });
  });

  if (!selected.length) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'flex';
  container.style.flexWrap = 'wrap';
  container.style.gap = '.5rem';

  selected.forEach((item) => {
    const chip = document.createElement('span');
    chip.className = 'selected-filter';
    chip.textContent = item.label;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-filter';
    removeBtn.type = 'button';
    removeBtn.setAttribute('aria-label', `Quitar filtro: ${item.label}`);
    removeBtn.textContent = '×';
    removeBtn.style.marginLeft = '.35em';
    removeBtn.addEventListener('click', () => onRemove(item.type, item.slug));

    chip.appendChild(removeBtn);
    container.appendChild(chip);
  });
}

export function buildLabelLookup() {
  return {
    people: new Map(),
    event: new Map(),
    musical: new Map(),
  };
}

export function serializeFilters(filters) {
  return {
    people: Array.from(filters.people),
    event: Array.from(filters.event),
    musical: Array.from(filters.musical),
    timestamp: Date.now(),
  };
}

export function areFiltersEmpty(filters) {
  return (
    !filters.people.size &&
    !filters.event.size &&
    !filters.musical.size
  );
}

export function getUrlFilterSnapshot() {
  if (typeof window === 'undefined') {
    return {};
  }
  const params = new URLSearchParams(window.location.search);
  return {
    people: params.getAll('person').filter(Boolean),
    event: params.getAll('event').filter(Boolean),
    musical: params.getAll('musical').filter(Boolean),
  };
}

export function collectAvailableValuesFromCheckboxes(checkboxes) {
  const available = {
    people: new Set(),
    event: new Set(),
    musical: new Set(),
  };
  checkboxes.forEach((checkbox) => {
    const type = checkbox.dataset.filterType ?? '';
    const value = checkbox.dataset.filterValue ?? '';
    if (!type || !value || !available[type]) {
      return;
    }
    available[type].add(value);
  });
  return available;
}

export function registerLabelFromCheckbox(checkbox, lookup) {
  const type = checkbox.dataset.filterType ?? '';
  const value = checkbox.dataset.filterValue ?? '';
  if (!type || !value) {
    return;
  }
  const labelSource = checkbox.dataset.filterLabel ?? (checkbox.nextElementSibling && checkbox.nextElementSibling.textContent) ?? value;
  const label = (labelSource || value).trim();
  const collection = lookup[type];
  if (!collection) {
    return;
  }
  collection.set(value, label);
}