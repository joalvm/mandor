import { TooltipProvider } from '@mandor/ui';
import { useEffect, useState, type ComponentType } from 'react';

import { ALL_PAGES, FOUNDATIONS, groupOf } from './nav.js';
import { PageSection } from './pieces/page-section.js';
import { LabShell } from './shell/lab-shell.js';
import { ShellBody } from './shell/shell-body.js';
import { ShellContent } from './shell/shell-content.js';
import { ShellHeader } from './shell/shell-header.js';
import { ShellSidebar } from './shell/shell-sidebar.js';
import { ThemeMenu } from './shell/theme-menu.js';
import { readStoredTheme, type ThemeChoice } from './theme.js';

function currentRoute(): string {
    const id = location.hash.split('/').at(-1) ?? '';

    return ALL_PAGES.some((candidate) => candidate.id === id)
        ? id
        : (FOUNDATIONS[0]?.id ?? 'overview');
}

/** La página abierta; ninguna si la ruta no nombra una. */
function OpenPage({ page: Page }: { page: ComponentType | undefined }) {
    if (Page === undefined) {
        return null;
    }

    return <Page />;
}

/**
 * The composition root of the platform: it owns the two states — which page is open, which
 * theme is chosen — and nests the shell pieces. Structure travels through the tree, like HTML;
 * only data travels through props.
 */
export function LabApp() {
    const [pageId, setPageId] = useState(currentRoute);
    const [theme, setTheme] = useState<ThemeChoice>(readStoredTheme);

    useEffect(() => {
        const followRoute = () => {
            setPageId(currentRoute());
        };

        window.addEventListener('hashchange', followRoute);

        return () => {
            window.removeEventListener('hashchange', followRoute);
        };
    }, []);

    const page = ALL_PAGES.find((candidate) => candidate.id === pageId) ?? FOUNDATIONS[0];
    const group = groupOf(page?.id ?? '');
    const Page: ComponentType | undefined = page?.component;

    return (
        <TooltipProvider>
            <LabShell>
                <ShellHeader activeRoot={group.root}>
                    <ThemeMenu
                        theme={theme}
                        onPick={(pick) => {
                            setTheme(pick);
                        }}
                    />
                </ShellHeader>
                <ShellBody>
                    <ShellSidebar activeId={page?.id ?? 'overview'} group={group} />
                    <ShellContent>
                        <PageSection value={group.label}>
                            <OpenPage page={Page} />
                        </PageSection>
                    </ShellContent>
                </ShellBody>
            </LabShell>
        </TooltipProvider>
    );
}
