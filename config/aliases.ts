import path from 'path';

// Use process.cwd() for consistent resolution from project root
const rootDir = process.cwd();

export const aliases = {
  '@': path.resolve(rootDir, 'src'),
  '@utils': path.resolve(rootDir, 'src/renderer/utils'),
  '@components': path.resolve(rootDir, 'src/renderer/components'),
};

