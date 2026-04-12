/*
 * Copyright (c) Flowmap.gl contributors
 * Copyright (c) 2018-2020 Teralytics
 * SPDX-License-Identifier: Apache-2.0
 */

import {createSelectorCreator, lruMemoize} from 'reselect';

export const createDebugSelector = createSelectorCreator(lruMemoize, {
  equalityCheck: (previousVal: any, currentVal: any) => {
    const rv = currentVal === previousVal;
    if (!rv) {
      console.log('Selector param value changed', currentVal);
    }
    return rv;
  },
});
