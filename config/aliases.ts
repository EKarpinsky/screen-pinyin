import path from 'path';

const rootDir = path.resolve(__dirname, '..');

export const aliases = {
  '@': path.resolve(rootDir, 'src'),
  '@utils': path.resolve(rootDir, 'src/renderer/utils'),
  '@components': path.resolve(rootDir, 'src/renderer/components'),
};

