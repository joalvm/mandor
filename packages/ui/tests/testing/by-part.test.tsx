import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { allByPart, byPart } from '../../src/testing/by-part.js';

function Rows() {
    return (
        <div>
            <div data-part="first-group">
                <span data-part="row">one</span>
            </div>
            <div data-part="second-group">
                <span data-part="row">two</span>
                <span data-part="row">three</span>
            </div>
        </div>
    );
}

describe('selecting by the part a component marks', () => {
    it('finds the node carrying the part', () => {
        render(<Rows />);

        expect(byPart('first-group')).toHaveTextContent('one');
    });

    it('returns every node carrying the part, in the order of the document', () => {
        render(<Rows />);

        expect(allByPart('row').map((node) => node.textContent)).toEqual(['one', 'two', 'three']);
    });

    /** A container is looked up to be looked inside, so the result is the root of the next query. */
    it('searches only inside the root it is given', () => {
        render(<Rows />);

        expect(allByPart('row', byPart('second-group'))).toHaveLength(2);
        expect(byPart('row', byPart('second-group'))).toHaveTextContent('two');
    });

    /** A hand-written `querySelector` returns `null` for a typo, and the failure lands elsewhere. */
    it('names the part it could not find', () => {
        render(<Rows />);

        expect(() => byPart('third-group')).toThrow('third-group');
    });
});
