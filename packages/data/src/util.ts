export function flatMap<S, T>(xs: S[], f: (item: S) => T | T[]): T[] {
  return xs.reduce((acc: T[], x: S) => acc.concat(f(x)), []);
}
