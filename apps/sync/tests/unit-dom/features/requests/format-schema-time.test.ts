import { describe, expect, it } from 'vitest';

import { formatSchemaTime } from '../../../../src/renderer/features/requests/lib/format-schema-time.js';

const NOW = new Date(2026, 8, 15, 18, 0);

describe('the time of a schema', () => {
    it('is the hour alone when the schema came today', () => {
        const today = new Date(2026, 8, 15, 14, 2).toISOString();

        expect(formatSchemaTime(today, 'en', NOW)).toMatch(/^0?2:02\s?PM$/);
    });

    it('carries the day when the schema is older, so an old one never reads as fresh', () => {
        const older = new Date(2026, 8, 3, 14, 2).toISOString();

        expect(formatSchemaTime(older, 'en', NOW)).toMatch(/Sep 3/);
        expect(formatSchemaTime(older, 'es', NOW)).toMatch(/3 sept/);
    });
});
