import type { Environment, Variable } from '@mandor/schema';
import {
    caretOffsetIn,
    caretRectAt,
    type FieldVariant,
    Input,
    insertPlainText,
    placeCaretAt,
    type PopoverAnchor,
} from '@mandor/ui';
import {
    useRef,
    type ComponentProps,
    type KeyboardEvent,
    type ReactNode,
    type RefObject,
} from 'react';

import { useVariableHover } from '../../hooks/useVariableHover.js';
import { useVariableSuggestions } from '../../hooks/useVariableSuggestions.js';
import { useVariableScope } from '../../hooks/useVariableScope.js';
import { useWrittenCaret } from '../../hooks/useWrittenCaret.js';
import { completeVariable } from '../../lib/complete-variable.js';
import { fieldSegments } from '../../lib/field-segments.js';
import { opensToken } from '../../lib/opens-token.js';
import { SuggestionsPopover } from './SuggestionsPopover.js';
import { VariablePopover } from './VariablePopover.js';

type VariableInputProps = {
    className?: string | undefined;
    /** The field is read and not written: it still paints its variables, and opens none of them. */
    disabled?: boolean | undefined;
    /** Why a disabled field cannot be written, said where the pointer rests on it. */
    disabledReason?: string | undefined;
    editableRef?: RefObject<HTMLSpanElement | null> | undefined;
    environment: Environment | undefined;
    invalid?: boolean | undefined;
    label: string;
    onChange: (value: string) => void;
    /**
     * The keys the field leaves alone, for an owner with a shortcut that has to work from here.
     * The field stops every key from reaching the panel around it, so a shortcut cannot wait up
     * there. While the suggestions are open they own the keys, and the owner hears none.
     */
    onKeyDown?: ((event: KeyboardEvent<HTMLSpanElement>) => void) | undefined;
    onVariablesChange: (variables: readonly Variable[]) => void;
    /** Sees a paste before it lands; `true` means it took the text and nothing is inserted. */
    onPasteText?: ((text: string) => boolean) | undefined;
    placeholder?: string | undefined;
    /** How much of a box the line draws: none when the owner already draws one around it. */
    variant?: FieldVariant | undefined;
    value: string;
};

/**
 * A field that speaks variables: it paints every `{{name}}` with the tone the environment
 * earns it, suggests the names that still fit while one is being written, and opens the
 * variable under the pointer to read it, edit it or declare it right there.
 *
 * Opening a variable with `{{` draws its close at once and leaves the caret inside it, the
 * way a code editor closes a bracket: the name is what the caret has written so far, and the
 * suggestions hang from that spot.
 *
 * Only writing asks for a name. A caret that a click, an arrow or leaving the field put inside
 * a token wrote nothing there, so no list comes up for it; and while a name is being written
 * the panel of a variable stays away, since two panels hanging from one token talk over each
 * other.
 *
 * The environment in force and the write that changes it arrive from the owner — a
 * connection in Mandor Realtime, the workspace in Mandor Request. This component knows variables,
 * never who holds them.
 */
export function VariableInput({
    className,
    disabled = false,
    disabledReason,
    editableRef: editableRefOfCaller,
    environment,
    invalid = false,
    label,
    onChange,
    onKeyDown,
    onVariablesChange,
    onPasteText,
    placeholder,
    variant = 'text',
    value,
}: VariableInputProps): ReactNode {
    const ownEditable = useRef<HTMLSpanElement | null>(null);
    // The caller's ref, when given, IS the line: the same node, heard once.
    const editableRef = editableRefOfCaller ?? ownEditable;
    const caret = useWrittenCaret();
    const caretAnchor = useRef<PopoverAnchor>({
        getBoundingClientRect: () => {
            const node = editableRef.current;

            if (node === null) {
                return new DOMRect();
            }

            return caretRectAt(node, Math.min(caret.atRef.current ?? 0, node.textContent.length));
        },
    });
    const hover = useVariableHover();
    const scope = useVariableScope(environment);

    const suggestions = useVariableSuggestions({
        caret: caret.at,
        complete: (name) => {
            const node = editableRef.current;

            if (node === null) {
                return;
            }

            completeVariable(node, name, caret.atRef.current ?? undefined);
            onChange(node.textContent);
            caret.forget();
        },
        scope,
        value,
    });

    /** `{{` just typed opens a token: its close is drawn at once, the caret stays inside. */
    function onValueChangeIn(next: string): void {
        const node = editableRef.current;

        // Leaving the field reports its text once more: nothing was written, nothing is asked.
        if (next === value) {
            return;
        }

        hover.close();

        if (node === null) {
            onChange(next);

            return;
        }

        const at = caretOffsetIn(node);

        if (!opensToken(next, at)) {
            caret.write(at);
            onChange(next);

            return;
        }

        placeCaretAt(node, at);
        insertPlainText(node, '}}');
        placeCaretAt(node, at);
        caret.write(at);
        onChange(node.textContent);
    }

    return (
        <div
            className="contents"
            data-part="variable-input"
            onBlur={caret.forget}
            onPointerDown={caret.onPointerDown}
            onPointerOut={hover.onPointerOut}
            onPointerOver={hover.onPointerOver}
        >
            <Input
                className={className}
                disabled={disabled}
                disabledReason={disabledReason}
                editableRef={editableRef}
                invalid={invalid}
                label={label}
                onValueChange={onValueChangeIn}
                onKeyDown={(event) => {
                    caret.onKeyDown(event);
                    suggestions.onKeyDown(event);

                    if (!suggestions.open) {
                        onKeyDown?.(event);
                    }
                }}
                onPasteText={onPasteText}
                placeholder={placeholder}
                segments={fieldSegments(value, scope)}
                variant={variant}
                value={value}
            />
            <SuggestionsPopover anchor={caretAnchor} suggestions={suggestions} />
            <HoveredVariable
                environment={environment}
                hover={hover}
                onVariablesChange={onVariablesChange}
                suggesting={suggestions.open || disabled}
                scope={scope}
            />
        </div>
    );
}

/** The list of suggestions and the popover of a variable never stand over the field at once. */
function HoveredVariable({
    suggesting,
    ...popover
}: ComponentProps<typeof VariablePopover> & { suggesting: boolean }) {
    if (suggesting) {
        return null;
    }

    return <VariablePopover {...popover} />;
}
