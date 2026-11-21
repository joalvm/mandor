import { useEditorIssueMessage, useMessages } from '@mandor/i18n';
import { useCopyText } from '@mandor/shell';
import { IconButton } from '@mandor/ui';
import { useMemo, useState, type ReactNode } from 'react';

import type { ConnectionMessageEntry } from '../../activity-entry.js';
import { inboundVerdictOf } from '../../inbound-verdict.js';
import { frameFormat, type Frame } from '../../lib/frame-payload.js';
import { frameText } from '../../lib/frame-text.js';
import { defaultViewOf, type FrameView } from '../../lib/frame-views.js';
import { DockBand } from './DockBand.js';
import { FramePayloadView } from './FramePayloadView.js';
import { FrameViewMenu } from './FrameViewMenu.js';

type ConnectionMessageDetailProps = {
    entry: ConnectionMessageEntry;
};

/** The view the reader picked, and the frame they picked it on. */
type ChosenView = { entryId: string; view: FrameView };

/**
 * The chosen frame read whole: the payload in the view the band names — the one its format calls
 * for until the reader picks another — because what the connection announced it would send is a
 * promise, and this is the evidence. A pick holds for the frame it was made on: the next one
 * opens on its own. An inbound frame that broke the schema of the item it pairs with lists here
 * the fields that broke it, with the route and the reason.
 */
export function ConnectionMessageDetail({ entry }: ConnectionMessageDetailProps): ReactNode {
    const record = entry.detail;
    const [chosen, setChosen] = useState<ChosenView | null>(null);
    // The dock draws again with every frame that crosses; reading a large one each time froze it.
    const format = useMemo(
        () => frameFormat({ binary: record.binary, data: record.data }),
        [record.binary, record.data],
    );
    const view = chosen?.entryId === entry.id ? chosen.view : defaultViewOf(format);
    // The row judged the frame when it was painted; the dock reads the same verdict.
    const verdict = inboundVerdictOf(entry);

    return (
        <>
            <DockBand entry={entry}>
                <FrameViewMenu
                    onChange={(next) => {
                        setChosen({ entryId: entry.id, view: next });
                    }}
                    value={view}
                />
                <FrameCopy frame={record} view={view} />
            </DockBand>
            <div
                className="flex min-h-0 min-w-0 flex-1 flex-col"
                data-format={format}
                data-part="activity-detail"
            >
                <SchemaVerdict verdict={verdict} />
                <FramePayloadView entryId={entry.id} frame={record} view={view} />
            </div>
        </>
    );
}

/**
 * Copies the frame as the view shows it, read only when pressed: the text of a large frame is
 * not made again on every draw for a copy nobody asked for. The dump brings its own copy.
 */
function FrameCopy({ frame, view }: { frame: Frame; view: FrameView }) {
    const messages = useMessages('connections');
    const copy = useCopyText();

    if (view === 'hex') {
        return null;
    }

    return (
        <IconButton
            icon="copy"
            label={messages('editorCopy')}
            onClick={() => {
                copy(frameText(frame, view));
            }}
            size="sm"
        />
    );
}

function SchemaVerdict({ verdict }: { verdict: ReturnType<typeof inboundVerdictOf> }) {
    const messages = useMessages('connections');
    const say = useEditorIssueMessage();

    if (verdict === undefined || verdict.length === 0) {
        return null;
    }

    return (
        <div
            className="flex h-row shrink-0 items-center gap-gap-control px-pad-panel"
            data-part="activity-detail-schema"
        >
            <span className="font-semibold text-text-warning">{messages('schemaUnmetTitle')}</span>
            <span className="truncate text-text-secondary">
                {verdict
                    .map((issue) => `${issue.path || '/'} ${say(issue.message, issue)}`)
                    .join(', ')}
            </span>
        </div>
    );
}
