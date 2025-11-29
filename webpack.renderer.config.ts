import type { Configuration } from 'webpack';
import { rules } from './webpack.rules';
import { aliases } from './config/aliases';
import path from 'path';

export const rendererConfig: Configuration = {
  module: {
    rules: [
      ...rules,
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
};

