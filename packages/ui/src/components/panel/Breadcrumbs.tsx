import { ChevronRightIcon } from '@mandor/icons';
import { useRef, type PropsWithChildren, type ReactElement } from 'react';

import { cn } from '../../lib/cn.js';
import { trailShown, type TrailStretch } from './breadcrumbs-trail.js';
import { useTrailFolds } from './useTrailFolds.js';

type BreadcrumbsProps = PropsWithChildren<{
    /** How a reader names the trail. Text, never navigation. */
    label: string;
    /** Where the thing being looked at lives, outermost first. */
    parts: readonly string[];
}>;

/**
 * Where the resource on screen sits, as text: there is no history and nothing to click — the
 * trail says where things are, and the lateral is what moves the user. Quiet gray for the
 * stretches behind, and the one under the reader in the primary ink and the only one in bold,
 * named as the current page; the chevron between them is the only ornament.
 *
 * A trail that no longer fits folds its middle into one `…`, keeping the first stretch and the
 * last, and unfolds once there is room again; the fold names what it hides on hover. Every
 * stretch still truncates on its own, so even a folded trail shrinks instead of leaving the
 * window.
 *
 * A named section and not a landmark of the window: the panel is what names the trail, and the
 * frame is what owns the one `nav` of the window.
 *
 * What is written inside it is the kind of thing the trail ends in, drawn ahead of it in its own
 * hue: the protocol a request speaks, the transport a connection dials. A mark, never a step.
 *
 * It brings no height and no inset of its own: it is text inside a band, and the band is what
 * says how tall it is and how far from the edge it starts.
 */
export function Breadcrumbs({ children, label, parts }: BreadcrumbsProps): ReactElement {
    const list = useRef<HTMLOListElement>(null);
    const folded = useTrailFolds(list, parts.join('/'));
    const last = parts.length - 1;

    return (
        <section
            aria-label={label}
            className="flex min-w-0 flex-1 items-center gap-gap-icon-text overflow-hidden text-sm"
            data-part="breadcrumbs"
        >
            <BreadcrumbsLead>{children}</BreadcrumbsLead>
            <ol
                className="m-0 flex min-w-0 flex-1 list-none items-center gap-gap-tight p-0 whitespace-nowrap"
                ref={list}
            >
                {trailShown(parts, folded).map((stretch) => (
                    // The same name can stand at two levels: the place in the trail is the key.
                    <li className="flex min-w-0 items-center gap-gap-tight" key={stretch.at}>
                        <BreadcrumbsSeparator visible={stretch.at > 0} />
                        <BreadcrumbsStretch current={stretch.at === last} stretch={stretch} />
                    </li>
                ))}
            </ol>
        </section>
    );
}

type BreadcrumbsStretchProps = { current: boolean; stretch: TrailStretch };

function BreadcrumbsStretch({ current, stretch }: BreadcrumbsStretchProps) {
    if (stretch.folded.length > 0) {
        return <BreadcrumbsFold hidden={stretch.folded} />;
    }

    return (
        <span
            aria-current={current ? 'page' : undefined}
            className={cn(
                'min-w-0 truncate',
                current ? 'font-semibold text-text-primary' : 'text-text-secondary',
            )}
            data-part="breadcrumbs-stretch"
        >
            {stretch.text}
        </span>
    );
}

/** The middle of a folded trail: one mark, and the stretches it stands in for on hover. */
function BreadcrumbsFold({ hidden }: { hidden: readonly string[] }) {
    return (
        <span
            className="shrink-0 text-text-secondary"
            data-part="breadcrumbs-fold"
            title={hidden.join(' › ')}
        >
            …
        </span>
    );
}

function BreadcrumbsLead({ children }: PropsWithChildren) {
    if (children === undefined) {
        return null;
    }

    return (
        <span className="flex shrink-0 items-center" data-part="breadcrumbs-lead">
            {children}
        </span>
    );
}

function BreadcrumbsSeparator({ visible }: { visible: boolean }) {
    if (!visible) {
        return null;
    }

    return (
        <span
            className="flex shrink-0 items-center text-text-disabled"
            data-part="breadcrumbs-separator"
        >
            <ChevronRightIcon size="sm" />
        </span>
    );
}
