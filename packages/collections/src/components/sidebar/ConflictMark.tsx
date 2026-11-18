import { useMessages } from '@mandor/i18n';
import { StatusDot } from '@mandor/ui';

/** The dot a line wears while the changes on it wait for an answer: shape and words, not colour. */
export function ConflictMark() {
    const messages = useMessages('collections');

    return <StatusDot label={messages('conflictMark')} state="warning" />;
}
