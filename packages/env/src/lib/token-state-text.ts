import type { Language, useMessages } from '@mandor/i18n';
import type { AuthTokenStatus } from '@mandor/ipc';

type AuthMessages = ReturnType<typeof useMessages<'auth'>>;

/**
 * When it stops, in the language the window speaks: the hour alone if it is today, else the day
 * too.
 */
function timeOf(iso: string, language: Language): string {
    const date = new Date(iso);
    const today = new Date().toDateString() === date.toDateString();

    return date.toLocaleString(language, {
        timeStyle: 'short',
        ...(today ? {} : { dateStyle: 'short' }),
    });
}

/** What the window knows about the token of a level, said as the value of its row. */
export function tokenStateText(
    status: AuthTokenStatus,
    messages: AuthMessages,
    language: Language,
): string {
    const time = status.expiresAt === null ? '' : timeOf(status.expiresAt, language);
    const texts: Readonly<Record<AuthTokenStatus['state'], string>> = {
        none: messages('tokenNone'),
        expired: messages('tokenExpired'),
        'memory-only': messages('tokenMemoryOnly', { time }),
        valid: messages('tokenValid', { time }),
    };

    return texts[status.state];
}
