import {
    useLayoutEffect,
    useRef,
    type CompositionEvent,
    type FocusEvent,
    type KeyboardEvent,
    type RefObject,
    type SyntheticEvent,
} from 'react';

import { caretOffsetIn, placeCaretAt } from '../../lib/caret-offset.js';
import { insertPlainText } from '../../lib/insert-plain-text.js';
import { paintSegments, type InputSegment } from '../../lib/paint-segments.js';
import { withEditableRef } from './with-editable-ref.js';

type EditableLineProps = {
    /** The id of the option of a list this line walks while the focus stays in it. */
    activeDescendant?: string | undefined;
    /** The id of the list the line narrows and walks. */
    controls?: string | undefined;
    describedBy?: string | undefined;
    disabled: boolean;
    /** Receives the editable span, so the caller can put the caret in it from outside React. */
    editableRef?: RefObject<HTMLSpanElement | null> | undefined;
    id?: string | undefined;
    invalid: boolean;
    label: string;
    onValueChange: (value: string) => void;
    /** The keys the line receives, after it has handled its own. */
    onKeyDown?: ((event: KeyboardEvent<HTMLSpanElement>) => void) | undefined;
    /** Sees a paste before it lands; `true` means it took the text and nothing is inserted. */
    onPasteText?: ((text: string) => boolean) | undefined;
    placeholder?: string | undefined;
    /** `searchbox` for the field that narrows a list; a plain line stays a `textbox`. */
    role?: 'searchbox' | 'textbox' | undefined;
    segments?: readonly InputSegment[] | undefined;
    value: string;
};

/**
 * One line of text that is edited in place, preserving native selection, IME and a clipboard
 * that pastes plain text and nothing else.
 *
 * The line owns its DOM: React renders the span empty and the paint fills it after every
 * render, because a token is a span the caret has to walk through and React cannot rewrite
 * children under a caret without dropping it. The paint reads the caret as a character offset
 * and puts it back where it stood.
 *
 * While the field is focused its DOM is the truth: a value the field did not write is an
 * external write arriving mid-typing, and painting it would eat the draft the user holds. A
 * composition is the user writing too — the paint waits until it closes. What the owner took and
 * then took back is another matter: the disk refused it, and leaving the line neither sends it
 * again nor keeps it on screen. A paste the owner took is no draft either: the line wrote nothing,
 * and the value the owner makes of it is shown, with the caret after it, as a paste would leave it.
 */
export function EditableLine({
    activeDescendant,
    controls,
    describedBy,
    disabled,
    editableRef,
    id,
    invalid,
    label,
    onValueChange,
    onKeyDown,
    onPasteText,
    placeholder,
    role = 'textbox',
    segments,
    value,
}: EditableLineProps) {
    const editable = useRef<HTMLSpanElement>(null);
    const focusedRef = useRef(false);
    const composingRef = useRef(false);
    const reportedRef = useRef<string | null>(null);
    const echoedRef = useRef(false);
    const pasteTakenRef = useRef(false);

    function report(text: string): void {
        reportedRef.current = text;
        echoedRef.current = false;
        pasteTakenRef.current = false;
        onValueChange(text);
    }

    function repaint(node: HTMLSpanElement): void {
        const arrived = pasteTakenRef.current && node.textContent !== value;
        const caret = focusedRef.current ? caretOffsetIn(node) : null;

        paintSegments(node, segments ?? [{ text: value }]);

        if (caret !== null) {
            placeCaretAt(node, arrived ? value.length : caret);
        }

        if (arrived) {
            pasteTakenRef.current = false;
        }
    }

    useLayoutEffect(() => {
        const node = editable.current;

        if (value === reportedRef.current) {
            echoedRef.current = true;
        }

        if (node === null || composingRef.current) {
            return;
        }

        if (focusedRef.current && !pasteTakenRef.current && node.textContent !== value) {
            return;
        }

        repaint(node);
    });

    function onBlur(event: FocusEvent<HTMLSpanElement>): void {
        focusedRef.current = false;
        pasteTakenRef.current = false;
        // Typing scrolled the line to the caret; a line at rest shows how its text starts.
        event.currentTarget.scrollLeft = 0;

        if (echoedRef.current && value !== reportedRef.current) {
            paintSegments(event.currentTarget, segments ?? [{ text: value }]);

            return;
        }

        onValueChange(event.currentTarget.textContent);
    }

    function onInput(event: SyntheticEvent<HTMLSpanElement>): void {
        report(event.currentTarget.textContent);
    }

    function onCompositionStart(): void {
        composingRef.current = true;
    }

    function onCompositionEnd(event: CompositionEvent<HTMLSpanElement>): void {
        composingRef.current = false;
        report(event.currentTarget.textContent);
    }

    function onKeyDownIn(event: KeyboardEvent<HTMLSpanElement>): void {
        event.stopPropagation();

        if (event.key === 'Enter') {
            event.preventDefault();
        }

        onKeyDown?.(event);
    }

    return (
        <span
            aria-activedescendant={activeDescendant}
            aria-controls={controls}
            aria-describedby={describedBy}
            aria-disabled={disabled}
            aria-invalid={invalid}
            aria-label={label}
            className="min-w-0 flex-1 whitespace-nowrap"
            contentEditable={disabled ? false : 'plaintext-only'}
            data-part="editable"
            data-placeholder={placeholder}
            id={id}
            onBlur={onBlur}
            onCompositionEnd={onCompositionEnd}
            onCompositionStart={onCompositionStart}
            onFocus={() => {
                focusedRef.current = true;
            }}
            onInput={onInput}
            onKeyDown={onKeyDownIn}
            onPaste={(event) => {
                event.preventDefault();

                const text = event.clipboardData.getData('text/plain');

                if (onPasteText?.(text) === true) {
                    pasteTakenRef.current = true;

                    return;
                }

                insertPlainText(event.currentTarget, text);
                report(event.currentTarget.textContent);
            }}
            ref={withEditableRef(editable, editableRef)}
            role={role}
            suppressContentEditableWarning
            tabIndex={disabled ? -1 : 0}
        />
    );
}
