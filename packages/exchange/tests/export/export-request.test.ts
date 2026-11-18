import { describe, expect, it, vi } from 'vitest';

import { onExportRequested, requestExport } from '../../src/export/lib/export-request.js';

describe('the doorbell of the collection export', () => {
    it('tells whoever listens which collection asked to leave', () => {
        const heard = vi.fn();
        const stop = onExportRequested(heard);

        requestExport({ collection: 'pedidos' });
        stop();

        expect(heard).toHaveBeenCalledWith({ collection: 'pedidos' });
    });

    it('stops telling a listener that walked away', () => {
        const heard = vi.fn();

        onExportRequested(heard)();
        requestExport({ collection: 'pedidos' });

        expect(heard).not.toHaveBeenCalled();
    });
});
