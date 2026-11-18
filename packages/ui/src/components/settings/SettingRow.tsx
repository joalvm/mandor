import { useId, type PropsWithChildren } from 'react';

import { cn } from '../../lib/cn.js';
import { FieldWiringProvider } from '../input/field-wiring.js';
import { SettingInheritanceLine, type SettingInheritance } from './SettingInheritanceLine.js';

type SettingRowProps = PropsWithChildren<{
    help?: string | undefined;
    /** Where the value comes from when the row does not keep one of its own. */
    inherits?: SettingInheritance | undefined;
    label: string;
    /** For a control wider than its column — a list, a long line: it goes under the text. */
    stacked?: boolean | undefined;
}>;

/**
 * One setting: what it is and what it means on the left, the control that changes it in a
 * column of its own on the right, against the right edge, so every control of a section ends on
 * the same line. Rows
 * are told apart by the air between them; only the settings of the app draw a thin line there,
 * and they draw it themselves.
 *
 * The control is wired by being written inside, as in a `Field`: the name is its label and the
 * help is its description.
 */
export function SettingRow({ children, help, inherits, label, stacked = false }: SettingRowProps) {
    const id = useId();
    const helpId = help === undefined ? undefined : `${id}-help`;

    return (
        <FieldWiringProvider value={{ describedBy: helpId, id, invalid: false }}>
            <div
                className={cn(
                    'grid min-w-0 items-start gap-gap-control px-pad-control',
                    stacked ? 'grid-cols-1' : 'grid-cols-setting-row',
                )}
                data-part="setting-row"
                data-stacked={stacked}
            >
                <div className="flex min-w-0 flex-col gap-gap-tight" data-part="setting-text">
                    <label className="text-sm text-text-primary" htmlFor={id}>
                        {label}
                    </label>
                    <SettingHelp help={help} id={helpId} />
                </div>
                <div
                    className={cn(
                        'flex min-w-0 flex-col gap-gap-tight',
                        stacked ? 'items-stretch' : 'items-end',
                    )}
                    data-part="setting-control"
                >
                    {children}
                    <SettingInherited inherits={inherits} />
                </div>
            </div>
        </FieldWiringProvider>
    );
}

function SettingHelp({ help, id }: { help: SettingRowProps['help']; id: string | undefined }) {
    if (help === undefined) {
        return null;
    }

    return (
        <p className="text-xs text-text-secondary" id={id}>
            {help}
        </p>
    );
}

function SettingInherited({ inherits }: { inherits: SettingRowProps['inherits'] }) {
    if (inherits === undefined) {
        return null;
    }

    return <SettingInheritanceLine inheritance={inherits} />;
}
