import { SearchIcon } from '@mandor/icons';
import type { RefObject } from 'react';

import { EditableLine } from './EditableLine.js';
import { FieldBox } from './FieldBox.js';

type SearchInputProps = {
    className?: string | undefined;
    /** Receives the editable span, so the caller can put the caret in it from outside React. */
    editableRef?: RefObject<HTMLSpanElement | null> | undefined;
    label: string;
    onValueChange: (value: string) => void;
    placeholder?: string | undefined;
    value: string;
};

/**
 * The field a list is narrowed with: one line of text behind the glyph that says so.
 *
 * The glyph is not a decoration the caller chose to hang on a plain field, it is what tells this
 * field apart from every other one-line field in the window. So it is drawn here and it is not
 * optional — a search field without it is a search field nobody recognises, and a field that took
 * it as a prop would be two components sharing a name. It draws its line like every field and
 * keeps the ground of whatever holds it.
 */
export function SearchInput({
    className,
    editableRef,
    label,
    onValueChange,
    placeholder,
    value,
}: SearchInputProps) {
    return (
        <FieldBox className={className} disabled={false} invalid={false} variant="search">
            <SearchIcon size="sm" />
            <EditableLine
                disabled={false}
                editableRef={editableRef}
                invalid={false}
                label={label}
                onValueChange={onValueChange}
                placeholder={placeholder}
                role="searchbox"
                value={value}
            />
        </FieldBox>
    );
}
