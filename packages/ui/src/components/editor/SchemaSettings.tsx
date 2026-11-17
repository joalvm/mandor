import { useState } from 'react';
import {
    schemaStrictnessOf,
    withAllRequired,
    withClosedObjects,
    type StrictnessState,
} from '@mandor/validate';

import { IconButton } from '../button/IconButton.js';
import { Dialog } from '../dialog/Dialog.js';
import { DialogBody } from '../dialog/DialogBody.js';
import { SettingRow } from '../settings/SettingRow.js';
import { Switch } from '../toggle/Switch.js';

/** What the options of a schema say about themselves. The words belong to whoever mounts them. */
export type SchemaSettingsLabels = {
    button: string;
    close: string;
    closed: string;
    closedHelp: string;
    /** Added to the help of an option only some objects keep today. */
    partly: string;
    required: string;
    requiredHelp: string;
    title: string;
    /** Said in place of the options while the text of the schema cannot be read. */
    unreadable: string;
};

type SchemaSettingsProps = {
    labels: SchemaSettingsLabels;
    onChange: (text: string) => void;
    /** The schema the options are read from and written into. */
    text: string;
};

/**
 * How a switch says a rule every object keeps, none keeps, or only some keep. A switch has no
 * middle: a rule only some objects keep stands off, and its help says so.
 */
const SWITCH_OF_SHARE: Record<StrictnessState, { on: boolean; partly: boolean }> = {
    all: { on: true, partly: false },
    none: { on: false, partly: false },
    some: { on: false, partly: true },
};

/**
 * The options of a schema, behind one button. They are not stored anywhere but in the schema: a
 * switch reads its rule from the text, and turning it on writes the rule into every object the
 * text describes — comments and layout kept — so what the dialog says and what the file says
 * never part. A rule only some objects keep stands off, and turning it on makes it every object's.
 */
export function SchemaSettings({ labels, onChange, text }: SchemaSettingsProps) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <IconButton
                icon="settings"
                label={labels.button}
                onClick={() => {
                    setOpen(true);
                }}
            />
            <Dialog
                closeLabel={labels.close}
                onOpenChange={setOpen}
                open={open}
                title={labels.title}
            >
                <DialogBody>
                    <SchemaOptions labels={labels} onChange={onChange} text={text} />
                </DialogBody>
            </Dialog>
        </>
    );
}

function SchemaOptions({ labels, onChange, text }: SchemaSettingsProps) {
    const strictness = schemaStrictnessOf(text);

    if (strictness === undefined) {
        return (
            <p className="text-text-secondary" data-part="schema-settings-unreadable">
                {labels.unreadable}
            </p>
        );
    }

    return (
        <>
            <StrictnessRow
                help={labels.closedHelp}
                label={labels.closed}
                onCheckedChange={(on) => {
                    onChange(withClosedObjects(text, on));
                }}
                partly={labels.partly}
                share={strictness.closed}
            />
            <StrictnessRow
                help={labels.requiredHelp}
                label={labels.required}
                onCheckedChange={(on) => {
                    onChange(withAllRequired(text, on));
                }}
                partly={labels.partly}
                share={strictness.required}
            />
        </>
    );
}

type StrictnessRowProps = {
    help: string;
    label: string;
    onCheckedChange: (on: boolean) => void;
    partly: string;
    /** How many of the objects of the schema keep the rule today. */
    share: StrictnessState;
};

/** One rule of the schema as a setting: its name and meaning, and the switch at the right. */
function StrictnessRow({ help, label, onCheckedChange, partly, share }: StrictnessRowProps) {
    const state = SWITCH_OF_SHARE[share];

    return (
        <SettingRow help={state.partly ? `${help} ${partly}` : help} label={label}>
            <Switch checked={state.on} label={label} onCheckedChange={onCheckedChange} />
        </SettingRow>
    );
}
