import { useMessages } from '@mandor/i18n';
import type { ConflictDetail } from '@mandor/ipc';
import { conflictIdOf, useTab } from '@mandor/shell';
import { EmptyState } from '@mandor/ui';
import { useState, type ReactNode } from 'react';
import { useStore } from 'zustand';

import { useCloseConflict } from '../../hooks/useCloseConflict.js';
import { useConflictDetail } from '../../hooks/useConflictDetail.js';
import { conflictDrafts, type ConflictChoices } from '../../lib/conflict-drafts.js';
import { allAnswered, itemsOf, sectionsOf } from '../../lib/conflict-sections.js';
import { sectionTitle } from '../../lib/section-title.js';
import { LeaveConflictDialog } from '../dialog/LeaveConflictDialog.js';
import { ConflictActions } from './ConflictActions.js';
import { ConflictHeader } from './ConflictHeader.js';
import { ConflictStep } from './ConflictStep.js';

const NO_CHOICES: ConflictChoices = {};

type ConflictBoardProps = { detail: ConflictDetail; tabId: string };

/** The clash opened: one part of the entity at a time, with the way between them at the foot. */
function ConflictBoard({ detail, tabId }: ConflictBoardProps) {
    const messages = useMessages('conflicts');
    const [position, setPosition] = useState(0);
    const choices = useStore(conflictDrafts, (state) => state.choices[tabId]) ?? NO_CHOICES;
    const answered = (id: string): boolean => id in choices;
    const closing = useCloseConflict(detail.id, tabId, choices);
    const sections = sectionsOf(detail.conflicts);
    const index = Math.max(0, Math.min(position, sections.length - 1));
    const section = sections[index];
    const items = section === undefined ? [] : itemsOf(section);
    const part = sectionTitle(messages, section?.key ?? '');

    return (
        <section
            aria-label={messages('tabTitle')}
            className="flex h-full min-h-0 min-w-0 flex-col"
            data-part="conflict-tab"
        >
            <ConflictHeader
                current={index + 1}
                name={detail.name}
                part={part}
                total={sections.length}
            />
            <div className="min-h-0 flex-1 overflow-y-auto p-pad-panel">
                <ConflictStep
                    choices={choices}
                    items={items}
                    key={section?.key}
                    onChoose={(itemId, choice) => {
                        conflictDrafts.getState().choose(tabId, itemId, choice);
                    }}
                    onClear={(itemId) => {
                        conflictDrafts.getState().clear(tabId, itemId);
                    }}
                    title={part}
                />
            </div>
            <ConflictActions
                busy={closing.busy}
                complete={allAnswered(detail.conflicts, answered)}
                index={index}
                onKeepMine={closing.keepMine}
                onNext={() => {
                    setPosition(index + 1);
                }}
                onPrevious={() => {
                    setPosition(index - 1);
                }}
                onResolve={closing.resolve}
                stepDone={allAnswered(items, answered)}
                total={sections.length}
                unresolved={detail.conflicts.filter((item) => !answered(item.id)).length}
            />
            <LeaveConflictDialog tabId={tabId} />
        </section>
    );
}

/**
 * The tab of one clash. It reads the clash its resource names and draws it by the shape of its
 * questions, never by the kind of thing that clashed — so a request, a message, an environment
 * and a doc are answered the same way. A clash that is no longer there says so and offers
 * nothing to answer.
 */
export function ConflictTab() {
    const { resource, tabId } = useTab();
    const messages = useMessages('conflicts');
    const read = useConflictDetail(conflictIdOf(resource));

    if (read.state === 'ready') {
        return <ConflictBoard detail={read.detail} tabId={tabId} />;
    }

    // While there is no clash to answer: the tab waits for it, or says it is no longer there.
    const absent: Readonly<Record<typeof read.state, ReactNode>> = {
        loading: <div className="h-full min-h-0" data-part="conflict-tab" />,
        gone: (
            <EmptyState
                description={messages('gone')}
                icon="warning"
                title={messages('goneTitle')}
            />
        ),
    };

    return absent[read.state];
}
