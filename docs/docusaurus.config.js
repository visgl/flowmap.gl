// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Flowmap.gl',
  tagline: 'Flow map drawing layer for deck.gl',
  url: 'https://flowmap.gl',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  // organizationName: 'visgl', // Usually your GitHub org/user name.
  // projectName: 'flowmap.gl', // Usually your repo name.

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: 'https://github.com/visgl/flowmap.gl-docs',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        defaultMode: 'dark',
        disableSwitch: false,
        respectPrefersColorScheme: false,
      },
      navbar: {
        title: 'Flowmap.gl',
        logo: {
          alt: 'Flowmap.gl Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'doc',
            docId: 'intro',
            position: 'left',
            label: 'Docs',
          },
          // {to: '/blog', label: 'Blog', position: 'left'},
          {
            href: 'https://github.com/visgl/flowmap.gl',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Documentation',
                to: '/docs/intro',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              // {
              //   label: 'Stack Overflow',
              //   href: 'https://stackoverflow.com/questions/tagged/docusaurus',
              // },
              {
                label: 'GitHub',
                href: 'https://github.com/visgl/flowmap.gl/',
              },
              {
                label: 'Discussions',
                href: 'https://github.com/visgl/flowmap.gl/discussions',
              },
              {
                label: 'Issues',
                href: 'https://github.com/visgl/flowmap.gl/issues',
              },
              // {
              //   label: 'Twitter',
              //   href: 'https://twitter.com/docusaurus',
              // },
            ],
          },
          {
            title: 'More',
            items: [
              // {
              //   label: 'Blog',
              //   to: '/blog',
              // },
              {
                label: 'deck.gl',
                href: 'https://deck.gl/',
              },
              {
                label: 'vis.gl',
                href: 'https://vis.gl/',
              },
              // {
              //   label: 'OpenJS Foundation',
              //   href: 'https://openjsf.org/',
              // },
            ],
          },
        ],
        copyright: `
        <div style="display:flex; flex-direction:column; gap: 30px; align-items: center;">
        <a href="https://openjsf.org/" target="_blank" rel="noopener noreferrer">
          <img src="img/openjsf-color-textw.svg" width="100" height="31" alt="OpenJS Foundation" style="margin-top:20px"/>
        </a>
        <div>Copyright © Flowmap.gl contributors</div>
        </div>
        `,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
