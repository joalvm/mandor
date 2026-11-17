import { Icon, type IconName } from '@mandor/icons';
import { memo, useRef } from 'react';

import { useRowWindow } from '../../hooks/useRowWindow.js';
import { cn } from '../../lib/cn.js';

/**
 * How a line of a log reads: what held, what broke, what was written, what was left out, and
 * the heading that opens a run of lines.
 */
export type LogTone = 'error' | 'failed' | 'heading' | 'info' | 'log' | 'note' | 'passed' | 'warn';

/** One line of a log, as plain text: nothing written in it is ever read as markup. */
export type LogLine = {
    key: string;
    tone: LogTone;
    text: string;
    /** Where it happened or why it held, under the line. */
    detail?: string | undefined;
};

type LogLinesProps = {
    /** What the list says while nothing was written. */
    empty: string;
    /** Opens on the last line and follows what arrives, as a console does; off, it reads from the top. */
    followsEnd?: boolean | undefined;
    label: string;
    lines: readonly LogLine[];
};

/**
 * What was written reads as code; the name of a case that was checked, and a heading, read as
 * prose. A heading draws a rule above it, so each run of lines stands apart from the one before.
 */
type ToneLook = { color: string; glyph?: IconName; rule?: string; text: string };

const CODE = 'font-mono text-code';

const PROSE = 'text-sm';

const TONE_LOOKS: Readonly<Record<LogTone, ToneLook>> = {
    error: { color: 'text-text-error', glyph: 'error', text: CODE },
    failed: { color: 'text-text-error', glyph: 'error', text: PROSE },
    heading: {
        color: 'text-text-secondary',
        rule: 'mt-1 border-t border-border-subtle pt-1',
        text: 'text-xs font-semibold',
    },
    info: { color: 'text-text-info', glyph: 'info', text: CODE },
    log: { color: 'text-text-primary', text: CODE },
    note: { color: 'text-text-secondary', glyph: 'info', text: PROSE },
    passed: { color: 'text-text-success', glyph: 'check', text: PROSE },
    warn: { color: 'text-text-warning', glyph: 'warning', text: CODE },
};

/**
 * A log, one line under the other. A long one stays light: only the lines on screen enter the
 * DOM, and each one is as tall as its text, which wraps instead of running off the side. The
 * text is drawn as text and never read as markup, so a line that holds a tag shows the tag.
 */
export function LogLines({ empty, followsEnd = false, label, lines }: LogLinesProps) {
    const viewport = useRef<HTMLDivElement>(null);
    const view = useRowWindow({
        count: lines.length,
        followsEnd,
        keyOf: (index) => lines[index]?.key ?? index,
        scroller: () => viewport.current,
    });

    if (lines.length === 0) {
        return (
            <p className="p-pad-panel text-sm text-text-secondary" data-part="log-lines-empty">
                {empty}
            </p>
        );
    }

    return (
        <div
            className="h-full min-h-0 min-w-0 overflow-x-hidden overflow-y-auto"
            data-part="log-lines"
            ref={viewport}
        >
            <div data-part="log-lines-viewport" data-total-size={`${String(view.total)}px`}>
                <ul
                    aria-label={label}
                    data-offset={`${String(view.drawn[0]?.start ?? 0)}px`}
                    data-part="log-lines-window"
                >
                    {view.drawn.map(({ index, key }) => (
                        <LogLineRow
                            index={index}
                            key={key}
                            line={lines[index]}
                            measure={view.measure}
                        />
                    ))}
                </ul>
            </div>
        </div>
    );
}

type LogLineRowProps = {
    index: number;
    line: LogLine | undefined;
    measure: (node: Element | null) => void;
};

const LogLineRow = memo(function LogLineRow({ index, line, measure }: LogLineRowProps) {
    if (line === undefined) {
        return null;
    }

    const look = TONE_LOOKS[line.tone];

    return (
        <li
            className={cn(
                'flex min-w-0 items-start gap-gap-icon-text px-pad-panel py-1',
                look.rule,
            )}
            data-index={index}
            data-part="log-line"
            data-tone={line.tone}
            ref={measure}
        >
            <ToneGlyph look={look} />
            <span className="flex min-w-0 flex-1 flex-col">
                <span className={cn('break-words whitespace-pre-wrap', look.text, look.color)}>
                    {line.text}
                </span>
                <LineDetail detail={line.detail} />
            </span>
        </li>
    );
});

/** A line that was only written carries no glyph; its place stays, so every text starts level. */
function ToneGlyph({ look }: { look: ToneLook }) {
    if (look.glyph === undefined) {
        return <span className="size-icon-md shrink-0" data-part="log-line-glyph" />;
    }

    return (
        <span
            className={cn('flex size-icon-md shrink-0 items-center justify-center', look.color)}
            data-part="log-line-glyph"
        >
            <Icon name={look.glyph} />
        </span>
    );
}

function LineDetail({ detail }: { detail: string | undefined }) {
    if (detail === undefined) {
        return null;
    }

    return <span className="text-xs break-words text-text-secondary">{detail}</span>;
}
