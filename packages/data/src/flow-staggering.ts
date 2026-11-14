/*
 * Copyright (c) Flowmap.gl contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import seedrandom from 'seedrandom';
import type {ClusterIndex} from './cluster/ClusterIndex.js';

export function createFlowStaggeringGetter<F>(clusterIndex?: ClusterIndex<F>) {
  const keys = new Map<string | number, string>();
  const getKey = (id: string | number): string => {
    const cached = keys.get(id);
    if (cached !== undefined) return cached;
    const cluster = clusterIndex?.getClusterById(id);
    // Hierarchy IDs can change across zoom levels without changing membership.
    // Hash membership once per cluster, rather than reseeding every incident flow
    // with a potentially large list of leaves on every viewport update.
    const key = cluster
      ? `cluster:${seedrandom.alea(
          JSON.stringify(
            clusterIndex!
              .expandCluster(cluster, Infinity)
              .map((leaf) => JSON.stringify(leaf))
              .sort(),
          ),
        )()}`
      : String(id);
    keys.set(id, key);
    return key;
  };
  return (origin: string | number, dest: string | number): number =>
    seedrandom.alea(`${getKey(origin)}-${getKey(dest)}`)();
}
