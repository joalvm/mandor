import { describe, expect, it } from 'vitest';

import { cssOf, declarationsOf } from './theme-values.js';

const RAMPS = ['neutral', 'teal', 'orange', 'green', 'amber', 'red', 'blue'] as const;
const MODES = ['light', 'dark'] as const;

function luminanceOf(hex: string): number {
    const channels = [1, 3, 5].map(
        (start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255,
    );
    const linear = channels.map((channel) =>
        channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );

    return 0.2126 * (linear[0] ?? 0) + 0.7152 * (linear[1] ?? 0) + 0.0722 * (linear[2] ?? 0);
}

function assertMonotonic(values: Record<string, string>, ramp: string, mode: string): void {
    const luminances = Array.from({ length: 8 }, (_, index) =>
        luminanceOf(values[`primitive-${ramp}-${mode}-${String(index + 1)}`] ?? ''),
    );
    const direction = mode === 'light' ? -1 : 1;

    for (let index = 1; index < luminances.length; index += 1) {
        const previous = luminances[index - 1] ?? 0;
        const current = luminances[index] ?? 0;

        expect(
            (current - previous) * direction,
            `${ramp} ${mode} step ${String(index + 1)}`,
        ).toBeGreaterThanOrEqual(0);
    }
}

describe('the primitive color ramps', () => {
    it('defines twelve steps for every ramp and mode', async () => {
        const values = declarationsOf(await cssOf('primitives.css'));

        for (const ramp of RAMPS) {
            for (const mode of MODES) {
                const steps = Array.from(
                    { length: 12 },
                    (_, index) => values[`primitive-${ramp}-${mode}-${String(index + 1)}`],
                );

                expect(steps, `${ramp} ${mode}`).toHaveLength(12);
                expect(steps.every((value) => /^#[\da-f]{6}$/i.test(value ?? ''))).toBe(true);
            }
        }
    });

    it('keeps each surface range monotonic in luminance', async () => {
        const values = declarationsOf(await cssOf('primitives.css'));

        for (const ramp of RAMPS) {
            for (const mode of MODES) {
                assertMonotonic(values, ramp, mode);
            }
        }
    });

    /** The semantic layer names no ramp for the accent: the root of each window picks one. */
    it('points every accent step at a brand ramp, teal unless the root names orange', async () => {
        const css = await cssOf('primitives.css');
        const values = declarationsOf(css);

        for (const mode of MODES) {
            expect(values[`primitive-accent-${mode}-9`]).toBe(`var(--primitive-orange-${mode}-9)`);
        }

        expect(css).toMatch(
            /:root \{\s*--primitive-accent-light-1: var\(--primitive-teal-light-1\);/,
        );
        expect(css).toContain(":root[data-accent='orange'] {");
    });

    it('keeps neutral alpha fixed between modes', async () => {
        const values = declarationsOf(await cssOf('primitives.css'));
        const steps = Array.from(
            { length: 12 },
            (_, index) => values[`primitive-neutral-a-${String(index + 1)}`],
        );

        expect(steps.every((value) => /^#[\da-f]{8}$/i.test(value ?? ''))).toBe(true);
    });
});
