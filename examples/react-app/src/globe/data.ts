import {fetchData, getClusterLevelsH3} from '@flowmap.gl/examples-common';

export const flightsSourceUrl =
  'https://gist.github.com/ilyabo/15998ce470d8b4fe6ea5d94187adc89b';

// Pin both CSVs to the same snapshot for reproducible examples.
const flightsDataUrl =
  'https://gist.githubusercontent.com/ilyabo/15998ce470d8b4fe6ea5d94187adc89b/raw/51ee105f2323d47f39c792a1b53649f10cdf0f33';

export async function fetchGlobeData(clusteringMethod: string) {
  const data = await fetchData('HCA', flightsDataUrl);
  return {
    ...data,
    // Stop at H3 resolution zero: global data still occupies multiple cells.
    ...(clusteringMethod === 'H3'
      ? {clusterLevels: getClusterLevelsH3(data.locations, 4)}
      : null),
  };
}
