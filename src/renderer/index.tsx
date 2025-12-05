import { createRoot } from 'react-dom/client';

import { MainAppLayout } from './components/layout';
import { ThemeProvider } from './contexts/theme-context';
import './globals.css';

const root = createRoot(document.getElementById('root')!);
root.render(
  <ThemeProvider>
    <MainAppLayout />
  </ThemeProvider>
);
