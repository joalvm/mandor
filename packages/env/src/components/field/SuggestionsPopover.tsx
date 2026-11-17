import { useMessages } from '@mandor/i18n';
import { Popover, SuggestList, type PopoverAnchor } from '@mandor/ui';
import type { ReactNode, RefObject } from 'react';

import type { VariableSuggestions } from '../../hooks/useVariableSuggestions.js';

type SuggestionsPopoverProps = {
    /** The spot of the caret the list hangs from. */
    anchor: RefObject<PopoverAnchor | null>;
    suggestions: VariableSuggestions;
};

/** The names that still fit what is being written, hung from the caret while there are any. */
export function SuggestionsPopover({ anchor, suggestions }: SuggestionsPopoverProps): ReactNode {
    const messages = useMessages('environment');

    if (!suggestions.open) {
        return null;
    }

    return (
        <Popover anchor={anchor} modal={false} open>
            <SuggestList
                activeName={suggestions.active}
                label={messages('suggest')}
                onHighlight={suggestions.setActive}
                onPick={suggestions.pick}
                options={suggestions.options}
            />
        </Popover>
    );
}
