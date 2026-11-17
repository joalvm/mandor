import { describe, expect, it, vi } from 'vitest';

import { notifyImported, onImported } from '../../src/import/lib/imported-signal.js';

describe('the imported signal', () => {
    it('reaches the listeners when an import lands', () => {
        const heard = vi.fn();

        onImported(heard);
        notifyImported();

        expect(heard).toHaveBeenCalledTimes(1);
    });

    it('stops reaching a listener that walked away', () => {
        const heard = vi.fn();
        const stop = onImported(heard);

        stop();
        notifyImported();

        expect(heard).not.toHaveBeenCalled();
    });
});
