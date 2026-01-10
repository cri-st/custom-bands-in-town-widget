
// This file will be bundled/read by the worker to be served as embed.js
// We use a Shadow DOM approach to ensure styles don't conflict with the host site.

(function () {
    const SCRIPT_NAME = 'embed.js';

    class BandsintownWidget extends HTMLElement {
        private _shadow: ShadowRoot;
        private _config: any = {
            artist: 'Paula Prieto',
            theme: 'light',
            limit: 10,
            buttonText: 'BUY',
            locale: 'es'
        };
        private _origin: string = '';

        constructor() {
            super();
            this._shadow = this.attachShadow({ mode: 'open' });
        }

        connectedCallback() {
            // Get origin from script tag src
            const scripts = document.getElementsByTagName('script');
            for (let i = 0; i < scripts.length; i++) {
                if (scripts[i].src && scripts[i].src.includes(SCRIPT_NAME)) {
                    const url = new URL(scripts[i].src);
                    this._origin = url.origin;
                    break;
                }
            }

            // Overwrite config from data attributes
            this._config.artist = this.getAttribute('data-artist') || this._config.artist;
            this._config.theme = this.getAttribute('data-theme') || this._config.theme;
            this._config.limit = parseInt(this.getAttribute('data-limit') || '10');
            this._config.buttonText = this.getAttribute('data-button-text') || this._config.buttonText;
            this._config.locale = this.getAttribute('data-locale') || this._config.locale;

            this.render();
            this.fetchEvents();
        }

        render(content: string = '<div class="bit-loading">Cargando...</div>') {
            this._shadow.innerHTML = `
        <style>
          :host {
            display: block;
            width: 100%;
          }
          /* Injected styles from styles.ts will go here */
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap');
          
          .bit-container {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0a0a0a;
            max-width: 100%;
          }
          .bit-events-list { list-style: none; padding: 0; margin: 0; }
          .bit-event-row {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr auto;
            align-items: center;
            gap: 24px;
            padding: 20px 0;
            border-bottom: 1px solid rgba(0,0,0,0.08);
            opacity: 0;
            transform: translateY(10px);
            animation: bitFadeIn 0.5s ease forwards;
          }
          .bit-event-row:last-child { border-bottom: none; }
          .bit-venue { font-weight: 600; font-size: 15px; text-transform: uppercase; }
          .bit-date { font-size: 14px; text-transform: uppercase; text-align: center; }
          .bit-location { font-size: 14px; text-transform: uppercase; color: #1a1a1a; text-align: center; }
          .bit-buy-btn {
            display: inline-block;
            padding: 8px 16px;
            border: 1px solid #0a0a0a;
            color: #0a0a0a;
            text-decoration: none;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.1em;
            transition: all 0.2s ease;
            text-align: center;
            min-width: 80px;
          }
          .bit-buy-btn:hover { background: #0a0a0a; color: #ffffff; }
          .bit-loading, .bit-error { padding: 40px; text-align: center; font-size: 14px; text-transform: uppercase; color: #999; }
          @keyframes bitFadeIn { to { opacity: 1; transform: translateY(0); } }
          
          @media (max-width: 768px) {
            .bit-event-row { grid-template-columns: 1fr auto; gap: 12px; }
            .bit-location { display: none; }
            .bit-date { text-align: right; }
          }
          @media (max-width: 480px) {
            .bit-event-row { grid-template-columns: 1fr; text-align: left; }
            .bit-date { text-align: left; margin: 4px 0; }
            .bit-buy-btn { width: 100%; box-sizing: border-box; }
          }
        </style>
        <div class="bit-container">
          ${content}
        </div>
      `;
        }

        async fetchEvents() {
            try {
                const response = await fetch(\`\${this._origin}/api/events?artist=\${encodeURIComponent(this._config.artist)}\`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch events');
        }
        
        const events = await response.json();
        if (events.length === 0) {
          this.render('<div class="bit-loading">No hay fechas programadas próximamente.</div>');
          return;
        }

        const html = \`
          <div class="bit-events-list">
            \${events.slice(0, this._config.limit).map((event: any, index: number) => {
              const date = new Date(event.datetime);
              const formattedDate = new Intl.DateTimeFormat(this._config.locale, { day: 'numeric', month: 'long' }).format(date).toUpperCase();
              const buyUrl = event.offers && event.offers.length > 0 ? event.offers[0].url : event.url;
              
              return \`
                <div class="bit-event-row" style="animation-delay: \${index * 50}ms">
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
            }).join('')}
          </div>
        \`;
        this.render(html);
      } catch (error: any) {
        this.render(\`<div class="bit-error">Error: \${error.message}</div>\`);
      }
    }
  }

  // Register the custom element
  if (!customElements.get('bandsintown-widget')) {
    customElements.define('bandsintown-widget', BandsintownWidget);
  }

  // Initialize on placeholder divs
  function init() {
    const placeholders = document.querySelectorAll('#bit-widget');
    placeholders.forEach(p => {
      // Replace div with custom element
      const widget = document.createElement('bandsintown-widget');
      // Copy data attributes
      Array.from(p.attributes).forEach(attr => {
        widget.setAttribute(attr.name, attr.value);
      });
      p.parentNode?.replaceChild(widget, p);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
