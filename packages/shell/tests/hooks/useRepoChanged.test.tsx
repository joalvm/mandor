import type { ChangedEntity } from '@mandor/schema';
import type { FakeBridge } from '@mandor/ipc/testing';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useRepoChanged } from '../../src/hooks/useRepoChanged.js';

type Mandor = { mandor: FakeBridge };

function bridge(): FakeBridge {
    return (window as unknown as Mandor).mandor;
}

const PAGOS: ChangedEntity = { area: 'collections', workspaceId: 'pagos', path: 'auth/login' };
const OTHER: ChangedEntity = { area: 'collections', workspaceId: 'otro', path: 'x' };

function Harness({ seen }: { seen: ChangedEntity[][] }) {
    useRepoChanged(
        (entity) => entity.area === 'collections' && entity.workspaceId === 'pagos',
        (changes) => seen.push(changes),
    );

    return <span />;
}

describe('useRepoChanged', () => {
    it('hands the view the entities it shows and only those', () => {
        const seen: ChangedEntity[][] = [];

        render(<Harness seen={seen} />);
        bridge().emitRepoChanged({ changes: [OTHER, PAGOS] });

        expect(seen).toEqual([[PAGOS]]);
    });

    it('says nothing when the push touches nothing the view shows', () => {
        const seen: ChangedEntity[][] = [];

        render(<Harness seen={seen} />);
        bridge().emitRepoChanged({ changes: [OTHER] });

        expect(seen).toEqual([]);
    });

    it('stops listening once the view is taken down', () => {
        const seen: ChangedEntity[][] = [];
        const view = render(<Harness seen={seen} />);

        view.unmount();
        bridge().emitRepoChanged({ changes: [PAGOS] });

        expect(seen).toEqual([]);
    });
});
