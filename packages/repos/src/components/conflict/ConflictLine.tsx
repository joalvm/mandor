import { useMessages } from '@mandor/i18n';
import type { ConflictSide } from '@mandor/ipc';
import { Checkbox, cn } from '@mandor/ui';

import { describeSide } from '../../lib/describe-side.js';
import { CodeText } from './CodeText.js';

type ConflictLineProps = {
    /** Whether the line is in the result. */
    checked?: boolean | undefined;
    /** The name the box answers to, for the ones who cannot see the line. */
    label?: string | undefined;
    /** The name of what a missing side stands for, so a removal still has a line to read. */
    name: string;
    /** Only a line with a way to change it has a box. */
    onCheckedChange?: ((checked: boolean) => void) | undefined;
    side: ConflictSide;
    /** Whose line it is: colour belongs to the line, never to the head of its pane. */
    tone: 'ours' | 'theirs';
};

const FILLS = {
    ours: 'border-solid-info bg-surface-info-tint',
    theirs: 'border-text-iris bg-surface-iris-tint',
} as const;

/**
 * One line of a side. The box in front says whether it goes to the result; a line that is in
 * is tinted with the colour of its side and carries it to the result, so where each line of
 * the result came from is read without a legend. A side that is not there reads as the name,
 * struck through: taking it removes the line.
 */
export function ConflictLine({
    checked = true,
    label,
    name,
    onCheckedChange,
    side,
    tone,
}: ConflictLineProps) {
    const messages = useMessages('conflicts');
    const { block, text } = describeSide(side, messages('absent'));

    return (
        <li
            className={cn(
                'flex min-w-0 items-start gap-gap-control border-l-2 px-pad-control py-1',
                'transition-colors duration-fast',
                checked ? FILLS[tone] : 'border-transparent',
            )}
            data-checked={checked}
            data-part="conflict-line"
            data-tone={tone}
        >
            <LineBox checked={checked} label={label} onCheckedChange={onCheckedChange} />
            <LineText block={block} name={name} side={side} text={text} />
        </li>
    );
}

function LineBox({
    checked,
    label,
    onCheckedChange,
}: Pick<ConflictLineProps, 'label' | 'onCheckedChange'> & { checked: boolean }) {
    if (onCheckedChange === undefined || label === undefined) {
        return null;
    }

    return <Checkbox checked={checked} label={label} onCheckedChange={onCheckedChange} />;
}

function LineText({
    block,
    name,
    side,
    text,
}: Pick<ConflictLineProps, 'name' | 'side'> & { block: boolean; text: string }) {
    if (side === null) {
        return (
            <span className="min-w-0 text-sm text-text-secondary italic line-through">{name}</span>
        );
    }

    return <CodeText block={block} text={text} />;
}
