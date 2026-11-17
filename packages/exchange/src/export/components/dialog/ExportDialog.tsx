import { useMessages } from '@mandor/i18n';
import { fireAndForget } from '@mandor/shell';
import { Dialog, DialogBody, DialogFooter } from '@mandor/ui';
import type { ReactNode } from 'react';

import { ChoiceTree } from '../../../choice/components/tree/ChoiceTree.js';
import type { ExportFlow } from '../../hooks/useExportFlow.js';
import { ExportFooter } from './ExportFooter.js';
import { ExportFormatMenu, type ExportChoices } from './ExportFormatMenu.js';

type ExportDialogProps = {
    flow: ExportFlow;
    /** The formats the app writes: the menu offers them. */
    formats: ExportChoices;
    onClose: () => void;
};

/**
 * The whole export in one surface, the import seen in a mirror: the tree of what leaves, with
 * the workspace for its top line, the format at the left of the line above it, and a button that
 * hands what is left marked to the dialog of the system. Nothing is written until the user has
 * seen what leaves.
 */
export function ExportDialog({ flow, formats, onClose }: ExportDialogProps): ReactNode {
    const messages = useMessages('export');

    return (
        // modal-policy: short-config-form — named, chosen from, and only where it goes left.
        <Dialog
            closeLabel={messages('cancel')}
            onOpenChange={(next) => {
                if (!next) {
                    onClose();
                }
            }}
            open
            title={messages('title')}
        >
            <DialogBody>
                <ChoiceTree
                    chosen={flow.chosen}
                    label={messages('tree')}
                    loading={flow.busy === 'loading'}
                    nodes={flow.nodes}
                    onChange={flow.choose}
                    title={flow.name}
                >
                    <ExportFormats flow={flow} formats={formats} />
                </ChoiceTree>
            </DialogBody>
            <DialogFooter>
                <ExportFooter
                    saving={flow.busy === 'saving'}
                    disabled={flow.chosen.size === 0}
                    onSave={() => {
                        fireAndForget(flow.save());
                    }}
                />
            </DialogFooter>
        </Dialog>
    );
}

function ExportFormats({
    flow,
    formats,
}: {
    flow: ExportDialogProps['flow'];
    formats: ExportDialogProps['formats'];
}) {
    if (formats.length <= 1) {
        return null;
    }

    return (
        <ExportFormatMenu
            formats={formats}
            onChange={(format) => {
                fireAndForget(flow.setFormat(format));
            }}
            value={flow.format}
        />
    );
}
