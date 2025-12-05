// Re-export from the main component file until full extraction is complete
// This allows other parts of the app to import from 'results-view/'

// Extracted components
export { ClickableChar } from './ClickableChar';
export { ClickableWord } from './ClickableWord';
export { TranslationPane } from './TranslationPane';
export { DetailHeader } from './DetailHeader';
export { CharacterChip } from './CharacterChip';
export { ExampleSentence } from './ExampleSentence';
export { HSKBadge } from './HskBadge';
export { SectionLabel } from './SectionLabel';
export { ClassifierButton } from './ClassifierButton';
export { VariantButton } from './VariantButton';
export { DefinitionList } from './DefinitionList';

// Types
export * from './types';

// Colors
export { colors } from './colors';

// Utilities
export * from './utils';

// Cedict context and provider
export * from './cedict';

// Main component - still in original file until detail panels are extracted
export { ResultsViewWithDetail } from '../results-view-with-detail';

