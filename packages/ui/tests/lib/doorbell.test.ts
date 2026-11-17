import { describe, expect, it, vi } from 'vitest';

import { createDoorbell } from '../../src/lib/doorbell.js';

describe('a doorbell between two parts of the window that cannot import each other', () => {
    it('hands each ring to every part listening at that moment', () => {
        const bell = createDoorbell<{ collection: string }>();
        const first = vi.fn();
        const second = vi.fn();
        const stops = [bell.listen(first), bell.listen(second)];

        bell.ring({ collection: 'pedidos' });
        stops.forEach((stop) => {
            stop();
        });

        expect(first).toHaveBeenCalledWith({ collection: 'pedidos' });
        expect(second).toHaveBeenCalledWith({ collection: 'pedidos' });
    });

    it('stops telling a listener that walked away, and keeps telling the rest', () => {
        const bell = createDoorbell<null>();
        const gone = vi.fn();
        const staying = vi.fn();
        const stay = bell.listen(staying);

        bell.listen(gone)();
        bell.ring(null);
        stay();

        expect(gone).not.toHaveBeenCalled();
        expect(staying).toHaveBeenCalledOnce();
    });

    it('tells a handler listening twice twice, as two listeners', () => {
        const bell = createDoorbell<null>();
        const heard = vi.fn();
        const stops = [bell.listen(heard), bell.listen(heard)];

        bell.ring(null);
        stops.forEach((stop) => {
            stop();
        });

        expect(heard).toHaveBeenCalledTimes(2);
    });

    it('rings the parts listening when it rang, not one a handler added on hearing it', () => {
        const bell = createDoorbell<null>();
        const late = vi.fn();
        const stops: (() => void)[] = [];

        stops.push(
            bell.listen(() => {
                stops.push(bell.listen(late));
            }),
        );
        bell.ring(null);
        stops.forEach((stop) => {
            stop();
        });

        expect(late).not.toHaveBeenCalled();
    });
});
