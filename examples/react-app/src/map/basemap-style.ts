import type {StyleSpecification} from 'maplibre-gl';

export const FLOWMAP_LABELS_ANCHOR = 'flowmap-basemap-labels-start';

export function prepareBasemapStyle(
  style: StyleSpecification,
  labelsEnabled: boolean,
): StyleSpecification {
  const labels = style.layers.filter((layer) => layer.type === 'symbol');
  return {
    ...style,
    layers: [
      ...style.layers.filter((layer) => layer.type !== 'symbol'),
      // A stable insertion point survives theme changes and hidden labels.
      {
        id: FLOWMAP_LABELS_ANCHOR,
        type: 'background',
        paint: {'background-opacity': 0},
      },
      ...labels.map((layer) =>
        labelsEnabled
          ? layer
          : {...layer, layout: {...layer.layout, visibility: 'none' as const}},
      ),
    ],
  };
}
