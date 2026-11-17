import { useEffect, useRef, useState, type KeyboardEvent, type SyntheticEvent } from 'react';

import { cn } from '../../lib/cn.js';

type InlineNameInputProps = {
    autoFocus?: boolean;
    label: string;
    onCancel: () => void;
    onCommit: (value: string) => boolean;
    value: string;
};

/**
 * Edits a row name in place. It stands where the name stood, and the row keeps everything else:
 * the glyph before it and the actions after it. Enter on a name the row refuses keeps the field
 * open and marked; leaving the field with one, or with nothing typed, lets it go, the way a file
 * manager drops a rename nobody finished.
 *
 * What happens inside the field stays in the field. A click that places the caret is not a
 * click on the row, and a double click that takes a word does not start another rename.
 */
export function InlineNameInput({
    autoFocus = true,
    label,
    onCancel,
    onCommit,
    value,
}: InlineNameInputProps) {
    const editableRef = useRef<HTMLSpanElement>(null);
    const [draft, setDraft] = useState(value);
    const [invalid, setInvalid] = useState(false);

    function commit(): void {
        setInvalid(!onCommit(draft));
    }

    function commitOrLetGo(): void {
        if (draft.trim() === '' || !onCommit(draft)) {
            onCancel();
        }
    }

    function onKeyDown(event: KeyboardEvent<HTMLSpanElement>): void {
        const action = new Map([
            ['Escape', onCancel],
            ['Enter', commit],
        ]).get(event.key);

        event.stopPropagation();

        if (action === undefined) {
            return;
        }

        event.preventDefault();
        action();
    }

    useEffect(() => {
        if (!autoFocus) {
            return;
        }

        const editable = editableRef.current;

        if (editable === null) {
            return;
        }

        const selection = window.getSelection();
        const range = document.createRange();

        editable.focus();
        range.selectNodeContents(editable);
        selection?.removeAllRanges();
        selection?.addRange(range);
    }, [autoFocus]);

    return (
        <span
            aria-invalid={invalid}
            aria-label={label}
            className={cn(
                // It stands where the name stood: no border, no height of its own — the type and
                // the line are the row's. The one box it wears is a solid surface, so the hover
                // of the row behind never bleeds through the field; the focus takes the ring of
                // `focus.css`, and a draft the row rejects wears the wavy underline of a word
                // the spellchecker doubts.
                'min-w-0 flex-1 bg-surface-sunken px-1 outline-none',
                invalid && 'underline decoration-border-error decoration-wavy underline-offset-2',
            )}
            contentEditable="plaintext-only"
            data-focus-ring=""
            data-part="inline-name-input"
            onBlur={commitOrLetGo}
            onClick={(event) => {
                event.stopPropagation();
            }}
            onDoubleClick={(event) => {
                event.stopPropagation();
            }}
            onInput={(event: SyntheticEvent<HTMLSpanElement>) => {
                setDraft(event.currentTarget.textContent);
                setInvalid(false);
            }}
            onKeyDown={onKeyDown}
            ref={editableRef}
            role="textbox"
            suppressContentEditableWarning
        >
            {value}
        </span>
    );
}
