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

    return new Response('Not Found', { status: 404 });
  },
};

function generateEmbedScript(origin: string): string {
  // We use backslashes to escape characters that should remain literal in the final JS string
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
        limit: 10,
        buttonText: 'BUY',
        locale: 'es'
      };
      this._origin = "${origin}";
    }

    connectedCallback() {
      this._config.artist = this.getAttribute('data-artist') || this._config.artist;
      this._config.theme = this.getAttribute('data-theme') || this._config.theme;
      this._config.limit = parseInt(this.getAttribute('data-limit') || '10');
      this._config.buttonText = this.getAttribute('data-button-text') || this._config.buttonText;
      this._config.locale = this.getAttribute('data-locale') || this._config.locale;

      this.render();
      this.fetchEvents();
    }

    render(content = '<div class="bit-loading">Cargando fechas...</div>') {
      this._shadow.innerHTML = \`
        <style>
          :host { display: block; width: 100%; border-radius: 8px; overflow: hidden; }
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600&display=swap');
          
          .bit-container {
            font-family: 'Outfit', -apple-system, sans-serif;
            color: #111;
            background: transparent;
            max-width: 100%;
          }
          .bit-events-list { list-style: none; padding: 0; margin: 0; }
          .bit-event-row {
            display: grid;
            grid-template-columns: 1.5fr 1fr 1fr auto;
            align-items: center;
            gap: 24px;
            padding: 24px 0;
            border-bottom: 1px solid rgba(0,0,0,0.06);
            opacity: 0;
            transform: translateY(10px);
            animation: bitFadeIn 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
          }
          .bit-event-row:last-child { border-bottom: none; }
          .bit-venue { font-weight: 600; font-size: 16px; text-transform: uppercase; letter-spacing: 0.05em; }
          .bit-date { font-size: 14px; text-transform: uppercase; text-align: center; color: #444; }
          .bit-location { font-size: 14px; text-transform: uppercase; color: #666; text-align: center; }
          .bit-buy-btn {
            display: inline-block;
            padding: 10px 28px;
            border: 1.5px solid #000;
            color: #000;
            text-decoration: none;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.15em;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            text-align: center;
            min-width: 90px;
          }
          .bit-buy-btn:hover { background: #000; color: #fff; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
          .bit-loading, .bit-error { padding: 60px 20px; text-align: center; font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; }
          @keyframes bitFadeIn { to { opacity: 1; transform: translateY(0); } }
          
          @media (max-width: 900px) {
            .bit-event-row { grid-template-columns: 1.5fr 1fr auto; gap: 16px; }
            .bit-location { display: none; }
          }
          @media (max-width: 600px) {
            .bit-event-row { grid-template-columns: 1fr auto; gap: 12px; }
            .bit-date { text-align: right; }
          }
          @media (max-width: 480px) {
            .bit-event-row { grid-template-columns: 1fr; gap: 8px; padding: 24px 0; }
            .bit-venue, .bit-date { text-align: left; }
            .bit-buy-btn { width: 100%; box-sizing: border-box; margin-top: 12px; }
          }
        </style>
        <div class="bit-container">
          \${content}
        </div>
      \`;
    }

    async fetchEvents() {
      try {
        const queryUrl = \\\`\\\${this._origin}/api/events?artist=\\\${encodeURIComponent(this._config.artist)}\\\`;
        const response = await fetch(queryUrl);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch events');
        }
        
        const events = await response.json();
        if (!Array.isArray(events) || events.length === 0) {
          this.render('<div class="bit-loading">No hay fechas programadas próximamente.</div>');
          return;
        }

        const listHtml = events.slice(0, this._config.limit).map((event, index) => {
          const date = new Date(event.datetime);
          const formattedDate = new Intl.DateTimeFormat(this._config.locale, { day: 'numeric', month: 'long' }).format(date).toUpperCase();
          const buyUrl = event.offers && event.offers.length > 0 ? event.offers[0].url : event.url;
          
          return \\\`
            <div class="bit-event-row" style="animation-delay: \\\${index * 60}ms">
              <div class="bit-venue">\\\${event.venue.name}</div>
              <div class="bit-date">\\\${formattedDate}</div>
              <div class="bit-location">\\\${event.venue.city}, \\\${event.venue.country}</div>
              <div class="bit-action">
                <a href="\\\${buyUrl}" target="_blank" rel="noopener noreferrer" class="bit-buy-btn">
                  \\\${this._config.buttonText}
                </a>
              </div>
            </div>
          \\\`;
        }).join('');

        this.render(\\\`<div class="bit-events-list">\\\${listHtml}</div>\\\`);
      } catch (error) {
        this.render(\\\`<div class="bit-error">Error: \\\${error.message}</div>\\\`);
      }
    }
  }

  if (!customElements.get('bandsintown-widget')) {
    customElements.define('bandsintown-widget', BandsintownWidget);
  }

  function init() {
    const placeholders = document.querySelectorAll('#bit-widget');
    placeholders.forEach(p => {
      if (p.tagName === 'DIV') {
        const widget = document.createElement('bandsintown-widget');
        Array.from(p.attributes).forEach(attr => {
          widget.setAttribute(attr.name, attr.value);
        });
        p.parentNode.replaceChild(widget, p);
      }
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
    // Subliminal messages (creative, non-technical)
    { name: 'Sala Configura Tu API', city: 'Bandsintown', country: 'API Land' },
    { name: 'Teatro De Las Credenciales', city: 'Secret Key', country: 'Token City' },
    { name: 'Anfiteatro Conecta Tu Cuenta', city: 'Paula Prieto', country: 'Necesita Acceso' },
    { name: 'Arena Activa Tu Llave', city: 'Visita Settings', country: 'En Tu Perfil' },
  ];

  const now = new Date();

  return venues.map((venue, i) => {
    const datetime = new Date(now);
    datetime.setDate(now.getDate() + (i + 1) * 7); // One event per week

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
