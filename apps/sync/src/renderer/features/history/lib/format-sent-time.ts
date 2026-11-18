import type { Language } from '@mandor/i18n';

/** The hour of a send, in the language the window speaks: short, because the day heads the group. */
export function formatSentTime(sentAt: string, language: Language): string {
    return new Intl.DateTimeFormat(language, { hour: '2-digit', minute: '2-digit' }).format(
        new Date(sentAt),
    );
}

/** The day that heads a group: weekday, day and month, and the year only when it is not this one. */
export function formatSentDay(sentAt: string, language: Language): string {
    const date = new Date(sentAt);
    const sameYear = date.getFullYear() === new Date().getFullYear();

    return new Intl.DateTimeFormat(language, {
        day: 'numeric',
        month: 'long',
        weekday: 'long',
        ...(sameYear ? {} : { year: 'numeric' }),
    }).format(date);
}
