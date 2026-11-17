import { z } from 'zod';

/**
 * The languages the interface ships with, spelled here because `@mandor/ipc` cannot reach
 * `@mandor/i18n` — the dependency runs the other way. Whoever in main speaks to the user (the
 * menu, a report) is told the language in exactly these.
 */
export const languageSchema = z.enum(['en', 'es']);
