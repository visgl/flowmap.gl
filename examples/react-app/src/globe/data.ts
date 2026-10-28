import type {LoadedData} from '@flowmap.gl/examples-common';

// Synthetic counts: these routes demonstrate geometry, not flight statistics.
export const globeData: LoadedData = {
  locations: [
    {id: 'nyc', name: 'New York', lon: -74.006, lat: 40.7128},
    {id: 'lon', name: 'London', lon: -0.1276, lat: 51.5072},
    {id: 'zrh', name: 'Zurich', lon: 8.5417, lat: 47.3769},
    {id: 'par', name: 'Paris', lon: 2.3522, lat: 48.8566},
    {id: 'sfo', name: 'San Francisco', lon: -122.4194, lat: 37.7749},
    {id: 'tyo', name: 'Tokyo', lon: 139.6917, lat: 35.6895},
    {id: 'syd', name: 'Sydney', lon: 151.2093, lat: -33.8688},
    {id: 'sin', name: 'Singapore', lon: 103.8198, lat: 1.3521},
    {id: 'cpt', name: 'Cape Town', lon: 18.4241, lat: -33.9249},
    {id: 'gru', name: 'São Paulo', lon: -46.6333, lat: -23.5505},
    {id: 'anc', name: 'Anchorage', lon: -149.9003, lat: 61.2181},
    {id: 'hel', name: 'Helsinki', lon: 24.9384, lat: 60.1699},
    {id: 'fiji', name: 'Fiji', lon: 178.45, lat: -18.14},
    {id: 'samoa', name: 'Samoa', lon: -171.75, lat: -13.83},
  ],
  flows: [
    {origin: 'nyc', dest: 'lon', count: 160},
    {origin: 'lon', dest: 'nyc', count: 100},
    {origin: 'lon', dest: 'zrh', count: 70},
    {origin: 'par', dest: 'zrh', count: 45},
    {origin: 'sfo', dest: 'tyo', count: 145},
    {origin: 'tyo', dest: 'sfo', count: 80},
    {origin: 'tyo', dest: 'syd', count: 110},
    {origin: 'sin', dest: 'syd', count: 90},
    {origin: 'lon', dest: 'cpt', count: 120},
    {origin: 'gru', dest: 'cpt', count: 85},
    {origin: 'nyc', dest: 'gru', count: 130},
    {origin: 'anc', dest: 'hel', count: 65},
    {origin: 'fiji', dest: 'samoa', count: 55},
  ],
};
