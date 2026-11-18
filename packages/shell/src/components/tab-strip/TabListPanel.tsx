import { useMessages, useTranslator } from '@mandor/i18n';
import { SearchInput } from '@mandor/ui';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';

import { nextHighlight } from '../../command/highlight-move.js';
import { leafOf } from '../../grid/grid-leaf.js';
import { useShellStore } from '../../hooks/useShellStore.js';
import { shellStore } from '../../shell-store.js';
import { listedTabs, type ListedTab } from '../../tab/tab-list.js';
import { tabTitleOf } from '../../tab/tab-title.js';
import type { Tab } from '../../tab/tab.js';
import { TabListLine } from './TabListLine.js';

const NO_TABS: readonly Tab[] = [];

type TabListSectionProps = {
    groupId: string;
    highlight: number;
    label: string;
    lines: readonly ListedTab[];
    /** Where the section starts among all the lines, which is what the highlight counts. */
    offset: number;
    onChoose: (line: ListedTab) => void;
};

/** The open tabs, or the closed ones, under their name; nothing when there is none to list. */
function TabListSection({
    groupId,
    highlight,
    label,
    lines,
    offset,
    onChoose,
}: TabListSectionProps) {
    if (lines.length === 0) {
        return null;
    }

    return (
        <div aria-label={label} role="group">
            <span className="block px-pad-control py-1 text-2xs text-text-secondary uppercase">
                {label}
            </span>
            {lines.map((line, index) => (
                <TabListLine
                    groupId={groupId}
                    key={line.tab.id}
                    line={line}
                    onChoose={onChoose}
                    selected={offset + index === highlight}
                />
            ))}
        </div>
    );
}

type TabListPanelProps = { groupId: string; onDone: () => void };

/**
 * Narrows the tabs of a group and what left the window lately with what is typed, and puts in
 * front, or brings back, whatever ends up highlighted. Typing goes to the field and the arrows
 * walk the lines, as in the palette.
 */
export function TabListPanel({ groupId, onDone }: TabListPanelProps) {
    const messages = useMessages('shell');
    const translate = useTranslator();
    const open = useShellStore((state) => leafOf(state.grid, groupId)?.tabs ?? NO_TABS);
    const closed = useShellStore((state) => state.closedTabs);
    const [highlight, setHighlight] = useState(0);
    const [query, setQuery] = useState('');
    const field = useRef<HTMLSpanElement>(null);
    const lines = useMemo(
        () => listedTabs(open, closed, query, (tab) => tabTitleOf(tab, translate)),
        [closed, open, query, translate],
    );
    const opened = lines.filter((line) => !line.closed);

    useEffect(() => {
        field.current?.focus();
    }, []);

    function choose(line: ListedTab | undefined): void {
        if (line === undefined) {
            return;
        }

        if (line.closed) {
            shellStore.getState().reopenTab(line.tab.id);
        } else {
            shellStore.getState().setActiveTab(groupId, line.tab.id);
        }

        onDone();
    }

    /** Captured on the way down: the field stops every key it sees. */
    function onKeys(event: KeyboardEvent<HTMLDivElement>): void {
        if (event.key === 'Enter') {
            event.preventDefault();
            choose(lines[highlight]);

            return;
        }

        const moved = nextHighlight(event.key, highlight, lines.length);

        if (moved !== null) {
            event.preventDefault();
            setHighlight(moved);
        }
    }

    return (
        <div
            className="flex flex-col gap-gap-control"
            data-part="tab-list"
            onKeyDownCapture={onKeys}
        >
            <SearchInput
                editableRef={field}
                label={messages('searchTabs')}
                onValueChange={(value) => {
                    setQuery(value);
                    setHighlight(0);
                }}
                placeholder={messages('searchTabs')}
                value={query}
            />
            <div
                aria-label={messages('listTabs')}
                className="max-h-80 overflow-y-auto"
                role="listbox"
            >
                <NoTabs empty={lines.length === 0} />
                <TabListSection
                    groupId={groupId}
                    highlight={highlight}
                    label={messages('openTabs')}
                    lines={opened}
                    offset={0}
                    onChoose={choose}
                />
                <TabListSection
                    groupId={groupId}
                    highlight={highlight}
                    label={messages('recentlyClosed')}
                    lines={lines.slice(opened.length)}
                    offset={opened.length}
                    onChoose={choose}
                />
            </div>
        </div>
    );
}

function NoTabs({ empty }: { empty: boolean }) {
    const messages = useMessages('shell');

    if (!empty) {
        return null;
    }

    return <p className="px-pad-control py-2 text-sm text-text-secondary">{messages('noTabs')}</p>;
}
