/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docsSidebar: [
    'intro',
    'getting-started',
    'data-format',
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/react-integration',
        'guides/vanilla-js',
        'guides/svelte',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api/flowmap-layer',
        'api/color-schemes',
        'api/clustering',
        'api/types',
      ],
    },
    'faq',
    'development',
  ],
};

module.exports = sidebars;
