import { useMessages } from '@mandor/i18n';
import { FORMAT_BYTES } from '@mandor/ipc';
import type { HttpResponse } from '@mandor/schema';
import { useCopyText } from '@mandor/shell';
import { EmptyState } from '@mandor/ui';
import { useEffect, useMemo } from 'react';

import { useBodyShow } from './hooks/useBodyShow.js';
import { useBodyWindow } from './hooks/useBodyWindow.js';
import { useSaveBody } from './hooks/useSaveBody.js';
import { textSampleOf } from './lib/body-bytes.js';
import { bodyContentOf } from './lib/body-content.js';
import { bodyKindOf, contentTypeOf } from './lib/body-views.js';
import { ResponseBodyBand } from './ResponseBodyBand.js';
import { ResponseBodyView } from './ResponseBodyView.js';

type ResponseBodyProps = {
    resource: string;
    response: HttpResponse;
};

/**
 * The body of a response in the format the reader picks, or drawn as a browser would. What it is
 * comes from the type the server gave and, failing that, from the start of the bytes; the format
 * it opens on and whether it opens drawn follow from that. A body that went to disk is read a
 * window at a time as the reader gets to the end of what is in, and all of it when it is drawn.
 */
export function ResponseBody({ resource, response }: ResponseBodyProps) {
    const labels = useMessages('requests');
    const copy = useCopyText();
    const body = useBodyWindow(response.body);
    const type = contentTypeOf(response);
    const sample = useMemo(() => textSampleOf(body.bytes), [body.bytes]);
    const kind = bodyKindOf(type, sample);
    const laidOut = body.total <= FORMAT_BYTES;
    const { format, preview, previewable, setFormat, setPreview, setWrap, wrap } = useBodyShow(
        kind,
        laidOut,
    );
    const complete = body.bytes.length >= body.total;
    const content = useMemo(
        () => bodyContentOf({ bytes: body.bytes, complete, format, kind, laidOut, preview, type }),
        [body.bytes, complete, format, kind, laidOut, preview, type],
    );
    const save = useSaveBody(response, kind);
    const { loadMore } = body;
    const wantsAll = preview && !complete;

    useEffect(() => {
        if (wantsAll) {
            loadMore();
        }
    }, [loadMore, wantsAll]);

    if (body.total === 0) {
        return (
            <EmptyState
                description={labels('bodyEmpty')}
                icon="doc"
                title={labels('bodyEmptyTitle')}
            />
        );
    }

    return (
        <div className="flex h-full min-h-0 min-w-0 flex-col" data-part="response-body">
            <ResponseBodyBand
                actions={{
                    copy:
                        content.text === ''
                            ? null
                            : () => {
                                  copy(content.text);
                              },
                    loadMore,
                    save,
                    setFormat,
                    setPreview,
                    setWrap,
                }}
                progress={{ laidOut, loaded: body.bytes.length, total: body.total }}
                show={{
                    format,
                    preview: previewable ? preview : null,
                    wrap: preview || format === 'hex' ? null : wrap,
                }}
            />
            <BodyError error={body.error} />
            <div className="min-h-0 flex-1">
                <ResponseBodyView
                    content={content}
                    format={format}
                    modelKey={`response-body-${resource}`}
                    onNearEnd={loadMore}
                    preview={preview}
                    total={body.total}
                    wrap={wrap}
                />
            </div>
        </div>
    );
}

function BodyError({ error }: { error: ReturnType<typeof useBodyWindow>['error'] }) {
    const errors = useMessages('errors');

    if (error === null) {
        return null;
    }

    return (
        <span className="px-pad-panel pb-gap-tight text-xs text-text-error">{errors(error)}</span>
    );
}
