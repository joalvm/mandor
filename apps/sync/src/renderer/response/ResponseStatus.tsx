import { cn } from '@mandor/ui';

import { statusFamilyOf } from './lib/format-response.js';
import { STATUS_TINT, STATUS_TONE } from './lib/status-tone.js';

type ResponseStatusProps = {
    status: number;
    statusText: string;
};

/** The status as a pill: the number and the words the server said with it, in its tone. */
export function ResponseStatus({ status, statusText }: ResponseStatusProps) {
    const family = statusFamilyOf(status);

    return (
        <span
            className={cn(
                'inline-flex h-5 min-w-0 shrink-0 items-center gap-gap-tight rounded-sm px-1 text-xs font-semibold',
                STATUS_TONE[family],
                STATUS_TINT[family],
            )}
            data-family={family}
            data-part="response-status-pill"
        >
            <span className="tabular-nums" data-part="response-status">
                {String(status)}
            </span>
            <StatusText text={statusText} />
        </span>
    );
}

function StatusText({ text }: { text: string }) {
    if (text === '') {
        return null;
    }

    return <span className="truncate">{text}</span>;
}
