// eslint-disable-next-line @typescript-eslint/no-var-requires,no-undef
const webpack = require('webpack');
// eslint-disable-next-line @typescript-eslint/no-var-requires,no-undef
const HtmlWebpackPlugin = require('html-webpack-plugin');
// eslint-disable-next-line @typescript-eslint/no-var-requires,no-undef
const Dotenv = require('dotenv-webpack');

// eslint-disable-next-line no-undef
module.exports = {
  mode: 'development',

  entry: {
    app: './src/app.js',
  },

  devtool: 'source-map',

  module: {
    rules: [
      {
        // Compile ES2015 using babel
        test: /\.js$/,
        // exclude: [/node_modules/],
        use: [
          {
            loader: 'babel-loader',
            // options: {
            //   presets: ['@babel/env'],
            // },
          },
        ],
      },
    ],
  },

  plugins: [
    new HtmlWebpackPlugin({template: './index.html'}),
    new Dotenv({
      path: './.env', // Path to .env file (this is the default)
      safe: true, // load .env.example (defaults to "false" which does not use dotenv-safe)
    }),
  ],
};
