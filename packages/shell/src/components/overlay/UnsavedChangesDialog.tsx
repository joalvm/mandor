import type { ErrorCode } from '@mandor/ipc';
import { useMessages, useTranslator } from '@mandor/i18n';
import { SaveChangesDialog } from '@mandor/ui';
import { useState } from 'react';
import { useStore } from 'zustand';

import { fireAndForget } from '../../fire-and-forget.js';
import { useFailureToast } from '../../hooks/useFailureToast.js';
import { tabKind, type TabSaveOutcome } from '../../tab/tab-kind-registry.js';
import { tabTitleOf } from '../../tab/tab-title.js';
import { unsavedQuestion } from '../../tab/unsaved-question.js';

/**
 * The question a tab with unsaved work asks as it closes by hand, named after the tab. Saving
 * goes through the kind of the tab, and the tab goes once the work is on disk; a save that is
 * refused, or that breaks before it answers, says why as a toast and keeps the tab, with the
 * rest of a closing of many left open. A save that asks where, and that the person stays out of,
 * keeps the tab and says nothing.
 * Letting the work go closes the tab, and its kind lets go of the draft as it leaves.
 *
 * Mounted once by each app, inside its toast provider.
 */
export function UnsavedChangesDialog() {
    const messages = useMessages('shell');
    const translate = useTranslator();
    const notifyFailure = useFailureToast();
    const asking = useStore(unsavedQuestion, (state) => state.asking);
    const answer = useStore(unsavedQuestion, (state) => state.answer);
    const [saving, setSaving] = useState(false);
    const tab = asking?.tab;
    const kind = tab === undefined ? undefined : tabKind(tab.kind);
    const save = kind?.save;
    const saved = (outcome: TabSaveOutcome): void => {
        setSaving(false);

        if (outcome !== null && outcome !== 'kept') {
            notifyFailure(outcome);
        }

        answer(outcome === null);
    };

    return (
        // modal-policy: irreversible-confirmation
        <SaveChangesDialog
            cancelLabel={messages('unsavedCancel')}
            description={messages('unsavedBody')}
            discardLabel={messages('unsavedDiscard')}
            onCancel={() => {
                answer(false);
            }}
            onDiscard={() => {
                answer(true);
            }}
            onSave={
                tab === undefined || save === undefined
                    ? undefined
                    : () => {
                          setSaving(true);
                          fireAndForget(
                              save(tab.id, tab.resource)
                                  .catch((): ErrorCode => 'unknown')
                                  .then(saved),
                          );
                      }
            }
            open={tab !== undefined}
            saveLabel={messages('unsavedSave')}
            saving={saving}
            title={messages('unsavedTitle', {
                title: tab === undefined ? '' : tabTitleOf(tab, translate),
            })}
        />
    );
}
