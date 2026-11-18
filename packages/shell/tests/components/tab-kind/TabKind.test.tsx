import { act, cleanup, render, renderHook, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { TabBody } from '../../../src/components/tab-kind/TabBody.js';
import { TabIndicator } from '../../../src/components/tab-kind/TabIndicator.js';
import { TabKind } from '../../../src/components/tab-kind/TabKind.js';
import { TabStatus } from '../../../src/components/tab-kind/TabStatus.js';
import { useTabPart } from '../../../src/components/tab-kind/useTabPart.js';
import { useTab } from '../../../src/hooks/useTab.js';
import { useTabKind } from '../../../src/hooks/useTabKind.js';
import { TabProvider } from '../../../src/tab/tab-context.js';
import { tabKind, tabKindOf } from '../../../src/tab/tab-kind-registry.js';
import { DrawnTabPart, translatorIn } from '../../../src/testing/tab-kind.js';

afterEach(() => {
    cleanup();
});

/** What a part shows of the tab it is drawn for, read from the tab-context and not from props. */
function ShownTab() {
    const { resource, tabId } = useTab();

    return (
        <p>
            {tabId} · {resource}
        </p>
    );
}

function DocKind({ title = 'Doc' }: { title?: string }) {
    return (
        <TabKind closable icon="file" id="doc" title={() => title}>
            <TabIndicator>
                <span>marca</span>
            </TabIndicator>
            <TabBody>
                <ShownTab />
            </TabBody>
            <TabStatus>
                <span>estado</span>
            </TabStatus>
        </TabKind>
    );
}

describe('a kind of tab declared in the tree', () => {
    it('is known to the window while it is mounted, with its logic and its parts', () => {
        const view = render(<DocKind />);
        const spec = tabKindOf('doc');

        expect(spec.closable).toBe(true);
        expect(spec.title('mandor://doc', translatorIn())).toBe('Doc');
        expect(spec.body).toBeDefined();
        expect(spec.indicator).toBeDefined();
        expect(spec.status).toBeDefined();

        view.unmount();

        expect(tabKind('doc')).toBeUndefined();
        expect(() => tabKindOf('doc')).toThrow('Tab kind is not declared: doc');
    });

    it('takes the logic of the latest render, so a prop that changes is not left behind', () => {
        const view = render(<DocKind title="Uno" />);

        view.rerender(<DocKind title="Dos" />);

        expect(tabKindOf('doc').title('mandor://doc', translatorIn())).toBe('Dos');
    });

    it('draws each part inside the tab it belongs to', () => {
        render(
            <>
                <DocKind />
                <DrawnTabPart kind="doc" resource="mandor://local/one.md" tabId="one" />
                <DrawnTabPart kind="doc" part="indicator" resource="mandor://x" tabId="x" />
                <DrawnTabPart kind="doc" part="status" resource="mandor://x" tabId="x" />
            </>,
        );

        expect(screen.getByText('one · mandor://local/one.md')).toBeVisible();
        expect(screen.getByText('marca')).toBeVisible();
        expect(screen.getByText('estado')).toBeVisible();
    });

    it('is followed by useTabKind, which redraws when the kind comes and goes', () => {
        const watched = renderHook(() => useTabKind('doc'));

        expect(watched.result.current).toBeUndefined();

        const view = render(<DocKind />);

        expect(watched.result.current?.id).toBe('doc');

        act(() => {
            view.unmount();
        });

        expect(watched.result.current).toBeUndefined();
    });

    /** Two roots declaring one id: the one that leaves takes only its own declaration. */
    it('leaves alone a later declaration of the same id when the earlier one unmounts', () => {
        const first = render(<DocKind title="Primero" />);

        render(<DocKind title="Segundo" />);
        first.unmount();

        expect(tabKindOf('doc').title('mandor://doc', translatorIn())).toBe('Segundo');
    });
});

describe('the pieces that read the tab', () => {
    it('answer with the tab the provider names', () => {
        const { result } = renderHook(() => useTab(), {
            wrapper: ({ children }) => (
                <TabProvider value={{ resource: 'mandor://r', tabId: 't' }}>{children}</TabProvider>
            ),
        });

        expect(result.current).toMatchObject({
            preview: false,
            resource: 'mandor://r',
            tabId: 't',
        });
    });

    it('refuse to answer outside a tab', () => {
        expect(() => {
            renderHook(() => useTab());
        }).toThrow('useTab is only read inside a tab');
    });

    it('refuse a part declared outside a kind', () => {
        expect(() => {
            renderHook(() => {
                useTabPart('body', null);
            });
        }).toThrow('A tab body is declared inside a TabKind.');
    });
});
