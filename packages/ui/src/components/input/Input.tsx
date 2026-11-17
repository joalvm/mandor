import type { KeyboardEvent, RefObject } from 'react';

import { DisabledControlTooltip } from '../tooltip/DisabledControlTooltip.js';
import { EditableLine } from './EditableLine.js';
import { FieldBox, type FieldVariant } from './FieldBox.js';
import { useFieldWiring } from './field-wiring.js';
import type { InputSegment } from '../../lib/paint-segments.js';

type InputProps = {
    /** The id of the option of a list the field walks while the focus stays in it. */
    activeDescendant?: string | undefined;
    className?: string | undefined;
    /** The id of the list the field narrows and walks. */
    controls?: string | undefined;
    describedBy?: string | undefined;
    disabled?: boolean | undefined;
    disabledReason?: string | undefined;
    /** Receives the editable span, so the caller can put the caret in it from outside React. */
    editableRef?: RefObject<HTMLSpanElement | null> | undefined;
    id?: string | undefined;
    invalid?: boolean | undefined;
    label: string;
    onValueChange: (value: string) => void;
    /** The keys the line receives, after it has handled its own. */
    onKeyDown?: ((event: KeyboardEvent<HTMLSpanElement>) => void) | undefined;
    /** Sees a paste before it lands; `true` means it took the text and nothing is inserted. */
    onPasteText?: ((text: string) => boolean) | undefined;
    placeholder?: string | undefined;
    segments?: readonly InputSegment[] | undefined;
    /** The unit the value is read in, written inside the box and never editable. */
    unit?: string | undefined;
    value: string;
    variant?: FieldVariant | undefined;
};

/**
 * One line of text, in the box that belongs to it.
 *
 * The field is the box and the line, and nothing else: there is no slot on either side. A field
 * that carried one would be as many fields as things callers thought to put in it, each with its
 * own spacing and its own answer to what a click on that spot does. When a field needs a glyph
 * the glyph is part of the field — see `SearchInput` — and it is written here, once, in the
 * component that owns it.
 *
 * Inside a `Field` the id, the message and the invalid state come from it; handed props win.
 */
export function Input({
    activeDescendant,
    className,
    controls,
    describedBy,
    disabled = false,
    disabledReason,
    editableRef,
    id,
    invalid,
    label,
    onValueChange,
    onKeyDown,
    onPasteText,
    placeholder,
    segments,
    unit,
    value,
    variant = 'text',
}: InputProps) {
    const wiring = useFieldWiring({ describedBy, id, invalid });

    return (
        <DisabledControlTooltip reason={disabled ? disabledReason : undefined}>
            <FieldBox
                className={className}
                disabled={disabled}
                invalid={wiring.invalid}
                variant={variant}
            >
                <EditableLine
                    activeDescendant={activeDescendant}
                    controls={controls}
                    describedBy={wiring.describedBy}
                    disabled={disabled}
                    editableRef={editableRef}
                    id={wiring.id}
                    invalid={wiring.invalid}
                    label={label}
                    onValueChange={onValueChange}
                    onKeyDown={onKeyDown}
                    onPasteText={onPasteText}
                    placeholder={placeholder}
                    segments={segments}
                    value={value}
                />
                <InputUnit unit={unit} />
            </FieldBox>
        </DisabledControlTooltip>
    );
}

function InputUnit({ unit }: { unit: InputProps['unit'] }) {
    if (unit === undefined) {
        return null;
    }

    return (
        <span aria-hidden="true" className="shrink-0 text-2xs text-text-secondary tabular">
            {unit}
        </span>
    );
}
