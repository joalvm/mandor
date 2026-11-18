import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { readIconSources } from '../tools/read-icon-sources.mjs';
import { ICONS } from '../src/icon-registry.js';

function squash(value: string) {
    return value.replaceAll(/[\s,]+/g, ' ').trim();
}

describe('the generated geometry', () => {
    it('draws every intention exactly as the source the manifest cites', async () => {
        const { intentions } = await readIconSources();

        for (const [name, entry] of Object.entries(intentions)) {
            const Glyph = ICONS[name as keyof typeof ICONS];
            const { container, unmount } = render(<Glyph />);
            const drawn = [...container.querySelectorAll('path')].map((path) => ({
                d: squash(path.getAttribute('d') ?? ''),
                fillRule: path.getAttribute('fill-rule') ?? undefined,
            }));
            const dAttributes = [...entry.svg.matchAll(/\sd="([^"]+)"/g)].map(
                (match) => match[1] ?? '',
            );
            const rules = [...entry.svg.matchAll(/<path\b[^>]*>/g)].map(
                (element) => /\sfill-rule="(evenodd|nonzero)"/.exec(element[0])?.[1],
            );
            const owed = dAttributes.map((d, index) => ({ d: squash(d), fillRule: rules[index] }));

            unmount();

            expect(drawn, name).toEqual(owed);
        }
    });
});
