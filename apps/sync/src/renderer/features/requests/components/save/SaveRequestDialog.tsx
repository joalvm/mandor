import { CollectionIcon, FolderIcon } from '@mandor/icons';
import { useMessages } from '@mandor/i18n';
import {
    Button,
    Dialog,
    DialogBody,
    DialogFooter,
    Field,
    Input,
    RowLabel,
    Tree,
    TreeRow,
} from '@mandor/ui';
import { useStore } from 'zustand';

import { saveToQuestion, type SaveToAsking } from '../../save-to-question.js';
import { useSaveTo } from './useSaveTo.js';

/** The glyph of each place a request can go, as the lateral draws it. */
const PLACE_GLYPHS = { collection: CollectionIcon, folder: FolderIcon } as const;

/**
 * The question a request saved nowhere asks the first time it is saved: «Save to…», with its name
 * and the collection or folder it goes into. A new collection or folder is made right here,
 * without leaving the question. Mounted once by the kind of those tabs.
 */
export function SaveRequestDialog() {
    const asking = useStore(saveToQuestion, (state) => state.asking);

    if (asking === null) {
        return null;
    }

    return <SaveRequestForm asking={asking} key={asking.resource} />;
}

function SaveRequestForm({ asking }: { asking: SaveToAsking }) {
    const labels = useMessages('requests');
    const words = useMessages('collections');
    const to = useSaveTo(asking);

    return (
        // modal-policy: short-config-form — a name, and the place it goes into.
        <Dialog
            closeLabel={labels('saveToCancel')}
            onOpenChange={(next) => {
                if (!next) {
                    to.cancel();
                }
            }}
            open
            title={labels('saveToTitle')}
        >
            <DialogBody>
                <div className="flex flex-col gap-gap-control" data-part="save-request-dialog">
                    <Field id="save-request-name" label={labels('saveToName')}>
                        <Input
                            label={labels('saveToName')}
                            onValueChange={to.setName}
                            value={to.name}
                            variant="text"
                        />
                    </Field>
                    <div
                        className="flex items-center justify-between"
                        data-part="save-request-places"
                    >
                        <span className="text-xs text-text-secondary">{labels('saveToPlace')}</span>
                        <div
                            className="flex items-center gap-gap-control"
                            data-part="save-request-make"
                        >
                            <Button onClick={to.newCollection} variant="secondary">
                                {words('newCollection')}
                            </Button>
                            <Button onClick={to.newFolder} variant="secondary">
                                {words('newFolder')}
                            </Button>
                        </div>
                    </div>
                    <div
                        className="box-content flex h-64 flex-col rounded-md border border-border-subtle bg-surface-panel p-2"
                        data-part="save-request-tree"
                    >
                        <Tree
                            chevrons
                            label={labels('saveToPlace')}
                            lines={to.lines}
                            onExpandedChange={to.fold}
                            onSelectedChange={(ids) => {
                                const chosen = ids.at(-1);

                                if (chosen !== undefined) {
                                    to.setPlace(chosen);
                                }
                            }}
                            selected={to.place === null ? [] : [to.place]}
                        >
                            {to.lines.map((line) => (
                                <SaveRequestPlace key={line.id} kind={line.kind} name={line.name} />
                            ))}
                        </Tree>
                    </div>
                </div>
            </DialogBody>
            <DialogFooter>
                <Button onClick={to.cancel} variant="secondary">
                    {labels('saveToCancel')}
                </Button>
                <Button onClick={to.save} variant="primary">
                    {labels('saveToSubmit')}
                </Button>
            </DialogFooter>
        </Dialog>
    );
}

function SaveRequestPlace({ kind, name }: { kind: keyof typeof PLACE_GLYPHS; name: string }) {
    const Glyph = PLACE_GLYPHS[kind];

    return (
        <TreeRow>
            <Glyph size="sm" />
            <RowLabel>{name}</RowLabel>
        </TreeRow>
    );
}
