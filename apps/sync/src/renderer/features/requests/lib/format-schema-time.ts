import type { Language } from '@mandor/i18n';

/**
 * When a schema was fetched, as the status of the editor says it: the hour when it was today,
 * and the day with it when it was not, because an hour alone on an old schema reads as a fresh one.
 */
export function formatSchemaTime(fetchedAt: string, language: Language, now = new Date()): string {
    const date = new Date(fetchedAt);
    const today = date.toDateString() === now.toDateString();

    return new Intl.DateTimeFormat(
        language,
        today
            ? { hour: '2-digit', minute: '2-digit' }
            : { day: 'numeric', hour: '2-digit', minute: '2-digit', month: 'short' },
    ).format(date);
}
