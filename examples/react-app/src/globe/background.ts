import {_GlobeView as GlobeView, MapView} from '@deck.gl/core';
import {GeoJsonLayer, PathLayer, SolidPolygonLayer} from '@deck.gl/layers';

export const globeView = new GlobeView({id: 'globe', controller: true});
export const mapView = new MapView({id: 'map'});

const graticule: number[][][] = [];
for (let longitude = -180; longitude < 180; longitude += 30) {
  graticule.push(Array.from({length: 91}, (_, i) => [longitude, -90 + i * 2]));
}
for (let latitude = -60; latitude <= 60; latitude += 30) {
  graticule.push(Array.from({length: 181}, (_, i) => [-180 + i * 2, latitude]));
}

export function globeBackground(dark: boolean) {
  return [
    new SolidPolygonLayer({
      id: 'globe-ocean',
      data: [
        [
          [-180, 90],
          [0, 90],
          [180, 90],
          [180, -90],
          [0, -90],
          [-180, -90],
        ],
      ],
      getPolygon: (polygon) => polygon,
      getFillColor: dark ? [17, 30, 45] : [213, 231, 242],
    }),
    new GeoJsonLayer({
      id: 'globe-land',
      data: 'https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_50m_land.geojson',
      filled: true,
      stroked: false,
      getFillColor: dark ? [43, 59, 70] : [237, 239, 226],
    }),
    new PathLayer({
      id: 'globe-graticule',
      data: graticule,
      getPath: (path) => path,
      getColor: dark ? [130, 150, 170, 45] : [80, 110, 130, 50],
      widthUnits: 'pixels',
      getWidth: 1,
    }),
  ];
}
