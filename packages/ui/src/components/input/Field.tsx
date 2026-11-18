import { useId, type PropsWithChildren } from 'react';
import { ErrorIcon } from '@mandor/icons';

import { FieldWiringProvider } from './field-wiring.js';

type FieldProps = PropsWithChildren<{
    error?: string | undefined;
    help?: string | undefined;
    id: string;
    label: string;
}>;

/**
 * Binds the required label and one help-or-error message to the control written inside it.
 *
 * The wiring travels by context: the control reads the id and the message of the field it stands
 * in, so any control of this library is wired by being written inside — no prop is cloned onto
 * it after the fact, and a control that wants its own keeps it.
 */
export function Field({ children, error, help, id, label }: FieldProps) {
    const generatedId = useId();
    const message = error ?? help;
    const messageId = message === undefined ? undefined : `${id}-${generatedId}`;

    return (
        <FieldWiringProvider value={{ describedBy: messageId, id, invalid: error !== undefined }}>
            <div className="grid content-start gap-gap-tight" data-part="field">
                <label className="text-sm text-text-primary" htmlFor={id}>
                    {label}
                </label>
                {children}
                <FieldMessage error={error} id={messageId} message={message} />
            </div>
        </FieldWiringProvider>
    );
}

type FieldMessageProps = {
    error: FieldProps['error'];
    id: string | undefined;
    message: string | undefined;
};

function FieldMessage({ error, id, message }: FieldMessageProps) {
    if (message === undefined) {
        return null;
    }

    return (
        <div
            className={
                error === undefined
                    ? 'text-xs text-text-secondary'
                    : 'flex items-center gap-gap-icon-text text-xs text-text-error'
            }
            id={id}
            role={error === undefined ? undefined : 'alert'}
        >
            <FieldErrorIcon invalid={error !== undefined} />
            {message}
        </div>
    );
}

function FieldErrorIcon({ invalid }: { invalid: boolean }) {
    if (!invalid) {
        return null;
    }

    return <ErrorIcon size="sm" />;
}
