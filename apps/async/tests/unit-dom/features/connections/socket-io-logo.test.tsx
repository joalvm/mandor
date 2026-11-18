import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SocketIoLogo } from '../../../../src/renderer/features/connections/components/transport/SocketIoLogo.js';

describe('the mark of Socket.IO', () => {
    it('draws one filled svg of the house icon grid', () => {
        const { container } = render(<SocketIoLogo />);

        const mark = container.querySelector('svg');

        expect(mark).not.toBeNull();
        expect(mark).toHaveAttribute('viewBox', '0 0 16 16');
        expect(mark).toHaveAttribute('fill', 'currentColor');
    });

    it('hides itself from the reader and takes the size of the box it lands in', () => {
        const { container } = render(<SocketIoLogo className="size-full" />);

        const mark = container.querySelector('svg');

        expect(mark).toHaveAttribute('aria-hidden', 'true');
        expect(mark).toHaveAttribute('focusable', 'false');
        expect(mark).toHaveClass('size-full');
    });
});
