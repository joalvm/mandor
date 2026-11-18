import { useMessages } from '@mandor/i18n';
import { PreviewIcon } from '@mandor/icons';
import { Button, IconButton } from '@mandor/ui';

import { BodyFormatMenu } from './BodyFormatMenu.js';
import { formatBytes } from './lib/format-response.js';
import type { BodyFormat } from './lib/body-formats.js';

/** What the band can ask for. A body with nothing to copy has no `copy`. */
export type ResponseBodyActions = {
    copy: (() => void) | null;
    loadMore: () => void;
    save: () => void;
    setFormat: (format: BodyFormat) => void;
    setPreview: (preview: boolean) => void;
    setWrap: (wrap: boolean) => void;
};

/** How much of the body is in, and whether the viewer gave up laying it out. */
type ResponseBodyProgress = {
    laidOut: boolean;
    loaded: number;
    total: number;
};

/**
 * How the body is shown: in which format, drawn or not (`null` when it cannot be drawn), and
 * whether long lines wrap (`null` when what is shown has no lines).
 */
type ResponseBodyShow = {
    format: BodyFormat;
    preview: boolean | null;
    wrap: boolean | null;
};

type ResponseBodyBandProps = {
    actions: ResponseBodyActions;
    progress: ResponseBodyProgress;
    show: ResponseBodyShow;
};

/**
 * The band over a body: the format it is read in and the switch that draws it as a browser
 * would, then how much of it is in, then what to do with what is on screen. Copy and save are
 * about what is on screen and in the file, and neither opens a dialog of its own.
 */
export function ResponseBodyBand({ actions, progress, show }: ResponseBodyBandProps) {
    const labels = useMessages('requests');
    const partial = progress.loaded < progress.total;

    return (
        <div
            className="flex h-section shrink-0 items-center gap-gap-tight px-pad-panel"
            data-part="response-body-band"
        >
            <BodyFormatMenu onChange={actions.setFormat} value={show.format} />
            <PreviewToggle onPreview={actions.setPreview} preview={show.preview} />
            <div className="mr-auto flex min-w-0 items-center gap-gap-control text-xs text-text-secondary">
                <LoadedNote partial={partial} progress={progress} />
                <TooBigNote laidOut={progress.laidOut} />
            </div>
            <LoadMoreButton onLoadMore={actions.loadMore} partial={partial} />
            <WrapToggle onWrap={actions.setWrap} wrap={show.wrap} />
            <CopyButton copy={actions.copy} />
            <IconButton icon="export" label={labels('saveBody')} onClick={actions.save} size="sm" />
        </div>
    );
}

function PreviewToggle({
    onPreview,
    preview,
}: {
    onPreview: ResponseBodyActions['setPreview'];
    preview: ResponseBodyShow['preview'];
}) {
    const labels = useMessages('requests');

    if (preview === null) {
        return null;
    }

    return (
        <Button
            aria-pressed={preview}
            className={
                preview
                    ? 'bg-surface-selected enabled:hover:bg-surface-selected enabled:hover:veil'
                    : undefined
            }
            data-part="response-body-preview"
            onClick={() => {
                onPreview(!preview);
            }}
            size="sm"
            variant="ghost"
        >
            <PreviewIcon size="sm" />
            {labels('viewPreview')}
        </Button>
    );
}

function LoadedNote({ partial, progress }: { partial: boolean; progress: ResponseBodyProgress }) {
    const labels = useMessages('requests');

    if (!partial) {
        return null;
    }

    return (
        <span className="truncate">
            {labels('bodyProgress', {
                loaded: formatBytes(progress.loaded),
                total: formatBytes(progress.total),
            })}
        </span>
    );
}

function TooBigNote({ laidOut }: { laidOut: boolean }) {
    const labels = useMessages('requests');

    if (laidOut) {
        return null;
    }

    return <span className="truncate">{labels('bodyTooBig')}</span>;
}

function LoadMoreButton({ onLoadMore, partial }: { onLoadMore: () => void; partial: boolean }) {
    const labels = useMessages('requests');

    if (!partial) {
        return null;
    }

    return (
        <Button onClick={onLoadMore} size="sm" variant="ghost">
            {labels('loadMore')}
        </Button>
    );
}

function WrapToggle({
    onWrap,
    wrap,
}: {
    onWrap: ResponseBodyActions['setWrap'];
    wrap: ResponseBodyShow['wrap'];
}) {
    const labels = useMessages('requests');

    if (wrap === null) {
        return null;
    }

    return (
        <IconButton
            active={wrap}
            icon={wrap ? 'wrap-text' : 'wrap-text-off'}
            label={labels('wrapLines')}
            onClick={() => {
                onWrap(!wrap);
            }}
            size="sm"
        />
    );
}

function CopyButton({ copy }: { copy: ResponseBodyActions['copy'] }) {
    const labels = useMessages('requests');

    if (copy === null) {
        return null;
    }

    return <IconButton icon="copy" label={labels('copy')} onClick={copy} size="sm" />;
}
