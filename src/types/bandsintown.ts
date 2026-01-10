export interface Venue {
    name: string;
    location: string;
    city: string;
    region: string;
    country: string;
    latitude: string;
    longitude: string;
}

export interface Offer {
    type: string;
    url: string;
    status: string;
}

export interface Event {
    id: string;
    artist_id: string;
    url: string;
    on_sale_datetime: string;
    datetime: string;
    title: string;
    description: string;
    venue: Venue;
    offers: Offer[];
    lineup: string[];
}

export interface WidgetConfig {
    artist: string;
    theme: 'light' | 'dark';
    limit: number;
    buttonText: string;
    locale: string;
}
