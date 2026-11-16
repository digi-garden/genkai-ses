/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GA_MEASUREMENT_ID?: string;
  readonly VITE_CF_BEACON_TOKEN?: string;
  readonly VITE_SITE_ORIGIN?: string;
  readonly VITE_PUBLIC_BASE?: string;
}
