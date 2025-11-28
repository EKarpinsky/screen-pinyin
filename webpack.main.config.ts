import type { Configuration } from 'webpack';
import { rules } from './webpack.rules';

export const mainConfig: Configuration = {
  entry: './src/main/index.ts',
  module: {
    rules,
  },
  resolve: {
    extensions: ['.js', '.ts', '.jsx', '.tsx', '.css', '.json'],
  },
  externals: {
    // Native modules that can't be bundled
    'screenshot-desktop': 'commonjs screenshot-desktop',
    'sharp': 'commonjs sharp',
    'electron-store': 'commonjs electron-store',
    'tesseract.js': 'commonjs tesseract.js',
    'nodejieba': 'commonjs nodejieba',
  },
};
