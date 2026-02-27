import { Event } from '../types/bandsintown';

export interface Env {
  BANDSINTOWN_APP_ID: string;
  ALLOWED_ORIGINS: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGINS || '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (path === '/health') {
      return new Response('OK', { status: 200 });
    }

    if (path === '/api/events') {
      const artist = url.searchParams.get('artist');
      const date = url.searchParams.get('date') || 'upcoming';

      if (!artist) {
        return new Response(JSON.stringify({ error: 'Artist name is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!env.BANDSINTOWN_APP_ID || env.BANDSINTOWN_APP_ID === 'PENDING') {
        const mockEvents = generateMockEvents();
        return new Response(JSON.stringify(mockEvents), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-Mock-Data': 'true'
          },
        });
      }

      try {
        const bitUrl = `https://rest.bandsintown.com/artists/${encodeURIComponent(artist)}/events?app_id=${env.BANDSINTOWN_APP_ID}&date=${date}`;
        const response = await fetch(bitUrl);

        if (!response.ok) {
          return new Response(JSON.stringify({ error: 'Failed to fetch from Bandsintown' }), {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const data: Event[] = await response.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    if (path === '/embed.js') {
      const script = generateEmbedScript(url.origin);
      return new Response(script, {
        headers: {
          'Content-Type': 'application/javascript',
          ...corsHeaders,
        },
      });
    }

    if (path === '/widget') {
      const config = {
        artist: url.searchParams.get('artist') || 'Paula Prieto',
        limit: parseInt(url.searchParams.get('limit') || '20'),
        button: url.searchParams.get('button') || 'BUY',
        locale: url.searchParams.get('locale') || 'es',
        fontSize: url.searchParams.get('fontSize') || '0.8125rem',
        lineHeight: url.searchParams.get('lineHeight') || '1.2',
        letterSpacing: url.searchParams.get('letterSpacing') || '0.03em',
      };
      const widgetHtml = generateWidgetPage(url.origin, config, env);
      return new Response(widgetHtml, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          ...corsHeaders,
        },
      });
    }
    // --- Catch-all Proxy for paulaprieto.com ---
    // This allows the entire site to work under the worker domain, including assets, JS, and navigation.
    try {
      // 1. Prepare the upstream URL
      const cargoUrl = new URL(url.pathname + url.search, 'https://paulaprieto.com');

      // 2. Fetch from Cargo.site
      const cargoResponse = await fetch(cargoUrl.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BandsintownWidget/1.0)',
          'Accept': request.headers.get('Accept') || '*/*',
        },
      });

      // 3. For non-HTML responses (images, JS, CSS), return as-is
      const contentType = cargoResponse.headers.get('Content-Type') || '';
      if (!contentType.includes('text/html')) {
        return cargoResponse;
      }

      // 4. For HTML, perform our injections
      let html = await cargoResponse.text();

      const workerDomain = url.hostname;
      
      // Strategy: Replace Cargo's internal state references to prevent redirects
      // BUT preserve navigation links in href attributes
      
      // Replace canonical URL references in meta tags
      html = html.replace(/<meta property="og:url" content="https:\/\/paulaprieto\.com"/g, `<meta property="og:url" content="https://${workerDomain}"`);
      html = html.replace(/<meta property="og:url" content="https:\/\/www\.paulaprieto\.com"/g, `<meta property="og:url" content="https://www.${workerDomain}"`);
      html = html.replace(/<link rel="canonical" href="https:\/\/paulaprieto\.com"/g, `<link rel="canonical" href="https://${workerDomain}"`);
      
      // Fix Cargo's preloaded state - these are internal references, not user links
      // Only replace within the __PRELOADED_STATE__ JSON structure
      const stateMatch = html.match(/window\.__PRELOADED_STATE__=({.+?});?<\/script>/);
      if (stateMatch) {
        let stateStr = stateMatch[1];
        // Replace Cargo's internal domain references
        stateStr = stateStr.replace(/"hostname":"paulaprieto\.com"/g, `"hostname":"${workerDomain}"`);
        stateStr = stateStr.replace(/"display_url":"paulaprieto\.com"/g, `"display_url":"${workerDomain}"`);
        stateStr = stateStr.replace(/"domain":"paulaprieto\.com"/g, `"domain":"${workerDomain}"`);
        stateStr = stateStr.replace(/"direct_link":"https:\/\/paulaprieto\.com"/g, `"direct_link":"https://${workerDomain}"`);
        stateStr = stateStr.replace(/"css_url":"https:\/\/paulaprieto\.com/g, `"css_url":"https://${workerDomain}`);
        stateStr = stateStr.replace(/"rss_url":"https:\/\/paulaprieto\.com/g, `"rss_url":"https://${workerDomain}`);
        html = html.replace(/window\.__PRELOADED_STATE__=({.+?});?<\/script>/, `window.__PRELOADED_STATE__=${stateStr};</script>`);
      }
      
      // Replace old worker domain references
      html = html.replace(/bandsintown-widget\.crist-cloudflare\.workers\.dev/g, workerDomain);

      // Enhanced fix script that prevents Cargo redirects but handles navigation
      const globalFixScript = `
        <script>
          (function() {
            // Force Cargo to recognize the site ID even on a different domain
            const originalFetch = window.fetch;
            window.fetch = function(url, options) {
              if (typeof url === 'string' && url.includes('api.cargo.site/v1/package/')) {
                // Extract whatever hostname/ID it's trying to use and replace it with '673870'
                const parts = url.split('/');
                if (parts[parts.length - 1] !== '673870') {
                  url = url.substring(0, url.lastIndexOf('/') + 1) + '673870';
                }
              }
              return originalFetch(url, options);
            };
          })();
        </script>
      `;

      // Perform widget injection if placeholder exists
      if (html.includes('WIDGET TOUR')) {
        const events = await getBandsintownEvents('Paula Prieto', env);
        const widgetHtml = renderStaticWidget(events, {
          artist: 'Paula Prieto',
          limit: 20,
          button: 'BUY',
          locale: 'es',
          fontSize: '0.8125rem',
          lineHeight: '1.2',
          letterSpacing: '0.03em'
        });

        html = html.replace(/WIDGET TOUR/g, (match, offset, fullText) => {
          const textBefore = fullText.substring(0, offset);
          const lastScriptOpen = textBefore.lastIndexOf('<script');
          const lastScriptClose = textBefore.lastIndexOf('</script>');
          if (lastScriptOpen > lastScriptClose) {
            return JSON.stringify(widgetHtml).slice(1, -1);
          }
          return widgetHtml;
        });
      }

      // Inject our fix script into <head>
      if (html.includes('<head>')) {
        html = html.replace('<head>', '<head>' + globalFixScript);
      }

      return new Response(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      });

    } catch (error) {
      return new Response('Proxy error: ' + (error as Error).message, { status: 500 });
    }
  },
};

interface WidgetConfig {
  artist: string;
  limit: number;
  button: string;
  locale: string;
  fontSize: string;
  lineHeight: string;
  letterSpacing: string;
}

async function getBandsintownEvents(artist: string, env: Env): Promise<Event[]> {
  if (!env.BANDSINTOWN_APP_ID || env.BANDSINTOWN_APP_ID === 'PENDING') {
    return generateMockEvents();
  }
  try {
    const bitUrl = `https://rest.bandsintown.com/artists/${encodeURIComponent(artist)}/events?app_id=${env.BANDSINTOWN_APP_ID}&date=upcoming`;
    const response = await fetch(bitUrl);
    if (!response.ok) return generateMockEvents();
    return await response.json() as Event[];
  } catch {
    return generateMockEvents();
  }
}

function renderStaticWidget(events: Event[], config: any): string {
  const listHtml = events.slice(0, config.limit).map((event) => {
    const date = new Date(event.datetime);
    const day = date.getDate();
    // Using simple formatting to avoid Intl mismatch issues in different environments if any, 
    // but Intl is generally supported in Workers.
    const month = new Intl.DateTimeFormat(config.locale, { month: 'long' }).format(date).toUpperCase();
    const formattedDate = `${day} ${month}`;
    const buyUrl = event.offers && event.offers.length > 0 ? event.offers[0].url : event.url;

    return `<div class="bit-event-row">
      <div class="bit-venue">${event.venue.name}</div>
      <div class="bit-date">${formattedDate}</div>
      <div class="bit-location">${event.venue.city}, ${event.venue.country}</div>
      <div class="bit-action"><a href="${buyUrl}" target="_blank" rel="noopener noreferrer" class="bit-buy-btn">${config.button}</a></div>
    </div>`;
  }).join('');

  const emptyMsg = '<div class="bit-loading">NO UPCOMING DATES.</div>';

  return `
<style>
  .bit-static-widget {
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    font-weight: bold;
    font-size: ${config.fontSize};
    line-height: ${config.lineHeight};
    letter-spacing: ${config.letterSpacing};
    color: #000;
    text-transform: uppercase;
  }
  .bit-static-widget .bit-events-list { list-style: none; padding: 0; margin: 0; }
  .bit-static-widget .bit-event-row {
    display: grid;
    grid-template-columns: 1.2fr 1fr 1.5fr auto;
    align-items: center;
    gap: 20px;
    padding: 8px 0;
  }
  .bit-static-widget .bit-venue, .bit-static-widget .bit-date, .bit-static-widget .bit-location { text-align: left; }
  .bit-static-widget .bit-buy-btn {
    display: inline-block;
    padding: 4px 12px;
    border: 1px solid #000;
    color: #000;
    text-decoration: none;
    transition: all 0.1s ease;
    text-align: center;
    min-width: 50px;
  }
  .bit-static-widget .bit-buy-btn:hover { background: #000; color: #fff; }
  .bit-static-widget .bit-loading { padding: 20px 0; text-align: left; }
  @media (max-width: 768px) {
    .bit-static-widget .bit-event-row { grid-template-columns: 1fr auto; gap: 10px; }
    .bit-static-widget .bit-location { display: none; }
  }
  @media (max-width: 480px) {
    .bit-static-widget .bit-event-row { grid-template-columns: 1fr; gap: 4px; }
    .bit-static-widget .bit-buy-btn { width: 100%; box-sizing: border-box; }
  }
</style>
<div class="bit-static-widget">
  ${events.length > 0 ? `<div class="bit-events-list">${listHtml}</div>` : emptyMsg}
</div>`;
}


function generateWidgetPage(origin: string, config: WidgetConfig, env: Env): string {
  return `<!DOCTYPE html>
<html lang="${config.locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tour Dates</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
      font-weight: bold;
      font-size: ${config.fontSize};
      line-height: ${config.lineHeight};
      letter-spacing: ${config.letterSpacing};
      color: #000;
      background: transparent;
      text-transform: uppercase;
      padding: 0;
    }
    .bit-events-list { list-style: none; }
    .bit-event-row {
      display: grid;
      grid-template-columns: 1.2fr 1fr 1.5fr auto;
      align-items: center;
      gap: 20px;
      padding: 8px 0;
    }
    .bit-venue, .bit-date, .bit-location { text-align: left; }
    .bit-buy-btn {
      display: inline-block;
      padding: 4px 12px;
      border: 1px solid #000;
      color: #000;
      text-decoration: none;
      transition: all 0.1s ease;
      text-align: center;
      min-width: 50px;
    }
    .bit-buy-btn:hover { background: #000; color: #fff; }
    .bit-loading, .bit-error { padding: 20px 0; text-align: left; }
    @media (max-width: 768px) {
      .bit-event-row { grid-template-columns: 1fr auto; gap: 10px; padding: 12px 0; }
      .bit-location { display: none; }
      .bit-date { text-align: right; }
    }
    @media (max-width: 480px) {
      .bit-event-row { grid-template-columns: 1fr; gap: 4px; padding: 16px 0; }
      .bit-date, .bit-venue, .bit-location { text-align: left; }
      .bit-action { margin-top: 4px; }
      .bit-buy-btn { width: 100%; }
    }
  </style>
</head>
<body>
  <div id="bit-container">
    <div class="bit-loading">LOADING...</div>
  </div>
  <script>
    (async function() {
      const config = ${JSON.stringify(config)};
      const origin = "${origin}";
      const container = document.getElementById('bit-container');
      
      try {
        const response = await fetch(origin + '/api/events?artist=' + encodeURIComponent(config.artist));
        if (!response.ok) throw new Error('Failed to fetch events');
        
        const events = await response.json();
        if (!Array.isArray(events) || events.length === 0) {
          container.innerHTML = '<div class="bit-loading">NO UPCOMING DATES.</div>';
          return;
        }
        
        const listHtml = events.slice(0, config.limit).map(function(event) {
          const date = new Date(event.datetime);
          const day = date.getDate();
          const month = new Intl.DateTimeFormat(config.locale, { month: 'long' }).format(date).toUpperCase();
          const formattedDate = day + ' ' + month;
          const buyUrl = event.offers && event.offers.length > 0 ? event.offers[0].url : event.url;
          
          return '<div class="bit-event-row">' +
            '<div class="bit-venue">' + event.venue.name + '</div>' +
            '<div class="bit-date">' + formattedDate + '</div>' +
            '<div class="bit-location">' + event.venue.city + ', ' + event.venue.country + '</div>' +
            '<div class="bit-action"><a href="' + buyUrl + '" target="_blank" rel="noopener noreferrer" class="bit-buy-btn">' + config.button + '</a></div>' +
          '</div>';
        }).join('');
        
        container.innerHTML = '<div class="bit-events-list">' + listHtml + '</div>';
      } catch (error) {
        container.innerHTML = '<div class="bit-error">ERROR: ' + error.message.toUpperCase() + '</div>';
      }
    })();
  </script>
</body>
</html>`;
}

function generateEmbedScript(origin: string): string {
  return `
(function() {
  const SCRIPT_NAME = 'embed.js';
  
  class BandsintownWidget extends HTMLElement {
    constructor() {
      super();
      this._shadow = this.attachShadow({ mode: 'open' });
      this._config = {
        artist: 'Paula Prieto',
        theme: 'light',
        limit: 20,
        buttonText: 'BUY',
        locale: 'es',
        fontSize: '0.8125rem',
        lineHeight: '1.2',
        letterSpacing: '0.03em'
      };
      this._origin = "${origin}";
    }

    connectedCallback() {
      this._config.artist = this.getAttribute('data-artist') || this._config.artist;
      this._config.theme = this.getAttribute('data-theme') || this._config.theme;
      this._config.limit = parseInt(this.getAttribute('data-limit') || '10');
      this._config.buttonText = this.getAttribute('data-button-text') || this._config.buttonText;
      this._config.locale = this.getAttribute('data-locale') || this._config.locale;
      this._config.fontSize = this.getAttribute('data-font-size') || this._config.fontSize;
      this._config.lineHeight = this.getAttribute('data-line-height') || this._config.lineHeight;
      this._config.letterSpacing = this.getAttribute('data-letter-spacing') || this._config.letterSpacing;

      this.render();
      this.fetchEvents();
    }

    render(content = '<div class="bit-loading">LOADING...</div>') {
      this._shadow.innerHTML = \`
        <style>
          :host { 
            display: block; 
            width: 100%;
            --bit-font-size: \${this._config.fontSize};
            --bit-line-height: \${this._config.lineHeight};
            --bit-letter-spacing: \${this._config.letterSpacing};
          }
          
          .bit-container {
            font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
            font-weight: bold;
            font-size: var(--bit-font-size);
            line-height: var(--bit-line-height);
            letter-spacing: var(--bit-letter-spacing);
            color: #000;
            background: transparent;
            max-width: 100%;
            text-transform: uppercase;
          }
          
          .bit-events-list { 
            list-style: none; 
            padding: 0; 
            margin: 0; 
          }
          
          .bit-event-row {
            display: grid;
            grid-template-columns: 1.2fr 1fr 1.5fr auto;
            align-items: center;
            gap: 20px;
            padding: 8px 0;
            /* No borders in the reference image */
          }
          
          .bit-venue { 
            text-align: left;
          }
          
          .bit-date { 
            text-align: left;
          }
          
          .bit-location { 
            text-align: left;
          }
          
          .bit-buy-btn {
            display: inline-block;
            padding: 4px 12px;
            border: 1px solid #000;
            color: #000;
            text-decoration: none;
            transition: all 0.1s ease;
            text-align: center;
            min-width: 50px;
          }
          
          .bit-buy-btn:hover { 
            background: #000; 
            color: #fff; 
          }
          
          .bit-loading, .bit-error { 
            padding: 20px 0; 
            text-align: left;
          }

          @media (max-width: 768px) {
            .bit-event-row { 
              grid-template-columns: 1fr auto; 
              gap: 10px;
              padding: 12px 0;
            }
            .bit-location { display: none; }
            .bit-date { text-align: right; }
          }
          
          @media (max-width: 480px) {
            .bit-event-row { 
              grid-template-columns: 1fr; 
              gap: 4px;
              padding: 16px 0;
            }
            .bit-date, .bit-venue, .bit-location { text-align: left; }
            .bit-action { margin-top: 4px; }
            .bit-buy-btn { width: 100%; box-sizing: border-box; }
          }
        </style>
        <div class="bit-container">
          \${content}
        </div>
      \`;
    }

    async fetchEvents() {
      try {
        const queryUrl = \`\${this._origin}/api/events?artist=\${encodeURIComponent(this._config.artist)}\`;
        const response = await fetch(queryUrl);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch events');
        }
        
        const events = await response.json();
        if (!Array.isArray(events) || events.length === 0) {
          this.render('<div class="bit-loading">NO UPCOMING DATES.</div>');
          return;
        }

        const listHtml = events.slice(0, this._config.limit).map((event, index) => {
          const date = new Date(event.datetime);
          // Month name according to locale
          const day = date.getDate();
          const month = new Intl.DateTimeFormat(this._config.locale, { month: 'long' }).format(date).toUpperCase();
          const formattedDate = \`\${day} \${month}\`;
          
          const buyUrl = event.offers && event.offers.length > 0 ? event.offers[0].url : event.url;
          
          return \`
            <div class="bit-event-row">
              <div class="bit-venue">\${event.venue.name}</div>
              <div class="bit-date">\${formattedDate}</div>
              <div class="bit-location">\${event.venue.city}, \${event.venue.country}</div>
              <div class="bit-action">
                <a href="\${buyUrl}" target="_blank" rel="noopener noreferrer" class="bit-buy-btn">
                  \${this._config.buttonText}
                </a>
              </div>
            </div>
          \`;
        }).join('');

        this.render(\`<div class="bit-events-list">\${listHtml}</div>\`);
      } catch (error) {
        this.render(\`<div class="bit-error">ERROR: \${error.message.toUpperCase()}</div>\`);
      }
    }
  }

  if (!customElements.get('bandsintown-widget')) {
    customElements.define('bandsintown-widget', BandsintownWidget);
  }

  function init() {
    const placeholders = document.querySelectorAll('#bit-widget');
    placeholders.forEach(p => {
      const widget = document.createElement('bandsintown-widget');
      Array.from(p.attributes).forEach(attr => {
        widget.setAttribute(attr.name, attr.value);
      });
      p.parentNode ? p.parentNode.replaceChild(widget, p) : null;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`;
}

function generateMockEvents(): Event[] {
  const venues = [
    { name: 'Teatro Gran Rex', city: 'Buenos Aires', country: 'Argentina' },
    { name: 'Estadio Luna Park', city: 'Buenos Aires', country: 'Argentina' },
    { name: 'Movistar Arena', city: 'Buenos Aires', country: 'Argentina' },
    { name: 'Teatro Colón', city: 'Buenos Aires', country: 'Argentina' },
    { name: 'Estadio Único de La Plata', city: 'La Plata', country: 'Argentina' },
    { name: 'Quality Espacio', city: 'Córdoba', country: 'Argentina' },
    { name: 'Teatro El Círculo', city: 'Rosario', country: 'Argentina' },
    { name: 'Arena Maipú', city: 'Mendoza', country: 'Argentina' },
    { name: 'Anfiteatro Martín Fierro', city: 'Mar del Plata', country: 'Argentina' },
    { name: 'Teatro Auditorium', city: 'Mar del Plata', country: 'Argentina' },
    { name: 'Estadio Malvinas Argentinas', city: 'Buenos Aires', country: 'Argentina' },
    { name: 'Centro Cultural Kirchner', city: 'Buenos Aires', country: 'Argentina' },
    { name: 'Orfeo Superdomo', city: 'Córdoba', country: 'Argentina' },
    { name: 'Teatro Coliseo', city: 'Buenos Aires', country: 'Argentina' },
    { name: 'Vorterix', city: 'Buenos Aires', country: 'Argentina' },
    { name: 'Niceto Club', city: 'Buenos Aires', country: 'Argentina' },
    { name: 'Sala Configura Tu API', city: 'Bandsintown', country: 'API Land' },
    { name: 'Teatro De Las Credenciales', city: 'Secret Key', country: 'Token City' },
    { name: 'Anfiteatro Conecta Tu Cuenta', city: 'Paula Prieto', country: 'Necesita Acceso' },
    { name: 'Arena Activa Tu Llave', city: 'Visita Settings', country: 'En Tu Perfil' },
  ];

  const now = new Date();

  return venues.map((venue, i) => {
    const datetime = new Date(now);
    datetime.setDate(now.getDate() + (i + 1) * 7);

    return {
      id: `mock-${i + 1}`,
      artist_id: 'mock-artist',
      url: 'https://artists.bandsintown.com',
      on_sale_datetime: '',
      datetime: datetime.toISOString(),
      title: '',
      description: '',
      venue: {
        ...venue,
        location: `${venue.city}, ${venue.country}`,
        latitude: '0',
        longitude: '0',
        region: ''
      },
      offers: [
        {
          type: 'Tickets',
          url: 'https://artists.bandsintown.com',
          status: 'available'
        }
      ],
      lineup: ['Paula Prieto']
    };
  });
}
