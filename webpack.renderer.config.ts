import type { Configuration } from 'webpack';
import { rules } from './webpack.rules';
import path from 'path';

export const rendererConfig: Configuration = {
  module: {
    rules: [
      ...rules,
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: {
                  '@tailwindcss/postcss': {},
                },
              },
            },
          },
        ],
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  // Prevent webpack from injecting __dirname/__filename which break in Electron sandbox
  node: {
    __dirname: false,
    __filename: false,
  },
};

