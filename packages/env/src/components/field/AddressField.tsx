import { useTabOpened } from '@mandor/shell';
import { cn, placeCaretAt } from '@mandor/ui';
import { useRef, type ComponentProps } from 'react';

import { VariableInput } from './VariableInput.js';

type AddressFieldProps = Omit<ComponentProps<typeof VariableInput>, 'className' | 'variant'>;

/**
 * The address of an `AddressBar`: a field that speaks variables, drawn without a box of its own
 * and stretched over the room the other parts leave. Both apps dial with it, so one change to how
 * an address reads lands in both. A tab that was just opened, from wherever, starts here: the
 * focus lands on the address with the caret at its end. One that is disabled keeps the bar's
 * ground: it is read and not written, so it takes no box of its own.
 */
export function AddressField({ editableRef, ...props }: AddressFieldProps) {
    const ownEditable = useRef<HTMLSpanElement | null>(null);
    const line = editableRef ?? ownEditable;

    useTabOpened(() => {
        const node = line.current;

        if (node === null || props.disabled === true) {
            return;
        }

        node.focus();
        placeCaretAt(node, node.textContent.length);
    });

    return (
        <VariableInput
            {...props}
            className={cn('h-full min-w-0 flex-1', props.disabled === true && 'bg-transparent')}
            editableRef={line}
            variant="bare"
        />
    );
}
