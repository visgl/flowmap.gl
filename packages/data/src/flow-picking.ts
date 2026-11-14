/** Find reverse directions in the final displayed (and possibly aggregated) flows. */
export function getFlowHasReverseValues<F>(
  flows: F[],
  getOrigin: (flow: F) => string | number,
  getDest: (flow: F) => string | number,
): Float32Array {
  // Nested maps preserve ID types and avoid collisions from concatenated IDs.
  const destinations = new Map<string | number, Set<string | number>>();
  for (const flow of flows) {
    const origin = getOrigin(flow);
    let targets = destinations.get(origin);
    if (!targets) destinations.set(origin, (targets = new Set()));
    targets.add(getDest(flow));
  }
  return Float32Array.from(flows, (flow) => {
    const origin = getOrigin(flow);
    const dest = getDest(flow);
    return origin !== dest && destinations.get(dest)?.has(origin) ? 1 : 0;
  });
}
