import {csv} from 'd3-fetch';

const base = 'https://gist.githubusercontent.com/ilyabo/';
// Migrations in Switzerland
const path = `${base}/a7b9701424257146b571149d92a14926/raw/2e9e1e9bcf64cf0090781b451037229ccb78e1b1`;
// BIXI rides
// const path = `${base}/68d3dba61d86164b940ffe60e9d36931/raw/a72938b5d51b6df9fa7bba9aa1fb7df00cd0f06a`;

export default function fetchData() {
  return Promise.all([
    csv(`${path}/locations.csv`, (row, i) => ({
      id: row.id,
      name: row.name,
      lat: Number(row.lat),
      lon: Number(row.lon),
    })),
    csv(`${path}/flows.csv`, (row) => ({
      origin: row.origin,
      dest: row.dest,
      count: Number(row.count),
    })),
  ]).then(([locations, flows]) => ({locations, flows}));
}
