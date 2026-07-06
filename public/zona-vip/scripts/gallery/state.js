import { createFilterState, applyFilters, serializeFilters, areFiltersEmpty, getUrlFilterSnapshot, hydrateFiltersFromSnapshot, pruneFilters } from './filters.js';
import { readStoredFilters, writeStoredFilters, clearStoredFilters } from './storage.js';

export class GalleryState {
  constructor(checkboxes, cards, eventLookup, labelLookup, onChange) {
    this.checkboxes = checkboxes;
    this.cards = cards;
    this.eventLookup = eventLookup;
    this.labelLookup = labelLookup;
    this.onChange = onChange;

    this.availableValues = {
      people: new Set(),
      event: new Set(),
      musical: new Set(),
    };

    checkboxes.forEach((checkbox) => {
      const type = checkbox.dataset.filterType ?? '';
      const value = checkbox.dataset.filterValue ?? '';
      if (type && value && this.availableValues[type]) {
        this.availableValues[type].add(value);
      }
    });

    this.filters = this.initializeFilters();
  }

  initializeFilters() {
    const urlSnapshot = getUrlFilterSnapshot();
    const shouldRestoreStoredFilters = !(
      (urlSnapshot.people && urlSnapshot.people.length) ||
      (urlSnapshot.event && urlSnapshot.event.length) ||
      (urlSnapshot.musical && urlSnapshot.musical.length)
    );

    const savedFilters = shouldRestoreStoredFilters ? readStoredFilters() : null;
    const filters = createFilterState(savedFilters);
    hydrateFiltersFromSnapshot(filters, urlSnapshot);
    pruneFilters(filters, this.availableValues);

    return filters;
  }

  applyURLFilters() {
    const urlSnapshot = getUrlFilterSnapshot();
    hydrateFiltersFromSnapshot(this.filters, urlSnapshot);
    pruneFilters(this.filters, this.availableValues);
    this.syncToCheckboxes();
    this.persistFilters();
    this.notifyChange();
  }

  syncToStorage() {
    if (areFiltersEmpty(this.filters)) {
      clearStoredFilters();
    } else {
      writeStoredFilters(serializeFilters(this.filters));
    }
  }

  syncToCheckboxes() {
    this.checkboxes.forEach((checkbox) => {
      const type = checkbox.dataset.filterType ?? '';
      const value = checkbox.dataset.filterValue ?? '';
      if (type && value && this.filters[type]) {
        checkbox.checked = this.filters[type].has(value);
      }
    });
  }

  getVisibleCards() {
    return applyFilters(this.cards, this.filters, this.cardIndex);
  }

  toggleFilter(type, value, enabled) {
    if (!value || !this.filters[type]) {
      return;
    }
    if (enabled) {
      this.filters[type].add(value);
    } else {
      this.filters[type].delete(value);
    }
    this.persistFilters();
  }

  removeFilter(type, value) {
    if (this.filters[type]) {
      this.filters[type].delete(value);
      this.syncToCheckboxes();
      this.persistFilters();
    }
  }

  getFilters() {
    return { ...this.filters };
  }

  updateCardIndex(index) {
    this.cardIndex = index;
  }

  updateCards(cards) {
    this.cards = cards;
  }

  isEmpty() {
    return areFiltersEmpty(this.filters);
  }

  serialize() {
    return serializeFilters(this.filters);
  }

  persistFilters() {
    this.syncToStorage();
  }

  notifyChange() {
    if (this.onChange) {
      const visibleCount = this.getVisibleCards();
      this.onChange(visibleCount);
    }
  }
}