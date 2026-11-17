import { createLocalOrigin, createOrigin } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { originLinkTone } from '../../src/lib/origin-link-tone.js';

const LOCAL = createLocalOrigin('Local');
const TEAM = createOrigin({
    id: 'equipo',
    name: 'Equipo',
    url: 'https://github.com/equipo/api.git',
});

describe('the tone of the link of an origin', () => {
    it('is nothing for the local origin, and for a remote one not heard from yet', () => {
        expect(originLinkTone(LOCAL, { state: 'error', busy: false })).toBeUndefined();
        expect(originLinkTone(TEAM, null)).toBeUndefined();
    });

    it('is an error only when the synchronization failed: work to do is still a link', () => {
        expect(originLinkTone(TEAM, { state: 'error', busy: false })).toBe('error');
        expect(originLinkTone(TEAM, { state: 'conflict', busy: false })).toBe('success');
        expect(originLinkTone(TEAM, { state: 'diverged', busy: true })).toBe('success');
    });
});
