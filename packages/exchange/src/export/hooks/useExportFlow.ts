import { useMessages } from '@mandor/i18n';
import type { InteropScope } from '@mandor/interop-core';
import type { ErrorCode } from '@mandor/ipc';
import { bridge, useFailureToast, useShellStore } from '@mandor/shell';
import { useToast } from '@mandor/ui';
import { useState } from 'react';

import { pickableIds, type ChoiceNode } from '../../choice/lib/choice-state.js';
import type { ExportChoices } from '../components/dialog/ExportFormatMenu.js';
import { exportChoiceNodes } from '../lib/export-choice-nodes.js';

type ExportFlowOptions = {
    /** The formats this app writes, the first one chosen: main registered them, main answers. */
    formats: ExportChoices;
    /** What the dialog covers: the whole workspace, or the one collection `load` is given. */
    scope: InteropScope;
};

/** What the dialog asks main for: the format, and the collection when the scope is one. */
type Ask = { collection: string | undefined; format: string };

const NONE: ReadonlySet<string> = new Set();

/** The flow of one export dialog, as the dialog draws it. */
export type ExportFlow = {
    busy: 'loading' | 'saving' | null;
    choose: (chosen: ReadonlySet<string>) => void;
    chosen: ReadonlySet<string>;
    /** The id of the format being asked for. */
    format: string;
    /** Reads what would leave; the collection is the route a collection door was opened on. */
    load: (collection?: string) => Promise<void>;
    name: string;
    nodes: readonly ChoiceNode[];
    save: () => Promise<void>;
    /** Another format leaves other things out, so choosing it reads the outline again. */
    setFormat: (format: string) => Promise<void>;
};

/** The part of a request that says what it covers; a workspace names no collection. */
function coverageOf(scope: InteropScope, { collection }: Ask) {
    return collection === undefined ? { scope } : { scope, collection };
}

/**
 * The whole flow of one export dialog: ask main for the outline of the open workspace, or of one
 * of its collections, with everything marked, let the user clear what should stay, and write what
 * is left where the user says. The dialog draws; this decides.
 */
export function useExportFlow(
    onClose: () => void,
    { formats, scope }: ExportFlowOptions,
): ExportFlow {
    const notifyFailure = useFailureToast();
    const messages = useMessages('export');
    const toast = useToast();
    const activeWorkspaceId = useShellStore((state) => state.activeWorkspaceId);
    const [name, setName] = useState('');
    const [nodes, setNodes] = useState<readonly ChoiceNode[]>([]);
    const [chosen, setChosen] = useState<ReadonlySet<string>>(NONE);
    const [busy, setBusy] = useState<ExportFlow['busy']>(null);
    const [ask, setAsk] = useState<Ask>({ collection: undefined, format: formats[0].id });

    const fail = (result: { error: { code: ErrorCode } }): void => {
        notifyFailure(result.error.code);
    };

    const read = async (next: Ask): Promise<void> => {
        if (activeWorkspaceId === null) {
            return;
        }

        setAsk(next);
        setBusy('loading');

        const result = await bridge.export.outline({
            workspaceId: activeWorkspaceId,
            format: next.format,
            ...coverageOf(scope, next),
        });

        setBusy(null);

        if (!result.ok) {
            fail(result);

            return;
        }

        const format = formats.find(({ id }) => id === next.format)?.label ?? next.format;
        const offered = exportChoiceNodes(
            result.value.nodes,
            { settings: messages('settings') },
            (loss) => messages(`loss.${loss}`, { format }),
        );

        setName(result.value.name);
        setNodes(offered);
        setChosen(new Set(offered.flatMap(pickableIds)));
    };

    const save = async (): Promise<void> => {
        if (chosen.size === 0 || activeWorkspaceId === null) {
            return;
        }

        setBusy('saving');

        const result = await bridge.export.write({
            workspaceId: activeWorkspaceId,
            format: ask.format,
            ...coverageOf(scope, ask),
            chosen: [...chosen],
        });

        setBusy(null);

        if (!result.ok) {
            fail(result);

            return;
        }

        // The user closing the dialog of the system is not a save and not an error: the tree
        // stays as it was, and the decision is still theirs.
        if (result.value.path !== null) {
            toast.notify({ title: messages('saved'), tone: 'success' });
            onClose();
        }
    };

    return {
        busy,
        choose: setChosen,
        chosen,
        format: ask.format,
        load: (collection) => read({ collection, format: ask.format }),
        name,
        nodes,
        save,
        setFormat: (format) => read({ collection: ask.collection, format }),
    };
}
