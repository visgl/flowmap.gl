import {csv} from 'd3-fetch';

export default async function fetchData() {
  const base = 'https://gist.githubusercontent.com/ilyabo/';
  const path = `${base}/a7b9701424257146b571149d92a14926/raw/2e9e1e9bcf64cf0090781b451037229ccb78e1b1`;
  const [locations, flows] = await Promise.all([
    csv(`${path}/locations.csv`, (row, i) => ({
      id: row.id!,
      name: row.name!,
      lat: Number(row.lat),
      lon: Number(row.lon),
    })),
    csv(`${path}/flows.csv`, (row) => ({
      origin: row.origin!,
      dest: row.dest!,
      count: Number(row.count),
    })),
  ]);
  return {locations, flows};
}
