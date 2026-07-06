// @ts-check
import { defineConfig, envField } from 'astro/config';

// https://astro.build/config
import sitemap, { ChangeFreqEnum } from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://tefiaenteatro.com', // Cambia esta URL si es diferente
  env: {
    schema: {
      PUBLIC_REVISION_API_URL: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
      }),
      // Mismo valor que PHOTO_REPORT_SECRET en Lambda; expuesto en HTML de galería VIP (zona autenticada)
      PUBLIC_PHOTO_REPORT_AUTH: envField.string({
        context: 'client',
        access: 'public',
        optional: true,
      }),
    },
  },
  integrations: [
    sitemap({
      filter: (url) => {
        const { pathname } = new URL(url);
        const normalized = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;

        if (normalized === '/fortis-imaginatio') {
          return false;
        }

        if (normalized.startsWith('/zona-vip')) {
          return false;
        }

        const legalPages = new Set(['/aviso-legal', '/privacy-policy', '/cookies-policy']);
        if (legalPages.has(normalized)) {
          return false;
        }

        return true;
      },
      customPages: [],
      serialize: (item) => {
        const { pathname } = new URL(item.url);
        const normalized = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;

        const keyPages = new Set(['/contacto', '/faq', '/elenco', '/zona-vip', '/sobre-el-proyecto']);

        let priority = 0.7;
        if (normalized === '/') {
          priority = 1.0;
        } else if (normalized.startsWith('/elenco/') || normalized.startsWith('/direccion/')) {
          priority = 0.7;
        } else if (keyPages.has(normalized)) {
          priority = 0.9;
        }

        return {
          ...item,
          lastmod: item.lastmod ?? new Date().toISOString(),
          changefreq: item.changefreq ?? ChangeFreqEnum.MONTHLY,
          priority
        };
      }
    })
  ],
  // Prefetch configuración: evita saturar conexiones lentas (ej. 3G)
  // - prefetchAll: false => NO predescarga todo automáticamente
  // - defaultStrategy: 'hover' => solo predescarga cuando pasas el ratón por un enlace
  //   (en móvil, sin hover, no se hace prefetch en segundo plano)
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover'
  }
});