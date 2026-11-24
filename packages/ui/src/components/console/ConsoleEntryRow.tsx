import { Icon, type IconName } from '@mandor/icons';
import type { PropsWithChildren } from 'react';

import { cn } from '../../lib/cn.js';
import type { ConsoleEntry, ConsoleLevel, ConsoleStatus } from './console-entry.js';
import { consoleTime } from './console-time.js';
import { ConsoleEntryBody } from './ConsoleEntryBody.js';

/**
 * How an entry of each level reads, as a browser console draws them: an error and a warning
 * tint their whole row and carry their glyph; a line that was only written carries none.
 */
type LevelLook = { glyph?: IconName; row?: string; text: string };

const LEVEL_LOOKS: Readonly<Record<ConsoleLevel, LevelLook>> = {
    error: { glyph: 'error', row: 'bg-surface-error-tint', text: 'text-text-error' },
    info: { glyph: 'info', text: 'text-text-primary' },
    log: { text: 'text-text-primary' },
    warn: { glyph: 'warning', row: 'bg-surface-warning-tint', text: 'text-text-warning' },
};

const STATUS_COLORS: Readonly<Record<ConsoleStatus['outcome'], string>> = {
    ok: 'text-text-success',
    refused: 'text-text-error',
};

const LINE = 'flex w-full min-w-0 items-start gap-gap-icon-text px-pad-panel py-1 text-left';

const SLOT = 'flex h-lh w-icon-md shrink-0 items-center justify-center';

type ConsoleEntryRowProps = {
    entry: ConsoleEntry;
    index: number;
    measure: (node: Element | null) => void;
    open: ReadonlySet<string>;
    onToggle: (key: string) => void;
    showTimestamps: boolean;
};

/**
 * One entry of the console: its line, and under it, once it opens, what happened and each of
 * its parts, which open on their own. An entry with nothing under it does not open.
 */
export function ConsoleEntryRow({
    entry,
    index,
    measure,
    open,
    onToggle,
    showTimestamps,
}: ConsoleEntryRowProps) {
    const look = LEVEL_LOOKS[entry.level];
    const opens = entry.detail !== undefined || (entry.sections?.length ?? 0) > 0;
    const expanded = opens && open.has(entry.key);

    return (
        <li
            className={cn('border-b border-border-subtle font-mono text-code', look.row)}
            data-index={index}
            data-level={entry.level}
            data-part="console-entry"
            ref={measure}
        >
            <EntryLine
                expanded={expanded}
                onToggle={() => {
                    onToggle(entry.key);
                }}
                opens={opens}
            >
                <span className={cn(SLOT, look.text)}>
                    <LevelGlyph glyph={look.glyph} />
                </span>
                <span className={cn(SLOT, 'text-text-secondary')}>
                    <Chevron expanded={expanded} opens={opens} />
                </span>
                <Stamp at={entry.at} shown={showTimestamps} />
                <span className={cn('min-w-0 flex-1 break-all whitespace-pre-wrap', look.text)}>
                    {entry.text}
                </span>
                <EntryStatus status={entry.status} time={entry.time} />
                <EntrySource source={entry.source} />
            </EntryLine>
            <EntryBody
                entry={entry}
                expanded={expanded}
                onToggle={onToggle}
                open={open}
                tone={look.text}
            />
        </li>
    );
}

type EntryLineProps = PropsWithChildren<{
    expanded: boolean;
    onToggle: () => void;
    opens: boolean;
}>;

function EntryLine({ children, expanded, onToggle, opens }: EntryLineProps) {
    if (!opens) {
        return (
            <p className={LINE} data-part="console-entry-line">
                {children}
            </p>
        );
    }

    return (
        <button
            aria-expanded={expanded}
            className={LINE}
            data-part="console-entry-line"
            onClick={onToggle}
            type="button"
        >
            {children}
        </button>
    );
}

function LevelGlyph({ glyph }: { glyph: IconName | undefined }) {
    if (glyph === undefined) {
        return null;
    }

    return <Icon name={glyph} />;
}

function Chevron({ expanded, opens }: { expanded: boolean; opens: boolean }) {
    if (!opens) {
        return null;
    }

    return <Icon name={expanded ? 'chevron-down' : 'chevron-right'} />;
}

function Stamp({ at, shown }: { at: number; shown: boolean }) {
    if (!shown) {
        return null;
    }

    return (
        <time className="shrink-0 text-text-secondary" data-part="console-entry-time">
            {consoleTime(at)}
        </time>
    );
}

type EntryStatusProps = { status: ConsoleStatus | undefined; time: string | undefined };

/** How the server answered and how long it took, at the end of the line, as Postman says it. */
function EntryStatus({ status, time }: EntryStatusProps) {
    if (status === undefined && time === undefined) {
        return null;
    }

    const color = status === undefined ? 'text-text-secondary' : STATUS_COLORS[status.outcome];

    return (
        <span
            className={cn('flex shrink-0 items-center gap-gap-icon-text', color)}
            data-part="console-entry-status"
        >
            <span>{status?.text}</span>
            <span>{time}</span>
        </span>
    );
}

function EntrySource({ source }: { source: string | undefined }) {
    if (source === undefined) {
        return null;
    }

    return (
        <span
            className="max-w-48 shrink-0 truncate text-text-secondary"
            data-part="console-entry-source"
        >
            {source}
        </span>
    );
}

type EntryBodyProps = {
    entry: ConsoleEntry;
    expanded: boolean;
    open: ReadonlySet<string>;
    onToggle: (key: string) => void;
    tone: string;
};

function EntryBody({ expanded, ...props }: EntryBodyProps) {
    if (!expanded) {
        return null;
    }

    return <ConsoleEntryBody {...props} />;
}
