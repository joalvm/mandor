import { createLocalOrigin, createOrigin } from '@mandor/schema';
import { describe, expect, it } from 'vitest';

import { healthDotState, originHealthOf } from '../src/lib/origin-health.js';

const LOCAL = createLocalOrigin('Local');
const TEAM = createOrigin({ id: 'team', name: 'Team', url: 'https://github.com/team/api.git' });

describe('the health of an origin (originHealthOf)', () => {
    it('says the local one is available without asking anyone', () => {
        expect(originHealthOf(LOCAL, undefined)).toBe('available');
    });

    it('says a remote one is being checked until an answer lands', () => {
        expect(originHealthOf(TEAM, undefined)).toBe('checking');
        expect(originHealthOf(TEAM, 'checking')).toBe('checking');
    });

    it('answers with what the check answered', () => {
        expect(originHealthOf(TEAM, true)).toBe('reachable');
        expect(originHealthOf(TEAM, false)).toBe('unreachable');
    });
});

describe('the dot an origin health paints (healthDotState)', () => {
    it('paints both quiet answers green and the check amber', () => {
        expect(healthDotState('available')).toBe('connected');
        expect(healthDotState('reachable')).toBe('connected');
        expect(healthDotState('checking')).toBe('connecting');
        expect(healthDotState('unreachable')).toBe('error');
    });
});
