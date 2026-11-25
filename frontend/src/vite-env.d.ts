/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the FinTrack API, e.g. https://fintrack-apis.vercel.app */
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
