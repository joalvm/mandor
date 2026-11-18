import { shellStore } from '@mandor/shell';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { duplicateExampleRow } from '../../src/lib/duplicate-example-row.js';

import {
    declareRequestWithExamples,
    EXAMPLE_CREADO,
    exampleSpies,
    WITH_EXAMPLES,
} from '../support/login-with-examples.js';

let undo: () => void = () => undefined;

beforeEach(() => {
    shellStore.getState().reset();
    shellStore.getState().setOrigins([{ id: 'local', name: 'Local APIs', kind: 'local' }]);
    shellStore.setState({ activeOriginId: 'local', activeWorkspaceId: 'events' });
});

afterEach(() => {
    undo();
    shellStore.getState().reset();
});

describe('duplicating the example that is taken', () => {
    it('duplicates it, and says it did, when it is the one thing taken', () => {
        const spies = exampleSpies();

        undo = declareRequestWithExamples(spies);

        expect(duplicateExampleRow('events', WITH_EXAMPLES, ['acceso/login:Creado'])).toBe(true);
        expect(spies.duplicate).toHaveBeenCalledWith(EXAMPLE_CREADO);
    });

    it('does nothing for many lines, for a node, or for nothing', () => {
        const spies = exampleSpies();

        undo = declareRequestWithExamples(spies);

        expect(
            duplicateExampleRow('events', WITH_EXAMPLES, [
                'acceso/login:Creado',
                'acceso/login:Roto',
            ]),
        ).toBe(false);
        expect(duplicateExampleRow('events', WITH_EXAMPLES, ['acceso/login'])).toBe(false);
        expect(duplicateExampleRow('events', WITH_EXAMPLES, [])).toBe(false);
        expect(duplicateExampleRow('events', WITH_EXAMPLES, ['acceso:Creado'])).toBe(false);
        expect(spies.duplicate).not.toHaveBeenCalled();
    });

    it('does nothing when the kind declared no examples', () => {
        undo = declareRequestWithExamples(undefined);

        expect(duplicateExampleRow('events', WITH_EXAMPLES, ['acceso/login:Creado'])).toBe(false);
    });
});
