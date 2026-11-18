import { ArrowInboundIcon, ArrowOutboundIcon, ErrorIcon, WarningIcon } from '@mandor/icons';
import { useMessages } from '@mandor/i18n';
import {
    IconButton,
    Menu,
    MenuContent,
    MenuItem,
    MenuSeparator,
    MenuTrigger,
    SearchInput,
} from '@mandor/ui';

import {
    RESTING_NARROWING,
    type TimelineNarrowing,
    type TimelineSides,
} from '../../lib/timeline-narrowing.js';

type ActivityHeadProps = {
    /** False while the timeline holds nothing: there would be nothing to act on. */
    exportable: boolean;
    narrowing: TimelineNarrowing;
    /** Clears what the timeline holds, where the entries come from. */
    onClear: () => void;
    onNarrowingChange: (next: TimelineNarrowing) => void;
    /** Writes the timeline out of the app, where the user says. */
    onExport: () => void;
};

/**
 * The head of the timeline: what it draws, written small — a filter that hides whole sides,
 * keeps only what breaks its schema, and the line the search asks for, and the two actions on
 * what the timeline holds. The state of the head is the panel's: this reads it and says what
 * changed, and the timeline draws the answer.
 */
export function ActivityHead({
    exportable,
    narrowing,
    onClear,
    onNarrowingChange,
    onExport,
}: ActivityHeadProps) {
    const messages = useMessages('connections');
    const sides = narrowing.sides;
    const nothingHidden =
        narrowing.query.trim() === '' &&
        !narrowing.schemaOnly &&
        sides.inbound &&
        sides.other &&
        sides.outbound;

    function toggleSide(side: keyof TimelineSides): () => void {
        return () => {
            onNarrowingChange({ ...narrowing, sides: { ...sides, [side]: !sides[side] } });
        };
    }

    function toggleSchemaOnly(): void {
        onNarrowingChange({ ...narrowing, schemaOnly: !narrowing.schemaOnly });
    }

    return (
        <div
            className="flex h-header shrink-0 items-center justify-between gap-gap-control px-pad-panel"
            data-part="activity-head"
        >
            <span
                className="shrink-0 text-xs font-semibold tracking-wide text-text-secondary uppercase"
                data-part="activity-head-title"
            >
                {messages('activityLog')}
            </span>
            <div className="flex items-center gap-gap-control" data-part="activity-head-actions">
                <Menu checkable>
                    <MenuTrigger>
                        <IconButton icon="filter" label={messages('filter')} size="md" />
                    </MenuTrigger>
                    <MenuContent>
                        <MenuItem checked={sides.inbound} onSelect={toggleSide('inbound')}>
                            <span
                                aria-hidden="true"
                                className="flex shrink-0 items-center text-text-success"
                            >
                                <ArrowInboundIcon size="sm" />
                            </span>
                            {messages('directionIn')}
                        </MenuItem>
                        <MenuItem checked={sides.outbound} onSelect={toggleSide('outbound')}>
                            <span
                                aria-hidden="true"
                                className="flex shrink-0 items-center text-text-info"
                            >
                                <ArrowOutboundIcon size="sm" />
                            </span>
                            {messages('directionOut')}
                        </MenuItem>
                        <MenuItem checked={sides.other} onSelect={toggleSide('other')}>
                            <span
                                aria-hidden="true"
                                className="flex shrink-0 items-center text-text-error"
                            >
                                <ErrorIcon size="sm" />
                            </span>
                            {messages('stateError')}
                        </MenuItem>
                        <MenuSeparator />
                        <MenuItem checked={narrowing.schemaOnly} onSelect={toggleSchemaOnly}>
                            <span
                                aria-hidden="true"
                                className="flex shrink-0 items-center text-text-warning"
                            >
                                <WarningIcon size="sm" />
                            </span>
                            {messages('filterSchemaOnly')}
                        </MenuItem>
                        <MenuSeparator />
                        <MenuItem
                            disabled={nothingHidden}
                            onSelect={() => {
                                onNarrowingChange({ ...RESTING_NARROWING });
                            }}
                        >
                            {messages('filterShowAll')}
                        </MenuItem>
                    </MenuContent>
                </Menu>
                <SearchInput
                    className="w-33 shrink-0"
                    label={messages('search')}
                    onValueChange={(query) => {
                        onNarrowingChange({ ...narrowing, query });
                    }}
                    placeholder={messages('search')}
                    value={narrowing.query}
                />
                <IconButton
                    disabled={!exportable}
                    icon="external-link"
                    label={messages('export')}
                    onClick={onExport}
                    size="md"
                />
                <IconButton
                    disabled={!exportable}
                    icon="delete"
                    label={messages('clear')}
                    onClick={onClear}
                    size="md"
                />
            </div>
        </div>
    );
}
