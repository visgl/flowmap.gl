import type {ClusterLevels} from '@flowmap.gl/data';
import type {LocationDatum} from './index';

export function getClusterLevelsH3(
  locations: LocationDatum[],
  minZoom?: number,
  maxZoom?: number,
): ClusterLevels;
