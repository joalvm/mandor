import { useLanguage, useMessages } from '@mandor/i18n';
import type { HttpResponse } from '@mandor/schema';

import { FactHeading } from './FactHeading.js';
import { formatDuration } from './lib/format-response.js';
import { timingPhasesOf, type TimingPhaseName } from './lib/timing-phases.js';
import { TimingRow } from './TimingRow.js';

type ResponseTimeDetailProps = {
    timings: HttpResponse['timings'];
};

const LABEL_OF_PHASE = {
    connect: 'timingConnect',
    dns: 'timingDns',
    download: 'timingDownload',
    firstByte: 'timingFirstByte',
    tls: 'timingTls',
} as const satisfies Record<TimingPhaseName, string>;

/** One colour per kind of wait: looking up, connecting, waiting on the server, reading. */
const BAR_OF_PHASE = {
    connect: 'bg-solid-info',
    dns: 'bg-solid-warning',
    download: 'bg-solid-success',
    firstByte: 'bg-solid-error',
    tls: 'bg-solid-info',
} as const satisfies Record<TimingPhaseName, string>;

/**
 * Where the time of the send went, as a waterfall: each phase starts where the one before it
 * ended. A send that went through a proxy shows its total alone, with the reason.
 */
export function ResponseTimeDetail({ timings }: ResponseTimeDetailProps) {
    const labels = useMessages('requests');
    const language = useLanguage();

    return (
        <div className="flex flex-col gap-gap-control" data-part="response-time-detail">
            <FactHeading
                label={labels('responseTime')}
                value={formatDuration(timings.totalMs, language)}
            />
            <div className="flex flex-col gap-gap-tight">
                {timingPhasesOf(timings).map((phase) => (
                    <TimingRow
                        bar={BAR_OF_PHASE[phase.name]}
                        key={phase.name}
                        label={labels(LABEL_OF_PHASE[phase.name])}
                        ms={phase.ms}
                        startMs={phase.startMs}
                        totalMs={timings.totalMs}
                    />
                ))}
            </div>
            <ProxyNote viaProxy={timings.viaProxy} />
        </div>
    );
}

function ProxyNote({ viaProxy }: { viaProxy: boolean }) {
    const labels = useMessages('requests');

    if (!viaProxy) {
        return null;
    }

    return <span className="text-xs text-text-secondary">{labels('timingsViaProxy')}</span>;
}
