import { afterEach, describe, expect, it } from 'vitest';

import { originName } from '../src/origin-name.js';
import { shellStore } from '../src/shell-store.js';

afterEach(() => {
    shellStore.getState().reset();
});

describe('what the active origin is called', () => {
    it('is local while no origin is open', () => {
        expect(originName()).toBe('local');
    });

    it('is the name the origin was given', () => {
        shellStore.setState({
            activeOriginId: 'o-1',
            origins: [
                { id: 'local', kind: 'local', name: 'Local' },
                { id: 'o-1', kind: 'remote', name: 'Team' },
            ],
        });

        expect(originName()).toBe('Team');
    });

    it('falls back to the id of an origin the window has no name for', () => {
        shellStore.setState({ activeOriginId: 'o-9', origins: [] });

        expect(originName()).toBe('o-9');
    });
});
