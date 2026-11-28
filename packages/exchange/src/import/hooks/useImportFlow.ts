import { useMessages } from '@mandor/i18n';
import type { ImportPlan, InteropFile, InteropScope } from '@mandor/interop-core';
import type { ErrorCode } from '@mandor/ipc';
import { bridge, useShellStore } from '@mandor/shell';
import { useToast } from '@mandor/ui';
import { useMemo, useState } from 'react';

import type { ChoiceNode } from '../../choice/lib/choice-state.js';
import {
    chosenOf,
    importChoiceNodes,
    selectionSummary,
    withChosen,
} from '../lib/import-plan-tree.js';
import type { ImportChoice, ImportPick } from '../lib/import-choice.js';
import { IMPORT_DOORS } from '../lib/import-doors.js';
import { lossValues } from '../lib/loss-values.js';
import type { DroppedTransfer } from '../lib/read-dropped.js';
import type { ImportedDocument } from '../lib/imported-document.js';
import { notifyImported } from '../lib/imported-signal.js';
import { scriptsToAdjustIn } from '../lib/scripts-to-adjust-in.js';
import { useImportReading } from './useImportReading.js';

const NO_NODES: readonly ChoiceNode[] = [];
const NOTHING_CHOSEN: ReadonlySet<string> = new Set();

type ImportFlowOptions = {
    /** What the app reads: when main finds no format for a file, the error names these. */
    formats: readonly ImportChoice[];
    /** Called with the workspace the import wrote into, after it landed. */
    onImported: (imported: ImportedDocument) => void;
    /** What the import brings in: one collection, or the whole workspace. */
    scope: InteropScope;
};

/**
 * The whole flow of one import dialog: read the files, hold the plan the user shapes with
 * the choice tree, write what is left marked, and ring the doorbell that reloads the surfaces
 * the import touched. The dialog draws; this decides.
 */
export function useImportFlow(
    onClose: () => void,
    { formats, onImported, scope }: ImportFlowOptions,
): {
    apply: () => Promise<void>;
    build: (files: readonly InteropFile[]) => Promise<void>;
    busy: 'building' | 'applying' | null;
    choose: (chosen: ReadonlySet<string>) => void;
    chosen: ReadonlySet<string>;
    counts: { selected: number; total: number };
    drop: (transfer: DroppedTransfer) => Promise<InteropFile[] | null>;
    name: string;
    nodes: readonly ChoiceNode[];
    pick: (input: ImportPick) => Promise<InteropFile[] | null>;
    plan: ImportPlan | null;
    reading: number | null;
    stop: () => void;
} {
    const errors = useMessages('errors');
    const messages = useMessages('import');
    const toast = useToast();
    const activeWorkspaceId = useShellStore((state) => state.activeWorkspaceId);
    const [name, setName] = useState('');
    const [plan, setPlan] = useState<ImportPlan | null>(null);
    const [busy, setBusy] = useState<'building' | 'applying' | null>(null);
    const fail = ({ error }: { error: { code: ErrorCode } }): void => {
        // Stopped on purpose: the person already knows, and the dropzone is back.
        if (error.code === 'import-cancelled') {
            return;
        }

        const unknown = error.code === 'import-format-unknown';
        const accepted = formats.map(({ label }) => label).join(', ');

        toast.notify({
            title: unknown ? messages('formatUnknown', { formats: accepted }) : errors(error.code),
            tone: 'error',
        });
    };

    const { drop, pick, reading, stop } = useImportReading(fail);
    const conflictWord = messages('rowConflict');
    const removalWord = messages('rowRemoval');
    const nodes = useMemo(
        () =>
            plan === null
                ? NO_NODES
                : importChoiceNodes(plan, {
                      conflict: conflictWord,
                      loss: ({ code, values }) => messages(`loss.${code}`, lossValues(values)),
                      removal: removalWord,
                  }),
        [conflictWord, messages, plan, removalWord],
    );

    const build = async (files: readonly InteropFile[]): Promise<void> => {
        const comparedWith = IMPORT_DOORS[scope].comparedWith(activeWorkspaceId);

        if (comparedWith === null) {
            return;
        }

        setBusy('building');

        const result = await bridge.import.plan({ ...comparedWith, files: [...files], scope });

        setBusy(null);

        if (!result.ok) {
            fail(result);

            return;
        }

        setName(result.value.name);
        setPlan(result.value.plan);
    };

    const apply = async (): Promise<void> => {
        const target = IMPORT_DOORS[scope].target(activeWorkspaceId, name);

        if (plan === null || target === null) {
            return;
        }

        setBusy('applying');

        const result = await bridge.import.apply({ target, name, plan });

        setBusy(null);

        if (!result.ok) {
            fail(result);

            return;
        }

        onClose();
        notifyImported();
        onImported({ workspaceId: result.value.workspaceId });
        tellScriptsToAdjust(scriptsToAdjustIn(plan));
    };

    // Once, after the import: the scripts it brought from another app wait for the person's approval.
    const tellScriptsToAdjust = (count: number): void => {
        if (count > 0) {
            toast.notify({ title: messages('scriptsToAdjust', { count }), tone: 'info' });
        }
    };

    const choose = (next: ReadonlySet<string>): void => {
        if (plan !== null) {
            setPlan(withChosen(plan, nodes, next));
        }
    };

    const chosen = plan === null ? NOTHING_CHOSEN : chosenOf(plan, nodes);
    const counts = plan === null ? { selected: 0, total: 0 } : selectionSummary(plan);

    return {
        apply,
        build,
        busy,
        choose,
        chosen,
        counts,
        drop,
        name,
        nodes,
        pick,
        plan,
        reading,
        stop,
    };
}
