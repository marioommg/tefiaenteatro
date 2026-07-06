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

export function calcularEdad(fechaNacimiento: string): number {
  const hoy = new Date();
  const cumpleanos = new Date(fechaNacimiento);
  let edad = hoy.getFullYear() - cumpleanos.getFullYear();
  const m = hoy.getMonth() - cumpleanos.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < cumpleanos.getDate())) {
    edad--;
  }
  return edad;
}

export const actores: Actor[] = [
  {
    slug: 'moises-denilo',
    nombre: 'Moisés Denilo',
    descripcion1:
      `Moisés Denilo, ${calcularEdad('2003-10-15')} años. Mientras sus compañeros soñaban con ser futbolistas o médicos, él quería ser payaso de circo. Nunca fue muy buen estudiante pero fuera de horario escolar buscaba lo que de verdad quería hacer: teatro y baile.`,
    descripcion2:
      'Probó diseño gráfico, pero fue ahí donde entendió que su verdadera vocación era la interpretación. Estudió artes escénicas y se formó en actuación donde también aprendió nociones de canto, movimiento y lucha escénica. Al terminar, se mudó a Madrid con una mano delante y otra detrás, y con los ahorros de haber trabajado tres años como camarero. Buscaba asomar el hocico en el mundo que siempre lo hizo soñar. Se cruzó con este proyecto casi por casualidad, audicionó… y terminó formando parte del elenco.',
    hero: '/images/elenco/inicio/moisesA.webp',
    carpetaGaleria: '/images/elenco/moises-denilo/', //COMPLETADA
    usernameInstagram: 'moises.denilo',
    usernameTikTok: 'moisesdenilo',
  },
  {
    slug: 'antonio-lopez',
    nombre: 'Antonio López',
    descripcion1:
      'Antonio López (Toni) nació en 2005 en Cádiz. Desde pequeño ha sentido pasión por la música y la interpretación: se disfrazaba, daba conciertos y montaba obras en el salón de su casa. Con el tiempo, comenzó a formarse en canto, danza (aunque no se note, dice él), teatro musical, improvisación y obtuvo un diploma de arte dramático de GCSE.',
    descripcion2:
      'A los 18 años se trasladó a Madrid en busca de oportunidades. Actualmente estudia Comunicación Audiovisual, lo que le permite conocer la industria desde una perspectiva más externa. Al ver el casting en TikTok, no lo dudó: era la ocasión perfecta para lanzarse de lleno a lo que realmente le apasionaba.',
    hero: '/images/elenco/inicio/antonioA.webp',
    carpetaGaleria: '/images/elenco/antonio-lopez/', //COMPLETADA
    usernameInstagram: 'tonii.lop',
    usernameTikTok: 'toni_lop',
  },
  {
    slug: 'mario-valero',
    nombre: 'Mario Valero',
    descripcion1:
      '<strong>Mario Valero</strong> (Madrid, 2007) se ha formado en diversas escuelas de interpretación, entre ellas Primera Toma, donde cursó cuatro cursos regulares, y La Manada. Como bailarín, ha recibido formación en baile urbano y hip-hop en escuelas como Élite Estudio y Wosap.',
    descripcion2:
      'Tras finalizar el Bachillerato de Artes Escénicas en Madrid, actualmente, estudia teatro musical en Som Academy, donde continúa fortaleciendo su formación como bailarín —con disciplinas como ballet, jazz y claqué—, además de canto e interpretación.',
    hero: '/images/elenco/inicio/marioA.webp',
    carpetaGaleria: '/images/elenco/mario-valero/', //COMPLETADA
    usernameInstagram: '_mariovalero',
    usernameTikTok: 'mariovalerott',
  },
  {
    slug: 'sissi',
    nombre: 'Sissi',
    descripcion1: 'Es la gran estrella del Tindaya. Con una voz prodigiosa que personifica la libertad, la belleza y la resistencia espiritual frente a la brutalidad del régimen.',
    hero: '/images/elenco/inicio/sissiA.webp',
    carpetaGaleria: '/images/elenco/sissi/', //COMPLETADA
  },
  {
    slug: 'daniel-sarabia',
    nombre: 'Daniel Sarabia',
    descripcion1:
      '<strong>Daniel Sarabia</strong> nació en 2003 en las tierras áridas de Fuerteventura. Siempre fue un niño muy creativo al que le encantaba el arte. A los 12 años descubrió el teatro, y fue un verdadero despertar. En él encontró refugio para expresarse libremente y derribar el muro de vergüenza que había llevado durante años.',
    descripcion2:
      'Más adelante decidió convertir el teatro en su profesión y se mudó a Gran Canaria para cursar el bachillerato de Artes Escénicas. Tras los duros tiempos de pandemia, tuvo que dejar a un lado su parte artística, siempre soñando con retomarla. Ese momento llegó en 2025, cuando comenzó a estudiar Artes Escénicas en una de las escuelas más valoradas de Madrid. Por primera vez, Dani se sentía orgulloso y capaz de llamarse “artista”.',
    hero: '/images/elenco/inicio/danielA.webp',
    carpetaGaleria: '/images/elenco/daniel-sarabia/', //COMPLETADA
    usernameInstagram: 'd4.nii_',
    usernameTikTok: 'lady.moiraa',
  },
  { //OK
    slug: 'nicolas-hernandez',
    nombre: 'Nicolás Hernández',
    descripcion1:
      '<strong>Nicolás Hernández</strong> nació en Canarias, La Palma. Desde pequeño siempre estuvo familiarizado con la música pero nunca realizó nada artístico. A medida que fue creciendo se fue interesando más por las ramas artísticas y empezó a cantar y a componer. Este fue su primer proyecto teatral, que afrontó con mucha ilusión.',
    hero: '/images/elenco/inicio/nicolasA.webp',
    carpetaGaleria: '/images/elenco/nicolas-hernandez/', //COMPLETADA
    usernameInstagram: 'angelito.hf',
    usernameTikTok: '4ngelito.mp4',
    spotifyUrl: 'https://open.spotify.com/intl-es/artist/7raWRN780c15ouCSXpF2mZ?si=bekkihRpQ0OmfloK5IgT0w',
  },
  {
    slug: 'sergio-jurado',
    nombre: 'Sergio Jurado',
    descripcion1:
      '<strong>Sergio Jurado </strong>nacido en 1999 en Puerto de Sagunto, Valencia. A su temprana edad mostró interés en el teatro pero no fue hasta 2014 que comenzó a aprender sobre esta rama artística. Desde escuelas municipales a campus teatrales han servido para formar su vena artística.',
    descripcion2:
      'Ha estudiado Artes Escénicas en la escuela de interpretación Cristina Rota y en Corazza, compaginándola con su trabajo como creador de contenido en redes sociales. Tefía en Teatro llegó a Sergio porque uno de los actores de la obra estudiaba con él y se lo propuso como algo interesante. Al enterarse de lo que iba a ser el proyecto, Sergio aceptó sin dudar y dio su 100%.',
    hero: '/images/elenco/inicio/sergioA.webp',
    carpetaGaleria: '/images/elenco/sergio-jurado/', //COMPLETADA
    usernameInstagram: 'sergiojuradoyt',
    usernameTikTok: 'sergiojuradoyt',
  },
  {
    slug: 'sara-presilla',
    nombre: 'Sara Presilla',
    descripcion1:
      '<strong>Sara Presilla</strong> nació en 2004 en Madrid. Desde pequeña tenía claro que quería dedicarse al teatro musical, así que empieza su formación a los 8 años en Sing&Dance Proyect. Desde entonces ha seguido formándose continuamente: Cursó el IB de Artes Escénicas de Víctor Ullate, hizo el Pregrado de SOM Academy y, actualmente, continúa formándose en el Grado Oficial de SOM, mientras compagina sus estudios con clases de danza y técnica vocal.',
    descripcion2:
      'En 2018 inicia su carrera profesional con la Gala Benéfica anual de Saniclown, Amor a Primera Risa (Circo Price). Posteriormente, participa en la producción de Imprescindibles, Las Sin Sombrero el musical (2022) y en varias producciones amateur.',
    hero: '/images/elenco/inicio/sarapA.webp',
    carpetaGaleria: '/images/elenco/sara-presilla/', //COMPLETADA
    usernameInstagram: 'saraaalemany',
    usernameTikTok: 'saraaalemany',
  },
  {
    slug: 'juanjo-loscos',
    nombre: 'Juan José Loscos',
    descripcion1:
      'Juanjo Loscos nació en 1965 en Castellón. Con 9 años llegó a Madrid y aquí se quedó. Desde pequeño tenía claro que quería estudiar Arquitectura. Terminó la carrera, pero el teatro, la música y otras disciplinas artísticas le atraían. Así que, ejerce de Arquitecto y en los ratos libres desde hace más de 16 años forma parte de la asociación cultural “Tercer Acto” centrada en el teatro musical amateur.',
    descripcion2:
      'También le dio tiempo a cursar grado superior de joyería y grado superior de Esmalte al fuego sobre metal. En el futuro seguirá formándose en otras ramas artísticas. Siempre dispuesto a echar una mano y a colaborar, así fue como llegó a Tefía en Teatro.',
    hero: '/images/elenco/inicio/juanjoA.webp',
    carpetaGaleria: '/images/elenco/juanjo-loscos/', //DSC_3109.webp, AAA_0070.webp, AAA_0071.webp, AAA_0122.webp, DSC_5121.webp, DSC_5202.webp, DSC_5357.webp, DSC00700.webp
    usernameInstagram: 'jjloscos',
  },
  {
    slug: 'helena-madariaga',
    nombre: 'Helena Madariaga',
    descripcion1:
      'Su andadura en los musicales comienza cuando sus padres le anotan con 5 años a clases de música y desde ahí ya no pudieron bajarla del escenario. Con 8 años vio su primer musical, Peter Pan, ahí supo que ella quería hacer eso. Empezó entonces a tomar clases de teatro y coro en la misma escuela. Ya con 18 años decidió irse a estudiar a Madrid teatro musical a la vez que estudiaba la carrera de periodismo.',
    descripcion2:
      'Estuvo unos años en la escuela de Ángela Carrasco y después estudió la carrera de artes escénicas. Cuando terminó, puso rumbo a Jana Producciones, donde hizo diversos musicales como In The Heights, The Great Comet y First Daughter Suite. Actualmente sigue formándose en todas las disciplinas como en canto con Lydia Fairén o en baile en Broadway House.',
    hero: '/images/elenco/inicio/helenaA.webp',
    carpetaGaleria: '/images/elenco/helena-madariaga/', //DSC_2070.webp, DSC_4855.webp, DSC_5081.webp, _MG_1070.webp
    usernameInstagram: 'helena_mada',
    usernameTikTok: 'helena_mada',
  },
  {  //OK
    slug: 'sara-kondo',
    nombre: 'Sara Kondo',
    descripcion1:
      `<strong>Sara Kondo</strong> quiere ser actriz desde que tiene uso de razón. Comenzó a formarse a sus 15 años, ahora está cerca de cumplir ${calcularEdad('2003-04-30')}. <br>Sara está <strong>diplomada</strong> en interpretación en la escuela <strong>Central de Cine.</strong> Pero antes de esto se formó en <strong>improvisación 3 años</strong>, además de teatro textual en la escuela <strong>Nave 73.</strong> Tuvo un breve paso de un año por el mundo del <strong>doblaje en la EDM</strong>, para finalmente pasar al <strong>teatro musical en la escuela Jana </strong>donde estudió 2 años más. <br> Paralelamente, Sara está desarrollando otras facetas artísticas; como la danza en la escuela IDANCE o el canto con ayuda de una coach vocal. `,
    descripcion2:
      'Lo que le llevó a este proyecto fue sencillamente las ganas de contar historias a través del teatro. Utilizar su pasión para concienciar de una realidad que nadie quiere ver.',
    hero: '/images/elenco/inicio/sarakA.webp',
    carpetaGaleria: '/images/elenco/sara-kondo/', //COMPLETADA
    usernameInstagram: 'sarakondoo',
  },
  {
    slug: 'dario-s-waisen',
    nombre: 'Dario S. Waisen',
    descripcion1:
      '<strong>Darío S. Waisen</strong> nació en 2006 en Almería. Desde pequeño, mostró una gran fascinación por el teatro (en especial el musical), lo que le llevó a tomar clases de todas las disciplinas desde los 9 años de edad. También, se interesó por la dramaturgia estrenando en su ciudad una obra escrita y protagonizada por él: “Mirad Lo Que Me Hicisteis Hacer”',
    descripcion2:
      'Se mudó a Madrid buscando seguir formándose y creciendo en el mundo del teatro, participando en proyectos como “Tefía en Teatro” (2025) y “The Rocky Horror Picture Show” (2026)',
    hero: '/images/elenco/inicio/darioA.webp',
    carpetaGaleria: '/images/elenco/dario-s-waisen/', //COMPLETADA
    usernameInstagram: 'd4rioswais3n',
    usernameTikTok: 'darioosanchezz_',
  },
  { //OK
    slug: 'martin-de-pablo',
    nombre: 'Martín de Pablo',
    descripcion1:
      '<strong>Martín de Pablo</strong> nació en 2002 en Burgos. Se graduó en la especialidad de danza contemporánea por el Conservatorio Profesional de Danza de Burgos y por Danza 180 además de también ser graduado en Matemáticas por la UCM.',
    descripcion2:
      'Ha interpretado piezas para diversos coreógrafos, participado en proyectos como un videoclip para VOGUE y coreografiado su propia pieza. Se especializa en floorwork y acrobacia, aunque actualmente ha despertado en él un interés por el canto y la interpretación. Se encuentra tomando clases de canto a la par de creando otras piezas de danza para investigar con el movimiento y presentarlas en certámenes. Ah, también le podéis encontrar bailando en el Tindaya ;)',
    hero: '/images/elenco/inicio/martinA.webp',
    carpetaGaleria: '/images/elenco/martin-de-pablo/', //COMPLETADA
    usernameInstagram: 'martinbarriuso_',
    usernameTikTok: 'martinbarriuso',
  },
  {
    slug: 'victor-jurado',
    nombre: 'Víctor Jurado',
    descripcion1:
      'Víctor Jurado nació en 2005 en Madrid. Después de apuntarse a clases de teatro en la escuela teatral de Velilla de San Antonio, casi por una casualidad del destino, descubrió un mundo que le maravilló y apasionó a partes iguales. Después de cinco años en esta escuela decidió que lo que realmente quería era dedicarse al mundo de la actuación por encima de todo.',
    descripcion2:
      'Antes de empezar de lleno en ese impredecible mundo decidió ver qué se sentía al estar detrás de las cámaras y cursó un grado superior de realización en audiovisuales, donde tuvo la suerte de conocer a los directores de esta obra. Así que cuando le preguntaron si quería ayudarles en Tefía en Teatro no se lo pensó dos veces y partió a la aventura.',
    hero: '/images/elenco/inicio/victorA.png',
    carpetaGaleria: '/images/elenco/victor-jurado/', //DSC_5164.webp, DSC_3331.webp, DSC00660.webp, DSC00668.webp
    usernameInstagram: 'victor_jv1105',
  },
  {
    slug: 'alba-nunez',
    nombre: 'Alba Núñez',
    descripcion1:
      '<strong>Alba Núñez</strong> nació en 2004 en Madrid. Desde pequeña siempre le han atraído los musicales y todo el mundo de la actuación. Así que empezó la diplomatura de interpretación en el ICM, aunque los demás le dijeran que escogiera otra cosa. Al llegar al último año encontró el casting para Tefía en Teatro, y decidió hacerlo sin pensarlo mucho.',
    descripcion2:
      'Nunca había hecho una obra de teatro, pero tenía muchas ganas y es lo que quiere hacer toda su vida, así que fue a hacer la audición. Desde que empezaron los ensayos se ha dado cuenta de lo bonita que es la actuación y todo el mundo artístico. Ha hecho muchos amigos que tienen los mismos sueños que ella, y no podría estar más contenta de haber decidido ir al casting.',
    hero: '/images/elenco/inicio/albaA.webp',
    carpetaGaleria: '/images/elenco/alba-nunez/', //DSC_2063 copia.webp, DSC_2075.webp, DSC_2019.webp, DSC_2181.webp???, DSC_2879.webp, DSC00421.webp o la siguiente???, DSC_5484.webp, DSC_5615.webp esta pero editada?, IMG_1522.webp
    usernameInstagram: 'albii_nunez',
  },
  {
    slug: 'eider-ubeda',
    nombre: 'Eider Úbeda',
    descripcion1:
      '<strong>Eider Úbeda</strong>, nacidx en Getafe en 2005, es estudiante de física y músico a partes iguales. Lleva haciendo teatro desde que en su colegio formó parte de un pequeño musical. Toca la guitarra (eléctrica) y canta en el Coro Joven de Getafe.',
    descripcion2:
      'Como buen friki de los musicales que es, ha tomado clases de teatro musical y se sabe todas las letras de "Heathers". Llegó al Tindaya porque cree firmemente que las historias queers son historias que merecen ser contadas, y además lxs directorxs le parecieron majísimxs.',
    hero: '/images/elenco/inicio/eiderA.webp',
    carpetaGaleria: '/images/elenco/eider-ubeda/', //DSC_5408.webp, DSC_5610.webp, IMG_1496.webp, _MG_0662.webp, DSC_5122.webp
    usernameInstagram: 'cilantroider',
  },
  {
    slug: 'maria-hoyas',
    nombre: 'María Hoyas',
    descripcion1:
      '<strong>María Hoyas</strong> nació en Extremadura en 1996. Aunque su camino la llevó a estudiar periodismo siempre ha estado ligada al mundo de la interpretación y la música, comenzando a formarse en Artes Escénicas con 16 años. Actualmente ha finalizado una Diplomatura en Teatro Musical, algo que siempre había soñado hacer.',
    descripcion2:
      'En el ámbito escénico ha interpretado numerosos papeles como Kim en Miss Saigón y Audrey en La Tienda de los Horrores, además de formar parte del elenco de producciones locales como La Bella y la Bestia. También ha participado en diferentes cortometrajes, además de actuar en directo en teatros y salas como la Sala Morocco.',
    hero: '/images/elenco/inicio/mariaA.webp',
    carpetaGaleria: '/images/elenco/maria-hoyas/', //DSC_4858.webp, DSC_4857.webp, DSC_2530.webp recortada, DSC_2069.webp
    usernameInstagram: 'maria_hoyas',
    usernameTwitch: 'iammerycat',
  },
  {
    slug: 'nafsikaa-tzouganakis',
    nombre: 'Nafsikaa Tzouganakis',
    descripcion1:
      '<strong>Nafsikaa Tzouganakis</strong> nació en 2003 en Lyon, Francia, donde comenzó su formación en danza desde muy joven, centrada principalmente en ballet, y más adelante también en jazz y contemporáneo. Paralelamente, cantó durante seis años en un coro y tomó clases de interpretación.',
    descripcion2:
      'Se viene a Madrid en 2022 para empezar a formarse profesionalmente en SOM Academy primero en pregrado y luego en grado, donde sigue actualmente.',
    hero: '/images/elenco/inicio/nafsikaaA.webp',
    carpetaGaleria: '/images/elenco/nafsikaa-tzouganakis/', //DSC_4903.webp, DSC_4866.webp, DSC_4852.webp, DSC_4851.webp, DSC_4208.webp, DSC_3083.webp, DSC_2264.webp
    usernameInstagram: 'naf.tza',
    usernameTikTok: 'nnntza',
  },
];

export function getAllActors(): Actor[] {
  return actores.slice();
}

export function getActorBySlug(slug: string): Actor | undefined {
  return actores.find((a) => a.slug === slug);
}
