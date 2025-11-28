import { createRoot } from 'react-dom/client';
import { ResultsPopupWrapper } from './components/results-popup';
import './globals.css';

const root = createRoot(document.getElementById('root')!);
root.render(<ResultsPopupWrapper />);
