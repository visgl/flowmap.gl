import {createSelectorCreator, defaultMemoize} from 'reselect';

export function flatMap<S, T>(xs: S[], f: (item: S) => T | T[]): T[] {
  return xs.reduce((acc: T[], x: S) => acc.concat(f(x)), []);
}

export const createDebugSelector = createSelectorCreator(defaultMemoize, {
  equalityCheck: (previousVal: any, currentVal: any) => {
    const rv = currentVal === previousVal;
    if (!rv) {
      console.log('Selector param value changed', currentVal);
    }
    return rv;
  },
});
