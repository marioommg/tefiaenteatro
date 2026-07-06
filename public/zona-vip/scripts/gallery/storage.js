export const FILTER_STORAGE_KEY = 'vipGalleryFilters:v1';

export function readStoredFilters() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(FILTER_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch (error) {
    console.warn('No se pudo leer el estado de filtros almacenado:', error);
  }

  return null;
}

export function writeStoredFilters(state) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('No se pudo guardar el estado de filtros:', error);
  }
}

export function clearStoredFilters() {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.removeItem(FILTER_STORAGE_KEY);
  } catch (error) {
    console.warn('No se pudo limpiar el estado de filtros:', error);
  }
}