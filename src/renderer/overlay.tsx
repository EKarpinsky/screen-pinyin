import { createRoot } from 'react-dom/client';

import { SelectionOverlay } from './components/selection-overlay/';
import './overlay.css';

const root = createRoot(document.getElementById('root')!);
root.render(<SelectionOverlay />);
