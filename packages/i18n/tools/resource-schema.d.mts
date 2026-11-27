export type Messages = { [key: string]: Messages | string };

export type Locales = Map<string, Map<string, Messages>>;

export function pluralFormsOf(language: string): { allowed: string[]; required: string[] };

export function validateResources(locales: Locales): void;
