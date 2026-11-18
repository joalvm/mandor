import { useMessages } from '@mandor/i18n';
import { placeCaretAt, Popover, SuggestList } from '@mandor/ui';
import {
    type KeyboardEvent,
    type ReactNode,
    type RefObject,
    useEffect,
    useRef,
    useState,
} from 'react';

import { VariableInput } from '../field/VariableInput.js';
import { useKeyValueTable } from './key-value-context.js';
import { useKeySuggestions, type KeySuggestions } from './useKeySuggestions.js';

type KeyValueKeyInputProps = {
    /** Receives the editable span, so the caller can hear the focus the line lives by. */
    editableRef?: RefObject<HTMLSpanElement | null> | undefined;
    /** A key its list cannot be kept under: the cell wears the error line until it is fixed. */
    invalid?: boolean | undefined;
    label: string;
    onValueChange: (value: string) => void;
    placeholder?: string | undefined;
    value: string;
};

/**
 * The key cell of a row. When the table was given names to suggest, writing here hangs the
 * list of the ones that still fit from the cell: the keyboard walks the list while it is
 * open and walks the grid when it is not, and a pick writes the name in place, where the
 * caret stood. The cell speaks variables like every other one — a `{{name}}` paints with the
 * tone its environment earns it, and while a token is being written the names stand aside.
 * Without names to suggest it is a plain field that speaks variables.
 */
export function KeyValueKeyInput({
    editableRef,
    invalid,
    label,
    onValueChange,
    placeholder,
    value,
}: KeyValueKeyInputProps): ReactNode {
    const table = useKeyValueTable();
    const mine = useRef<HTMLSpanElement>(null);
    const editable = editableRef ?? mine;
    const anchor = useRef<HTMLDivElement>(null);
    const [focused, setFocused] = useState(false);

    useEffect(() => {
        const node = editable.current;

        if (node === null) {
            return;
        }

        const gain = (): void => {
            setFocused(true);
        };

        const lose = (): void => {
            setFocused(false);
        };

        node.addEventListener('focus', gain);
        node.addEventListener('blur', lose);

        return () => {
            node.removeEventListener('focus', gain);
            node.removeEventListener('blur', lose);
        };
    }, [editable]);

    const suggest = useKeySuggestions({
        complete: (name) => {
            const node = editable.current;

            if (node !== null) {
                node.textContent = name;
                placeCaretAt(node, name.length);
            }

            onValueChange(name);
        },
        focused,
        suggestions: table.keySuggestions,
        value,
    });

    function onKeyDownIn(event: KeyboardEvent<HTMLSpanElement>): void {
        if (suggest?.onKeyDown(event) === true) {
            return;
        }

        table.walk(event);
    }

    return (
        <div className="min-w-0 flex-1" data-part="key-value-key-input" ref={anchor}>
            <VariableInput
                className="min-w-0 flex-1"
                editableRef={editable}
                environment={table.environment}
                invalid={invalid}
                label={label}
                onChange={onValueChange}
                onKeyDown={onKeyDownIn}
                onVariablesChange={table.onVariablesChange}
                placeholder={placeholder}
                value={value}
                variant="flat"
            />
            <KeySuggestionList anchor={anchor} suggest={suggest} />
        </div>
    );
}

function KeySuggestionList({
    anchor,
    suggest,
}: {
    anchor: RefObject<HTMLDivElement | null>;
    suggest: KeySuggestions | null;
}) {
    const messages = useMessages('environment');

    if (suggest?.open !== true) {
        return null;
    }

    return (
        <Popover anchor={anchor} modal={false} open>
            <SuggestList
                activeName={suggest.active}
                label={messages('keyValueSuggestLabel')}
                onHighlight={suggest.setActive}
                onPick={suggest.pick}
                options={suggest.options.map((name) => ({ name }))}
                scrollable
            />
        </Popover>
    );
}
