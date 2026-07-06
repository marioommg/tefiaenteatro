export type FAQItem = {
  id: string;
  question: string;
  /** HTML allowed. Keep it trusted content. */
  answer: string;
  /** Open by default */
  open?: boolean;
  /** Hidden keywords to improve search discoverability */
  tags?: string[];
};

export type FAQGroup = {
  id: string;
  title: string;
  items: FAQItem[];
};

export const faqGroups: FAQGroup[] = [
  {
    id: 'sobre-proyecto',
    title: 'Sobre el proyecto',
    items: [
      {
        id: 'que-es',
        question: '¿Qué es Tefía en Teatro?',
        answer:
          'Proyecto escénico independiente inspirado en la serie "Las noches de Tefía", creado por un equipo joven desde la idea hasta su puesta en escena, como parte de un TFC. Conoce más en <a href="/sobre-el-proyecto">Sobre el proyecto</a>.',
        open: true,
        tags: ['proyecto', 'obra', 'teatro', 'tefia', 'tefía', 'las noches de tefía', 'sinopsis', 'qué es', 'que es', 'independiente', 'tfc'],
      },
      {
        id: 'proposito',
        question: '¿Cuál fue el propósito del proyecto?',
        answer:
          'Demostrar que los jóvenes podemos contar historias y que merecen ser escuchadas. (Y bueno, llevar a teatro la serie también fue nuestro objetivo)',
        tags: ['propósito', 'proposito', 'objetivo', 'misión', 'lgtbiq+', 'memoria histórica', 'memoria historica', 'derechos'],
      },
      {
        id: 'oficialidad',
        question: '¿Es un proyecto oficial de “Las noches de Tefía”?',
        answer:
          'No. Es una creación independiente inspirada en la serie, sin afiliación oficial.',
        tags: ['oficial', 'oficialidad', 'derechos', 'afiliación', 'afiliacion', 'inspiración', 'inspiracion', 'aclaración', 'aclaracion'],
      },
    ],
  },
  {
    id: 'presentacion-funciones',
    title: 'Presentación y funciones',
    items: [
      {
        id: 'cuando-donde',
        question: '¿Dónde y cuándo se presentó?',
        answer:
          'El musical tuvo un total de 5 representaciones en distintos Centros Culturales de Madrid. En esta web puedes explorar el proceso creativo y el equipo que lo hizo posible.',
        tags: ['fecha', 'cuándo', 'cuando', 'dónde', 'donde', 'lugar', 'auditorio paco de lucía', 'presentación', 'evento'],
      },
      {
        id: 'futuras-funciones',
        question: '¿Habrá nuevas funciones o reposiciones?',
        answer:
          'No. No habrá más representaciones; así lo ha determinado la productora Buendía Estudios. No tenemos ninguna vinculación con dicha productora.',
        tags: ['funciones', 'reposición', 'reposiciónes', 'reposicion', 'reposiciones', 'entradas', 'fechas', 'calendario', 'buendía estudios', 'buendia estudios', 'productora'],
      },
    ],
  },
  {
    id: 'contenidos-galeria',
    title: 'Contenidos y galería',
    items: [
      {
        id: 'fotos',
        question: '¿Dónde puedo ver fotografías del proyecto?',
        answer:
          'En los perfiles de <a href="/elenco">Elenco</a> y en <a href="/#direccion">Dirección</a> encontrarás selecciones de imágenes. En <a href="/zona-vip/galeria">Zona VIP · Galería</a> hay material ampliado para acreditados.',
        tags: ['fotos', 'fotografías', 'fotografia', 'galería', 'galeria', 'imágenes', 'images', 'making of', 'escena'],
      },
      {
        id: 'videos',
        question: '¿Puedo ver un vídeo de la representación?',
        answer:
          'Si bien nos encantaría publicar la obra a todo el público, nos vemos en la obligación de mantener ese contenido de forma privada. Si participaste en el proyecto, podrás verlo en la <a href="/zona-vip/videos">Zona VIP</a>. Siempre puedes contactar con nosotros para obtener más información.',
        tags: ['vídeos', 'videos', 'tráiler', 'trailer', 'grabación', 'media', 'contenido'],
      },
    ],
  },
  {
    id: 'zona-vip',
    title: 'Zona VIP',
    items: [
      {
        id: 'vip',
        question: '¿Qué es la Zona VIP y cómo accedo?',
        answer:
          'Es un apartado con contenido exclusivo para quienes asististeis o colaborasteis. Puedes acceder desde la sección <a href="/zona-vip">Zona VIP</a>.',
        tags: ['vip', 'zona vip', 'exclusivo', 'acceso', 'privado', 'colaboradores', 'invitados', 'contraseña', 'password'],
      },
      {
        id: 'vip-olvido',
        question: 'He perdido la contraseña de la Zona VIP',
        answer:
          'Por seguridad, pide asistencia desde <a href="/contacto">Contacto</a> indicando tu nombre y relación con el proyecto o pregunta a cualquier miembro del equipo por la contraseña.',
        tags: ['vip', 'contraseña', 'contrasena', 'recuperar', 'acceso'],
      },
    ],
  },
  {
    id: 'equipo',
    title: 'Equipo',
    items: [
      {
        id: 'equipo',
        question: '¿Quiénes forman el equipo?',
        answer:
          'Consulta perfiles y recorrido en <a href="/elenco">Elenco</a> y en la sección de <a href="/#direccion">Dirección</a>.',
        tags: ['equipo', 'reparto', 'dirección', 'direccion', 'elenco', 'biografías', 'perfiles'],
      },
    ],
  },
  {
    id: 'busqueda-filtros',
    title: 'Búsqueda y filtros',
    items: [
      {
        id: 'filtros-galeria',
        question: '¿Cómo funcionan los filtros de la galería?',
        answer:
          'Sirven para acotar por personas, escenas y temas. Combina etiquetas y el buscador para encontrar resultados más precisos.',
        tags: ['filtros', 'búsqueda', 'busqueda', 'etiquetas', 'galería', 'galeria', 'keywords'],
      },
    ],
  },
  {
    id: 'privacidad-legal',
    title: 'Privacidad y legal',
    items: [
      {
        id: 'uso-material',
        question: '¿Qué uso puedo hacer del material de la web?',
        answer:
          'Consulta el <a href="/aviso-legal">Aviso legal</a> para conocer condiciones de uso y créditos. Si tienes dudas, escríbenos.',
        tags: ['derechos', 'licencia', 'uso', 'cita', 'créditos', 'creditos', 'legal'],
      },
      {
        id: 'privacidad',
        question: '¿Cómo tratáis mis datos?',
        answer:
          'Encontrarás los detalles en la <a href="/privacy-policy">Política de privacidad</a>. Usamos solo lo necesario para el funcionamiento y el contacto.',
        tags: ['privacidad', 'datos', 'RGPD', 'protección de datos', 'proteccion de datos'],
      },
      {
        id: 'cookies',
        question: '¿Qué cookies utilizáis?',
        answer:
          'Lo explicamos en la <a href="/cookies-policy">Política de cookies</a>; puedes gestionar tu consentimiento.',
        tags: ['cookies', 'consentimiento', 'técnica', 'tecnica', 'analítica', 'analitica'],
      },
    ],
  },
  {
    id: 'contacto-soporte',
    title: 'Contacto y soporte',
    items: [
      {
        id: 'contacto',
        question: '¿Cómo puedo contactar o apoyar el proyecto?',
        answer:
          'El proyecto ha finalizado y esta web permanece como un archivo de memoria de todo lo que creamos. La mejor forma de apoyarnos es compartiendo y difundiendo nuestro trabajo para que no caiga en el olvido. Si necesitas escribirnos, puedes hacerlo desde la página de <a href="/contacto">Contacto</a>.',
        tags: ['contacto', 'email', 'correo', 'apoyar', 'colaborar', 'ayuda', 'soporte', 'patrocinio'],
      },
      {
        id: 'soporte',
        question: 'Tengo problemas técnicos o de acceso',
        answer:
          'Prueba a recargar y limpiar caché. Si persiste, cuéntanos el problema en <a href="/contacto">Contacto</a>.',
        tags: ['soporte', 'error', 'acceso', 'técnico', 'tecnico', 'ayuda'],
      },
      {
        id: 'retirada-correccion',
        question: '¿Puedo solicitar retirar o corregir una foto o dato?',
        answer:
          'Sí. Indícanos el enlace y el motivo en <a href="/contacto">Contacto</a> y lo revisamos.',
        tags: ['retirar', 'retirada', 'corrección', 'correccion', 'derechos de imagen', 'privacidad'],
      },
    ],
  },
];

export const faqs: FAQItem[] = faqGroups.flatMap((g) => g.items);

export default faqs;

