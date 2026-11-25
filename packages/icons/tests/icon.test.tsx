import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Icon } from '../src/icon.js';
import { ICONS } from '../src/icon-registry.js';
import type { IconName } from '../src/icon-name.js';

/** The dynamic door: a name that arrived in data draws its registry component. */
describe('Icon', () => {
    it('resolves a data name to its component at the requested size', () => {
        const { container } = render(<Icon name="folder" size="lg" />);
        const svg = container.querySelector('svg');

        expect(svg).toHaveAttribute('data-part', 'icon');
        expect(svg).toHaveAttribute('width', '24');
        expect(svg?.querySelector('path')).not.toBeNull();
    });

    it('gives every registry name a component', () => {
        const names = Object.keys(ICONS) as IconName[];

        expect(names).toHaveLength(90);

        for (const name of names) {
            expect(typeof ICONS[name], name).toBe('function');
        }
    });

    it('resolves a stable name to a stable component', () => {
        expect(ICONS.folder).toBe(ICONS.folder);
    });
});
