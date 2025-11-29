import type { Configuration } from 'webpack';
import { rules } from './webpack.rules';
import { aliases } from './config/aliases';
import path from 'path';

// Filter out asset-relocator-loader for renderer - it injects __dirname which breaks in browser context
const rendererRules = rules.filter(rule => {
  if (typeof rule === 'object' && rule !== null && 'use' in rule) {
    const use = rule.use;
    if (typeof use === 'object' && use !== null && 'loader' in use) {
      return !use.loader?.includes('asset-relocator-loader');
    }
  }
  return true;
});

export const rendererConfig: Configuration = {
  module: {
    rules: [
      ...rendererRules,
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
              modules: false, // Disable CSS modules to prevent class renaming
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                config: path.resolve(__dirname, 'postcss.config.js'),
              },
            },
          },
        ],
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
    alias: aliases,
  },
  node: {
    __dirname: false,
    __filename: false,
  },
};

