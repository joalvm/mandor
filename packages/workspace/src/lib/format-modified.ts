import type { Language } from '@mandor/i18n';

/**
 * The date of one workspace as the table reads it: short, and in the language the window
 * speaks. The year only comes when it is not this one — a date that repeats its year in every
 * row says nothing the rows do not already share.
 */
export function formatModified(when: string | null, language: Language): string {
    if (when === null) {
        return NEVER_TOUCHED;
    }

    const date = new Date(when);
    const sameYear = date.getFullYear() === new Date().getFullYear();
    const format = new Intl.DateTimeFormat(language, {
        day: 'numeric',
        month: 'short',
        ...(sameYear ? {} : { year: 'numeric' }),
    });

    return format.format(date);
}

const NEVER_TOUCHED = '—';
