/**
 * Atajos de selección del DOM.
 * `$` devuelve un elemento o `null`; `$$` devuelve siempre un Array.
 */

export function $<T extends Element = HTMLElement>(
	selector: string,
	scope: ParentNode = document
): T | null {
	return scope.querySelector<T>(selector);
}

export function $$<T extends Element = HTMLElement>(
	selector: string,
	scope: ParentNode = document
): T[] {
	return Array.from(scope.querySelectorAll<T>(selector));
}
