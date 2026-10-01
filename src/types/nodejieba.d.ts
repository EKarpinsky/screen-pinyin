import 'nodejieba';

declare module 'nodejieba' {
  export const DEFAULT_DICT: string;
  export const DEFAULT_HMM_DICT: string;
  export const DEFAULT_USER_DICT: string;
  export const DEFAULT_IDF_DICT: string;
  export const DEFAULT_STOP_WORD_DICT: string;
}
