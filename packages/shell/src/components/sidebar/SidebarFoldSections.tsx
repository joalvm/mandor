import { useMessages } from '@mandor/i18n';
import { IconButton } from '@mandor/ui';

import { useDeclaredList } from '../../declare/useDeclared.js';
import { useShellStore } from '../../hooks/useShellStore.js';
import { sidebarSectionDeclarations } from '../../sidebar/sidebar-section-registry.js';

/**
 * Folds every section of the lateral at once, and whatever each one holds folds with it, so only
 * their headers are left to pick from. It stands at the end of the header, beside the field, and
 * opens nothing back: each section opens again from its own header, on its first level.
 */
export function SidebarFoldSections() {
    const messages = useMessages('shell');
    const sections = useDeclaredList(sidebarSectionDeclarations);
    const setPanels = useShellStore((state) => state.setPanels);

    return (
        <IconButton
            icon="collapse-all"
            iconSize="sm"
            label={messages('foldSections')}
            onClick={() => {
                for (const section of sections) {
                    section.onFold?.();
                }

                setPanels({ collapsedSections: sections.map((section) => section.id) });
            }}
        />
    );
}
