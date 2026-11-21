import { useTranslator } from '@mandor/i18n';
import { Collapsible, CollapsibleBody, CollapsibleHeader } from '@mandor/ui';
import { useMemo } from 'react';

import { useDeclaredList } from '../../declare/useDeclared.js';
import { withFolded } from '../../sidebar/folded-sections.js';
import {
    sidebarSectionDeclarations,
    sidebarSectionsInOrder,
} from '../../sidebar/sidebar-section-registry.js';
import { FaultBoundary } from '../fault/FaultBoundary.js';
import { SidebarSectionIdContext } from './sidebar-section-context.js';

type SidebarSectionsProps = {
    collapsed: readonly string[];
    onCollapsedChange: (ids: string[]) => void;
};

/**
 * Draws whatever registered a section, and nothing it knows by name. Which ones are folded
 * belongs to the session, so this only reports the change to whoever writes it down.
 *
 * Nothing is resized by hand: a section is as tall as what it holds, up to a cap past which its
 * body scrolls, and the one that fills takes whatever height the others leave, even when it
 * holds a single row. No line sets one section apart from the next: its header does. The header
 * and the body are written here, one after the other, so the section reads as the two bands it is.
 * What a section puts beside its title and what it puts under it are both the section's own:
 * they arrive from the registry, which is how code the shell cannot import gets to draw inside
 * it: each feature declares its `SidebarSection` in the tree.
 */
export function SidebarSections({ collapsed, onCollapsedChange }: SidebarSectionsProps) {
    const translate = useTranslator();
    const declared = useDeclaredList(sidebarSectionDeclarations);
    const sections = useMemo(() => sidebarSectionsInOrder(declared), [declared]);

    return (
        <div className="flex min-h-0 flex-1 flex-col" data-part="sidebar-sections">
            {sections.map((section) => {
                const open = !collapsed.includes(section.id);

                return (
                    <div
                        className="flex min-h-0 flex-col"
                        data-fills={String(open && section.fills === true)}
                        data-part="sidebar-slot"
                        key={section.id}
                    >
                        <SidebarSectionIdContext value={section.id}>
                            <Collapsible
                                onOpenChange={(opened) => {
                                    if (!opened) {
                                        section.onFold?.();
                                    }

                                    onCollapsedChange(withFolded(collapsed, section.id, opened));
                                }}
                                open={open}
                            >
                                <CollapsibleHeader title={translate(section.title)}>
                                    {section.actions}
                                </CollapsibleHeader>
                                <CollapsibleBody>
                                    <FaultBoundary scope="section">{section.body}</FaultBoundary>
                                </CollapsibleBody>
                            </Collapsible>
                        </SidebarSectionIdContext>
                    </div>
                );
            })}
        </div>
    );
}
