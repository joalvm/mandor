import { GlobeIcon } from '@mandor/icons';
import { Button, HoverCard, HoverCardPanel, HoverCardTrigger } from '@mandor/ui';
import type { PropsWithChildren } from 'react';

type ResponseFactProps = PropsWithChildren<{
    label: string;
    part: string;
    /** The figure on the line; without one, the fact is the connection, drawn as a globe. */
    text?: string | undefined;
}>;

/**
 * One figure of the summary that explains itself: resting on it opens what it adds up, and
 * leaving it closes the card. Passing over it on the way elsewhere opens nothing, and a click
 * does not pin it open: it is read, not used.
 */
export function ResponseFact({ children, label, part, text }: ResponseFactProps) {
    return (
        <HoverCard>
            <HoverCardTrigger>
                <Button
                    aria-label={text === undefined ? label : undefined}
                    className="h-control-xs shrink-0 cursor-default px-1 tabular-nums text-text-secondary enabled:hover:text-text-primary"
                    data-part={part}
                    size="sm"
                    variant="ghost"
                >
                    <FactFigure text={text} />
                </Button>
            </HoverCardTrigger>
            <HoverCardPanel>{children}</HoverCardPanel>
        </HoverCard>
    );
}

function FactFigure({ text }: Pick<ResponseFactProps, 'text'>) {
    if (text === undefined) {
        return <GlobeIcon />;
    }

    return text;
}
