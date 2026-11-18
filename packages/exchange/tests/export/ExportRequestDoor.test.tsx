import { act, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ExportRequestDoor } from '../../src/export/components/dialog/ExportRequestDoor.js';
import { requestExport } from '../../src/export/lib/export-request.js';

describe('the door of a collection export', () => {
    it('opens the export on the collection whose line rang', () => {
        const onOpen = vi.fn();

        render(<ExportRequestDoor onOpen={onOpen} />);
        act(() => {
            requestExport({ collection: 'pedidos' });
        });

        expect(onOpen).toHaveBeenCalledWith('pedidos');
    });

    it('stops listening when it leaves the window', () => {
        const onOpen = vi.fn();
        const view = render(<ExportRequestDoor onOpen={onOpen} />);

        view.unmount();
        requestExport({ collection: 'pedidos' });

        expect(onOpen).not.toHaveBeenCalled();
    });
});
