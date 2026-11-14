import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import test from 'node:test';
import {URL} from 'node:url';

for (const example of ['react-app', 'react-worker-app']) {
  test(`${example} renders hooks from the shared example package`, () => {
    const appRequire = createRequire(
      new URL(`../examples/${example}/package.json`, import.meta.url),
    );
    const commonRequire = createRequire(
      appRequire.resolve('@flowmap.gl/examples-common'),
    );
    const React = appRequire('react');
    const {useState} = commonRequire('react');
    const {renderToStaticMarkup} = appRequire('react-dom/server');

    function SharedHook() {
      const [value] = useState('shared hook');
      return React.createElement('span', null, value);
    }

    assert.equal(
      renderToStaticMarkup(React.createElement(SharedHook)),
      '<span>shared hook</span>',
    );
  });
}
