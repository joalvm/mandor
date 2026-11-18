import { useMessages } from '@mandor/i18n';
import { bridge, openConflict, selectConflictFor, shellStore } from '@mandor/shell';
import { useToast } from '@mandor/ui';
import { useEffect } from 'react';

/**
 * Says so when a write or a merge kept a clash for a person to answer, and offers the tab that
 * answers it. The name comes with the push, so the notice never has to work one out from an id;
 * a file that carries none is called an unnamed file. The clash is looked up as the button is
 * pressed, not as the notice appears: the list of the window may not have it yet by then, and by
 * the time of the press it will.
 */
export function useConflictToast(): void {
    const messages = useMessages('origins');
    const toast = useToast();

    useEffect(
        () =>
            bridge.repo.onConflictRecorded((push) => {
                toast.notify({
                    action: {
                        label: messages('resolveConflict'),
                        onSelect: () => {
                            const clash = selectConflictFor(shellStore.getState(), push.entity);

                            if (clash !== undefined) {
                                openConflict(clash);
                            }
                        },
                    },
                    title:
                        push.name === ''
                            ? messages('conflictRecordedUnnamed')
                            : messages('conflictRecorded', { name: push.name }),
                    tone: 'warning',
                });
            }),
        [messages, toast],
    );
}
