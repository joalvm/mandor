import { cn } from '@mandor/ui';

import { formatPreciseDuration } from './lib/format-response.js';

type TimingRowProps = {
    /** The colour of the bar: which phase it is, so the eye follows one down the waterfall. */
    bar: string;
    label: string;
    /** How long the phase took. */
    ms: number;
    /** Where it starts, from the start of the send. */
    startMs: number;
    totalMs: number;
};

/**
 * One phase of the send on the time of the whole send: the bar starts where the phase did and is
 * as long as it was. Widths are weights of the room, said in `data-weight` and drawn by the
 * stylesheet, so the row never measures anything.
 */
export function TimingRow({ bar, label, ms, startMs, totalMs }: TimingRowProps) {
    return (
        <div className="flex min-w-0 items-center gap-gap-control text-xs" data-part="timing-row">
            <span className="w-28 shrink-0 truncate text-text-secondary">{label}</span>
            {/* band-policy: the track of a bar, a measure of the data and not a band of chrome */}
            <span
                aria-hidden="true"
                className="flex h-gap-control min-w-0 flex-1 overflow-hidden"
                data-part="timing-track"
            >
                <span data-part="timing-span" data-weight={startMs} />
                <span
                    className={cn('min-w-px rounded-sm', bar)}
                    data-part="timing-span"
                    data-weight={ms}
                />
                <span data-part="timing-span" data-weight={Math.max(0, totalMs - startMs - ms)} />
            </span>
            <span className="w-16 shrink-0 text-right tabular-nums text-text-primary">
                {formatPreciseDuration(ms)}
            </span>
        </div>
    );
}
