import { useMessages } from '@mandor/i18n';
import type { HeaderOverride, InheritedHeader } from '@mandor/schema';
import { cn, Disclosure } from '@mandor/ui';
import type { ReactNode } from 'react';

type InheritedHeadersProps = {
    /** What the levels above hand down, the farthest first. */
    headers: readonly InheritedHeader[];
};

/**
 * What the levels above hand down to a request, folded under the table of its own headers and
 * read only: it is edited in the tab of the level that declares it. A header that does not go
 * out stays said, struck, with who took its place.
 */
export function InheritedHeaders({ headers }: InheritedHeadersProps): ReactNode {
    const labels = useMessages('requests');

    if (headers.length === 0) {
        return null;
    }

    return (
        <Disclosure label={labels('inheritedHeaders', { count: headers.length })}>
            <ul
                className="flex min-w-0 flex-col gap-gap-tight text-xs"
                data-part="inherited-headers"
            >
                {headers.map((header, index) => (
                    <InheritedHeaderRow
                        header={header}
                        key={`${header.label}:${header.line.key}:${String(index)}`}
                    />
                ))}
            </ul>
        </Disclosure>
    );
}

/** One line handed down: its name, its value, and the level that declared it. */
function InheritedHeaderRow({ header }: { header: InheritedHeader }) {
    const { label, line, overriddenBy } = header;
    const struck = overriddenBy !== undefined;

    return (
        <li className="grid min-w-0 grid-cols-3 items-baseline gap-gap-icon-text">
            <span className={cn('min-w-0 truncate', struck && 'line-through')}>{line.key}</span>
            <span className={cn('min-w-0 truncate', struck && 'line-through')}>{line.value}</span>
            <span className="flex min-w-0 flex-col text-text-secondary">
                <span className="min-w-0 truncate">{label}</span>
                <OverriddenBy override={overriddenBy} />
            </span>
        </li>
    );
}

/** Who sends its own line instead; the request has no name of its own to be told by. */
function OverriddenBy({ override }: { override: HeaderOverride | undefined }) {
    const labels = useMessages('requests');

    if (override === undefined) {
        return null;
    }

    const name = 'name' in override ? override.name : labels('inheritedByThisRequest');

    return <span className="min-w-0">{labels('inheritedOverriddenBy', { name })}</span>;
}
