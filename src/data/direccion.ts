export type Actor = {
  slug: string;
  nombre: string;
  descripcion1?: string;
  descripcion2?: string;
  hero: string; // absolute path or relative to carpetaGaleria handled by component
  carpetaGaleria?: string; // defaults to `/images/elenco/${slug}/`
  usernameInstagram?: string;
  usernameTikTok?: string;
  spotifyUrl?: string;
  usernameTwitch?: string;
  usernameYoutube?: string;
};

export const actores: Actor[] = [
  {
    slug: 'mario-munoz-gil',
    nombre: 'Mario Muñoz Gil',
    descripcion1:
      'Mario Muñoz Gil (Madrid, 2005) empieza desde muy pequeño en el mundo del teatro y la música, más como un juego que como una vocación, apuntandose a las extraescolares del colegio. En el instituto, a parte de ir a clases de baile, realiza varios cortometrajes y participa en el festival de coros de la Comunidad de Madrid. Decide estudiar el bachillerato de artes escénicas, en el IES Isabel la Católica, donde monta su primer musical, "High School Musical".',
    descripcion2:
      'Interesado por todo lo que ocurre detrás de los focos y las cámaras, decide estudiar Realización de Proyectos Audiovisuales y Espectáculos en el CIFP José Luis Garci. Es aquí donde tiene la idea de adaptar la serie "Las noches de Tefía" a teatro, como Trabajo de Fin de Ciclo. Actualmente continúa formándose en Iluminación, Captación y Tratamiento de Imagen en el mismo centro y espera poder aprender sobre luminotecnia en el C.T.E. en la próxima convocatoria.',
    hero: '/images/direccion/marioAtransparente.png',
    carpetaGaleria: '/images/direccion/mario-munoz-gil/', //AAA_0133.webp, DSC00520.webp, IMG_1494.webp, IMG_1593.webp, _MG_0752.webp
    usernameInstagram: 'marioo_mmg',
    usernameTikTok: 'marioo_mmg',
    usernameYoutube: 'marioo_mmg',
  },
  {
    slug: 'gabriela-mejias',
    nombre: 'Gabriela Mejías',
    descripcion1:
      'Soy Gabriela, aunque me conocen como Gaby, y soy una amante de las artes, no solo de las artes visuales y literarias, sino también del arte performático. Una de mis grandes pasiones es el baile y junto a la música ambas constituyen una gran parte de mi vida.',
    descripcion2:
      'Gracias a este proyecto, mi objetivo es hacer que el público disfrute del arte tanto como yo lo hago. Quiero transmitir el mensaje de Tefía no solo a través de la historia, sino también mediante la música, el baile, la actuación y el vestuario. Pero sobre todo, quiero que este proyecto no se quede en el baúl de los recuerdos como "mi TFG", sino que lo recuerde como un trabajo en el que aprendí mucho y pude explotar todo mi potencial para contar una historia al mundo, a través del teatro y la música.',
    hero: '/images/direccion/gabyAtransparente.png',
    carpetaGaleria: '/images/direccion/gabriela-mejias/',
    usernameInstagram: 'bygaby_1910',
    usernameTikTok: 'bygaby_1910',
  },
  {
    slug: 'ingrid-prieto',
    nombre: 'Ingrid Prieto',
    descripcion1:
      'Ingrid Prieto (Madrid, 2004) está acabando su formación en Diseño de Moda. Directora de Tefía en Teatro, su pasión por las diferentes disciplinas artísticas siempre ha marcado su manera de ver el mundo. Sus estudios en música, teatro y moda le han permitido crear proyectos interdisciplinares que combinasen todos sus intereses y utilizar el arte como medio de expresión de historias y emociones.',
    descripcion2:
      'Tefía en Teatro es su primera experiencia laboral como diseñadora de vestuario y la oportunidad de contar un relato que emociona profundamente, utilizando el teatro como medio de expresión. Espera crear un espacio de reflexión donde conectar con el público, para así llevar a la realidad las historias silenciadas de Tefía.',
    hero: '/images/direccion/ingridAtransparente.png',
    carpetaGaleria: '/images/direccion/ingrid-prieto/',
    usernameInstagram: 'ingridpri3to',
  },
];

export function getAllActors(): Actor[] {
  return actores.slice();
}

export function getActorBySlug(slug: string): Actor | undefined {
  return actores.find((a) => a.slug === slug);
}
