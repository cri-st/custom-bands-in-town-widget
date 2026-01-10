import { Event, WidgetConfig } from '../types/bandsintown';

export function formatEventDate(dateStr: string, locale: string = 'es'): string {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = {
        day: 'numeric',
        month: 'long',
    };

    return new Intl.DateTimeFormat(locale, options).format(date).toUpperCase();
}

export function renderEventRow(event: Event, config: WidgetConfig, index: number): string {
    const formattedDate = formatEventDate(event.datetime, config.locale);
    const buyUrl = event.offers && event.offers.length > 0 ? event.offers[0].url : event.url;

    return `
    <div class="bit-event-row" style="animation-delay: ${index * 50}ms">
      <div class="bit-venue">${event.venue.name}</div>
      <div class="bit-date">${formattedDate}</div>
      <div class="bit-location">${event.venue.city}, ${event.venue.country}</div>
      <div class="bit-action">
        <a href="${buyUrl}" target="_blank" rel="noopener noreferrer" class="bit-buy-btn">
          ${config.buttonText}
        </a>
      </div>
    </div>
  `;
}

export function renderLoading(): string {
    return `<div class="bit-loading">Cargando fechas...</div>`;
}

export function renderError(message: string): string {
    return `<div class="bit-error">${message}</div>`;
}

export function renderEmpty(): string {
    return `<div class="bit-loading">No hay fechas programadas próximamente.</div>`;
}
