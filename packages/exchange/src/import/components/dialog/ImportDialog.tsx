import { useMessages } from '@mandor/i18n';
import { fireAndForget } from '@mandor/shell';
import { Dialog, DialogBody, DialogFooter } from '@mandor/ui';
import type { InteropScope } from '@mandor/interop-core';
import { useState, type DragEvent, type PropsWithChildren, type ReactNode } from 'react';

import { ChoiceTree } from '../../../choice/components/tree/ChoiceTree.js';
import { useImportFlow } from '../../hooks/useImportFlow.js';
import { ImportDialogContext } from '../../import-dialog-context.js';
import { picksOf, type ImportChoice, type ImportPick } from '../../lib/import-choice.js';
import type { ImportedDocument } from '../../lib/imported-document.js';
import { ImportDropzone } from './ImportDropzone.js';
import { ImportFooter } from './ImportFooter.js';
import { ImportSummaryCard } from './ImportSummaryCard.js';

type ImportFlow = ReturnType<typeof useImportFlow>;

/** The children are another way in the app offers, above the dropzone. */
type ImportDialogProps = PropsWithChildren<{
    /** The formats the app reads: the dropzone names them, and the host tells which one a file is. */
    formats: readonly ImportChoice[];
    onClose: () => void;
    onImported: (imported: ImportedDocument) => void;
    scope: InteropScope;
}>;

/**
 * The whole import in one surface, in the shape the reference tools made familiar: the
 * document comes in from the dropzone or the file dialog and shows as one summary line; below,
 * the tree of what would enter, folded to the top level. Every row answers with a checkbox —
 * in, out or, for a folder, a bit of both — and the button writes only what is left marked. When it closes, the refreshed
 * collection is the only confirmation there is. Nobody says what format the document is in: the
 * host reads it and finds out. What the app draws in it — a command to paste, say — stands above
 * the dropzone until a document is read, and does its own work.
 */
export function ImportDialog({ children, formats, onClose, onImported, scope }: ImportDialogProps) {
    const messages = useMessages('import');
    const flow = useImportFlow(onClose, { formats, onImported, scope });
    const { plan } = flow;
    // The summary's own button asks again in the way the last pick was made.
    const [lastPick, setLastPick] = useState<ImportPick>(picksOf(formats)[0] ?? 'files');

    const drop = async (event: DragEvent<HTMLDivElement>): Promise<void> => {
        event.preventDefault();

        const files = await flow.drop(event.dataTransfer);

        if (files !== null && files.length > 0) {
            await flow.build(files);
        }
    };

    const pick = async (input: ImportPick): Promise<void> => {
        setLastPick(input);

        const picked = await flow.pick(input);

        if (picked !== null) {
            await flow.build(picked);
        }
    };

    return (
        // modal-policy: irreversible-confirmation — the tree on screen is the user's confirmation.
        <Dialog
            closeLabel={messages('cancel')}
            onOpenChange={(next) => {
                if (!next) {
                    // Nobody is left to want what a read under way would bring.
                    flow.stop();
                    onClose();
                }
            }}
            open
            title={messages('title')}
        >
            <DialogBody>
                <div className="flex min-h-0 flex-col gap-gap-section" data-part="import-dialog">
                    <ImportOther flow={flow} onClose={onClose}>
                        {children}
                    </ImportOther>
                    <ImportSource
                        flow={flow}
                        formats={formats}
                        onBrowse={() => {
                            fireAndForget(pick(lastPick));
                        }}
                        onDrop={(event) => {
                            fireAndForget(drop(event));
                        }}
                        onPick={(input) => {
                            fireAndForget(pick(input));
                        }}
                    />
                    <ImportTree flow={flow} />
                </div>
            </DialogBody>
            <DialogFooter>
                <ImportFooter
                    applying={flow.busy === 'applying'}
                    disabled={flow.busy !== null || plan === null || flow.counts.selected === 0}
                    onApply={() => {
                        fireAndForget(flow.apply());
                    }}
                />
            </DialogFooter>
        </Dialog>
    );
}

/** What the app offers besides a document, while no document is read. */
function ImportOther({
    children,
    flow,
    onClose,
}: {
    children: ReactNode;
    flow: ImportFlow;
    onClose: () => void;
}) {
    if (flow.plan !== null) {
        return null;
    }

    return <ImportDialogContext value={{ close: onClose }}>{children}</ImportDialogContext>;
}

function ImportSource({
    flow,
    formats,
    onBrowse,
    onDrop,
    onPick,
}: {
    flow: ImportFlow;
    formats: ImportDialogProps['formats'];
    onBrowse: () => void;
    onDrop: (event: DragEvent<HTMLDivElement>) => void;
    onPick: (input: ImportPick) => void;
}) {
    if (flow.plan === null || flow.reading !== null) {
        return (
            <ImportDropzone
                disabled={flow.busy !== null || flow.reading !== null}
                formats={formats}
                loading={flow.busy === 'building' || flow.reading !== null}
                onDrop={onDrop}
                onPick={onPick}
                onStop={flow.stop}
                reading={flow.reading}
            />
        );
    }

    return <ImportSummaryCard name={flow.name} onBrowse={onBrowse} />;
}

function ImportTree({ flow }: { flow: ImportFlow }) {
    const messages = useMessages('import');
    const choice = useMessages('choice');

    if (flow.plan === null) {
        return null;
    }

    return (
        <ChoiceTree
            chosen={flow.chosen}
            key={flow.name}
            label={messages('tree')}
            nodes={flow.nodes}
            onChange={flow.choose}
            title={choice('all')}
        />
    );
}
