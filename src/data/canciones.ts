export type { Cancion } from "./canciones.demo.ts";
import { CANCIONES as demoCanciones, type Cancion } from "./canciones.demo.ts";

const localModules = import.meta.glob<{ CANCIONES: Cancion[] }>(
  "./canciones.local.ts",
  { eager: true },
);

const local = Object.values(localModules)[0];

/** Canciones de la banda sonora VIP. En local, define `src/data/canciones.local.ts` (gitignored). */
export const CANCIONES: Cancion[] = local?.CANCIONES ?? demoCanciones;
