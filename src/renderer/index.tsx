import { createRoot } from 'react-dom/client';
import { SettingsWindow } from './components/settings-window';
import './globals.css';

const root = createRoot(document.getElementById('root')!);
root.render(<SettingsWindow />);
