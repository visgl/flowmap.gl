/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

import {latLngToCell, cellToLatLng} from 'h3-js';

export function getClusterLevelsH3(locations, minZoom = 1, maxZoom = 20) {
  let nodes = locations.map((d) => ({
    id: d.id,
    zoom: maxZoom,
    lat: +d.lat,
    lon: +d.lon,
  }));

  const result = [];
  let rawZoom = null;
  for (let zoom = maxZoom - 1; zoom >= minZoom; zoom--) {
    const h3Zoom = zoom - 4;
    const nodesByH3 = nodes.reduce((acc, d) => {
      const h3Id = latLngToCell(+d.lat, +d.lon, h3Zoom);
      if (!acc[h3Id]) {
        acc[h3Id] = [];
      }
      acc[h3Id].push(d);
      return acc;
    }, {});

    const keys = Object.keys(nodesByH3);
    if (keys.length < locations.length) {
      if (rawZoom === null) {
        rawZoom = zoom + 1;
      }
      nodes = keys.map((id) => {
        if (nodesByH3[id].length === 1) {
          const node = nodesByH3[id][0];
          return {
            id: `{[${node.id}:${zoom}]}`,
            zoom,
            lat: node.lat,
            lon: node.lon,
            children: [node.id],
          };
        }
        return {
          id: `{[${id}:${zoom}]}`,
          zoom,
          lat: cellToLatLng(id, true)[0],
          lon: cellToLatLng(id, true)[1],
          children: nodesByH3[id].map((d) => d.id),
        };
      });

      result.unshift({
        zoom,
        nodes,
      });
    }

    if (keys.length <= 1) {
      break;
    }
  }

  result.push({
    zoom: rawZoom ?? maxZoom,
    nodes: locations,
  });

  return result;
}
