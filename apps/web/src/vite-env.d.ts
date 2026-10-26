/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_REAL_API?: string;
  readonly VITE_API_BASE?: string;
  readonly VITE_SYNQUEST_URL?: string;
  readonly VITE_SECURITY_URL?: string;
  readonly VITE_DEMO_AUTH_USER?: string;
  readonly VITE_DEMO_AUTH_TENANT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
