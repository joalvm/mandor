import { InfoIcon } from '@mandor/icons';
import { useId, type PropsWithChildren } from 'react';

import { Tooltip } from '../tooltip/Tooltip.js';
import { FieldWiringProvider } from './field-wiring.js';

type FormRowProps = PropsWithChildren<{
    /** What the reader has to see about the value, under the control: a warning, a result. */
    help?: string | undefined;
    /** What the field means, behind a mark beside its name: read once, then in the way. */
    hint?: string | undefined;
    label: string;
}>;

/**
 * One field of a form that is read down a column: its name in a column of its own on the left,
 * the control taking the rest on the right, so every control of the form starts on the same line
 * and a long value has room. What the field means waits behind a mark beside the name, the way
 * the request tools put it; what the row has to say about the value goes under the control,
 * where the eye already is. Rows are told apart by the air between them, never by a rule.
 *
 * The control is wired by being written inside, as in a `Field`: the name is its label, and the
 * help and the hint are its description.
 */
export function FormRow({ children, help, hint, label }: FormRowProps) {
    const id = useId();
    const helpId = help === undefined ? undefined : `${id}-help`;
    const hintId = hint === undefined ? undefined : `${id}-hint`;
    const describedBy = [hintId, helpId].filter((part) => part !== undefined).join(' ');

    return (
        <FieldWiringProvider
            value={{
                describedBy: describedBy === '' ? undefined : describedBy,
                id,
                invalid: false,
            }}
        >
            <div
                className="grid min-w-0 grid-cols-form-row items-start gap-gap-group"
                data-part="form-row"
            >
                <div
                    className="flex min-h-field min-w-0 items-center gap-gap-icon-text"
                    data-part="form-label"
                >
                    <label className="min-w-0 truncate text-sm text-text-primary" htmlFor={id}>
                        {label}
                    </label>
                    <FormHint hint={hint} id={hintId} />
                </div>
                <div className="flex min-w-0 flex-col gap-gap-tight" data-part="form-control">
                    {children}
                    <FormHelp help={help} id={helpId} />
                </div>
            </div>
        </FieldWiringProvider>
    );
}

type FormNoteProps = {
    id: string | undefined;
};

function FormHint({ hint, id }: FormNoteProps & { hint: FormRowProps['hint'] }) {
    if (hint === undefined) {
        return null;
    }

    return (
        <Tooltip content={hint}>
            <span className="flex shrink-0 items-center text-text-secondary" data-part="form-hint">
                <InfoIcon size="sm" />
                <span className="sr-only" id={id}>
                    {hint}
                </span>
            </span>
        </Tooltip>
    );
}

function FormHelp({ help, id }: FormNoteProps & { help: FormRowProps['help'] }) {
    if (help === undefined) {
        return null;
    }

    return (
        <p className="text-xs text-text-secondary" id={id}>
            {help}
        </p>
    );
}
