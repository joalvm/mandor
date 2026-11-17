import { useMessages } from '@mandor/i18n';
import type { HttpResponse } from '@mandor/schema';
import { useId } from 'react';

type RedirectListProps = {
    redirects: HttpResponse['redirects'];
};

const HEADING = 'text-2xs font-normal tracking-wide text-text-secondary uppercase';

/** The hops the send followed before the answer, each with the headers it did not carry along. */
export function RedirectList({ redirects }: RedirectListProps) {
    const labels = useMessages('requests');
    const headingId = useId();

    return (
        <section
            aria-labelledby={headingId}
            className="flex flex-col gap-gap-tight"
            data-part="redirect-list"
        >
            <h2 className={HEADING} id={headingId}>
                {labels('redirectsHeading')}
            </h2>
            <ol className="flex min-w-0 flex-col gap-gap-tight text-xs">
                {redirects.map((hop, index) => (
                    <RedirectHop hop={hop} key={`${hop.from}:${String(index)}`} />
                ))}
            </ol>
        </section>
    );
}

function RedirectHop({ hop }: { hop: RedirectListProps['redirects'][number] }) {
    return (
        <li className="flex min-w-0 flex-col gap-gap-tight" data-part="redirect-hop">
            <span className="min-w-0 font-mono break-all text-text-primary">
                <span className="text-text-info">{hop.status}</span>
                {` → ${hop.to}`}
            </span>
            <StrippedNote headers={hop.strippedHeaders} />
        </li>
    );
}

function StrippedNote({ headers }: { headers: readonly string[] }) {
    const labels = useMessages('requests');

    if (headers.length === 0) {
        return null;
    }

    return (
        <span className="text-text-secondary">
            {labels('redirectStripped', { names: headers.join(', ') })}
        </span>
    );
}
