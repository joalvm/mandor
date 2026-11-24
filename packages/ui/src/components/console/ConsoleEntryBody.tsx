import { Icon } from '@mandor/icons';

import { cn } from '../../lib/cn.js';
import type { ConsoleEntry, ConsoleSection } from './console-entry.js';
import { ConsoleValue } from './ConsoleValue.js';

const SLOT = 'flex h-lh w-icon-md shrink-0 items-center justify-center';

type ConsoleEntryBodyProps = {
    entry: ConsoleEntry;
    open: ReadonlySet<string>;
    onToggle: (key: string) => void;
    /** The colour of the level of the entry, which what happened is written in. */
    tone: string;
};

/**
 * What opens under the line of an entry: what happened, in the colour of its level, then each
 * of its parts, closed until the reader opens it, as Postman opens the headers of a request.
 */
export function ConsoleEntryBody({ entry, open, onToggle, tone }: ConsoleEntryBodyProps) {
    return (
        <div
            className="flex flex-col gap-gap-tight pr-pad-panel pb-1 pl-12"
            data-part="console-entry-body"
        >
            <EntryDetail detail={entry.detail} tone={tone} />
            {(entry.sections ?? []).map((section) => (
                <EntrySection
                    key={section.title}
                    onToggle={() => {
                        onToggle(`${entry.key}/${section.title}`);
                    }}
                    open={open.has(`${entry.key}/${section.title}`)}
                    section={section}
                />
            ))}
        </div>
    );
}

function EntryDetail({ detail, tone }: { detail: string | undefined; tone: string }) {
    if (detail === undefined) {
        return null;
    }

    return <pre className={cn('break-all whitespace-pre-wrap select-text', tone)}>{detail}</pre>;
}

type EntrySectionProps = { onToggle: () => void; open: boolean; section: ConsoleSection };

function EntrySection({ onToggle, open, section }: EntrySectionProps) {
    return (
        <section aria-label={section.title} data-part="console-entry-section">
            <button
                aria-expanded={open}
                className="flex items-center gap-gap-icon-text text-text-secondary"
                onClick={onToggle}
                type="button"
            >
                <span className={SLOT}>
                    <Icon name={open ? 'chevron-down' : 'chevron-right'} />
                </span>
                {section.title}
            </button>
            <SectionValue open={open} value={section.value} />
        </section>
    );
}

function SectionValue({ open, value }: { open: boolean; value: unknown }) {
    if (!open) {
        return null;
    }

    return (
        <div className="pl-6" data-part="console-entry-section-value">
            <ConsoleValue value={value} />
        </div>
    );
}
