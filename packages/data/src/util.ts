import {createSelectorCreator, defaultMemoize} from 'reselect';

export const createDebugSelector = createSelectorCreator(defaultMemoize, {
  equalityCheck: (previousVal: any, currentVal: any) => {
    const rv = currentVal === previousVal;
    if (!rv) {
      console.log('Selector param value changed', currentVal);
    }
    return rv;
  },
});
