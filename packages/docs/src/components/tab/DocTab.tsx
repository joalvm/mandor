import { useMessages } from '@mandor/i18n';
import { fireAndForget, useFailureToast, useTab } from '@mandor/shell';
import { useEffect } from 'react';
import { useStore } from 'zustand';

import { docsStore } from '../../docs-store.js';
import { DOC_VIEW_UNTOLD, docModeOf } from '../../lib/doc-views.js';
import { loadDocText } from '../../lib/load-doc-text.js';
import { scheduleDocWrite } from '../../lib/pending-doc-write.js';
import { DocSurface } from '../surface/DocSurface.js';

/**
 * The thin half of the doc surface: it finds the text, says which side of it is showing and
 * hands every change to whoever writes it. Everything it knows about the file it read off the
 * resource, so the same file open in two groups is two of these over one entry of the store,
 * and the model behind them is one as well. How it is being shown is the tab's alone.
 *
 * Both sides draw the text of the store and not the file, so crossing between them shows what
 * was typed a moment ago whether or not the pause has written it yet.
 *
 * Which side it opens on is settled the first time its text lands: a file with nothing in it is
 * one being written, and everything else is there to be read. It is settled and not asked again
 * on every draw, or the first letter typed into an empty doc would turn the tab into the page.
 */
export function DocTab() {
    const { keep, resource, tabId } = useTab();
    const messages = useMessages('docs');
    const notifyFailure = useFailureToast();
    const text = useStore(docsStore, (state) => state.texts[resource]);
    const view = useStore(docsStore, (state) => state.views[tabId]) ?? DOC_VIEW_UNTOLD;
    const mode = docModeOf(view, text ?? '');

    useEffect(() => {
        fireAndForget(loadDocText(resource));
    }, [resource]);

    useEffect(() => {
        if (text !== undefined) {
            docsStore.getState().settleSide(tabId, text);
        }
    }, [tabId, text]);

    if (text === undefined) {
        return <div className="h-full min-h-0" data-part="doc-tab" />;
    }

    return (
        <div className="h-full min-h-0" data-part="doc-tab">
            <DocSurface
                doc={{
                    label: messages('editor'),
                    modelKey: resource,
                    onChange: (next) => {
                        // A doc being written is no longer a look: the next click keeps it.
                        keep();
                        scheduleDocWrite(resource, next, (code) => {
                            notifyFailure(code);
                        });
                    },
                    place: tabId,
                    value: text,
                }}
                onView={(patch) => {
                    docsStore.getState().setView(tabId, patch);
                }}
                view={{ mode, preview: view.preview }}
            />
        </div>
    );
}
