import { createRoot } from 'react-dom/client';
import { MainAppLayout } from './components/main-app-layout';
import './globals.css';

const root = createRoot(document.getElementById('root')!);
root.render(<MainAppLayout />);
