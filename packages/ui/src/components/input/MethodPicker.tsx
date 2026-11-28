import { ChevronDownIcon } from '@mandor/icons';
import { useState } from 'react';

import { Button } from '../button/Button.js';
import { MethodMark } from '../indicator/MethodMark.js';
import { Menu } from '../menu/Menu.js';
import { MenuContent } from '../menu/MenuContent.js';
import { MenuItem } from '../menu/MenuItem.js';
import { MenuSeparator } from '../menu/MenuSeparator.js';
import { MenuTrigger } from '../menu/MenuTrigger.js';
import { InlineNameInput } from './InlineNameInput.js';

type MethodPickerProps = {
    /** Whether a typed verb may stand: the grammar of a method is the owner's, not the picker's. */
    accepts: (method: string) => boolean;
    label: string;
    /** The verbs the list offers, in order. The one in force is listed even when it is not one. */
    methods: readonly string[];
    onValueChange: (method: string) => void;
    /** What the field that takes a verb of one's own is called. */
    otherField: string;
    /** The last line of the list, the one that opens that field. */
    otherLabel: string;
    value: string;
};

/**
 * The verb a request goes out with, as the first part of its address bar: the verb in its own
 * hue and the chevron of a list. The list draws every verb in the hue it wears everywhere else,
 * and ends in a line that turns the picker into a field, right where the verb stood, for a verb
 * the list does not know — the field grows where it was promised, not in a dialog.
 *
 * It draws no edge: it lives inside an `AddressBar`, which owns the edge and the focus.
 */
export function MethodPicker({
    accepts,
    label,
    methods,
    onValueChange,
    otherField,
    otherLabel,
    value,
}: MethodPickerProps) {
    const [typing, setTyping] = useState(false);
    const listed = methods.includes(value) ? methods : [...methods, value];

    function commit(typed: string): boolean {
        const method = typed.trim().toUpperCase();

        if (!accepts(method)) {
            return false;
        }

        setTyping(false);
        onValueChange(method);

        return true;
    }

    if (typing) {
        return (
            <span
                className="flex h-field w-21 shrink-0 items-center px-pad-control text-xs font-semibold"
                data-part="method-picker"
            >
                <InlineNameInput
                    label={otherField}
                    onCancel={() => {
                        setTyping(false);
                    }}
                    onCommit={commit}
                    value={value}
                />
            </span>
        );
    }

    return (
        <Menu checkable>
            <MenuTrigger>
                <Button
                    aria-label={`${label} ${value}`}
                    className="h-field w-21 shrink-0 justify-between rounded-e-none border-0 px-pad-control font-semibold"
                    data-part="method-picker"
                    variant="ghost"
                >
                    <MethodMark method={value} />
                    <ChevronDownIcon size="sm" />
                </Button>
            </MenuTrigger>
            <MenuContent>
                {listed.map((method) => (
                    <MenuItem
                        checked={method === value}
                        key={method}
                        onSelect={() => {
                            onValueChange(method);
                        }}
                    >
                        <MethodMark method={method} />
                    </MenuItem>
                ))}
                <MenuSeparator />
                <MenuItem
                    onSelect={() => {
                        setTyping(true);
                    }}
                >
                    {otherLabel}
                </MenuItem>
            </MenuContent>
        </Menu>
    );
}
