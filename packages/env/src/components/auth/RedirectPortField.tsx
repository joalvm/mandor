import { useMessages } from '@mandor/i18n';
import { FormRow, Input } from '@mandor/ui';
import { useState, type ReactNode } from 'react';

import { redirectPortIn } from '../../lib/redirect-port.js';

type RedirectPortFieldProps = {
    /** The port the file says, or undefined for one the system picks at each flow. */
    value: number | undefined;
    onChange: (port: number | undefined) => void;
};

/**
 * The port the loopback server of a code flow listens on. What is typed stays as typed until it
 * is a port the file may hold, and the redirect URI that results is said under it, ready to be
 * registered with the provider.
 */
export function RedirectPortField({ value, onChange }: RedirectPortFieldProps): ReactNode {
    const messages = useMessages('auth');
    const [text, setText] = useState(value === undefined ? '' : String(value));
    const valid = text === '' || redirectPortIn(text) !== null;

    function write(next: string): void {
        const port = redirectPortIn(next);

        setText(next);

        if (next === '') {
            onChange(undefined);

            return;
        }

        // A port half written stays on screen, marked, and the level keeps the last good one.
        if (port !== null) {
            onChange(port);
        }
    }

    return (
        <FormRow
            help={
                value === undefined
                    ? undefined
                    : messages('redirectUri', { uri: `http://127.0.0.1:${String(value)}/callback` })
            }
            hint={messages('redirectPortHelp')}
            label={messages('redirectPort')}
        >
            <Input
                invalid={!valid}
                label={messages('redirectPort')}
                onValueChange={write}
                value={text}
            />
        </FormRow>
    );
}
