import type { Locales } from './resource-schema.mjs';

export function readLocales(root: string): Promise<{ locales: Locales; namespaces: string[] }>;
