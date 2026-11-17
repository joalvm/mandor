import { byPart } from '@mandor/ui/testing';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppIcon } from '../../../src/components/title-bar/AppIcon.js';

const SOURCE = 'data:image/png;base64,iVBORw0KGgo=';

function renderIcon(options: { mac?: boolean } = {}) {
    if (options.mac === true) {
        Object.defineProperty(window.navigator, 'userAgent', {
            configurable: true,
            value: 'Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15',
        });
    }

    return render(<AppIcon src={SOURCE} />);
}

describe('the application icon of the title row', () => {
    /** The name of the app is the window's title already; the icon only says it again. */
    it('shows the icon the app hands it, as decoration a reader skips', () => {
        renderIcon();

        expect(byPart('app-icon')).toHaveAttribute('src', SOURCE);
        expect(screen.queryByRole('img')).toBeNull();
    });

    it('leaves the corner to the traffic lights on macOS', () => {
        const view = renderIcon({ mac: true });

        expect(view.container.querySelector('img')).toBeNull();
    });
});
