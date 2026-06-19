/// <reference types="vite/client" />

declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_EXCHANGE_RATE_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
