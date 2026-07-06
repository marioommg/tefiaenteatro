export interface Cancion {
  numero: string;
  titulo: string;
  archivo: string;
  enlaceOficial?: string;
  letra: (string[] | string)[];
}

/** Datos de demostración para clones del repositorio. Sustituye con `canciones.local.ts` en desarrollo. */
export const CANCIONES: Cancion[] = [
  {
    numero: "DEMO-01",
    titulo: "Canción de ejemplo",
    archivo: "/audios/demo-track.wav",
    letra: ["[00:00.00]Letra no incluida en el repositorio público."],
  },
];
