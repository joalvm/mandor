import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ExampleDiffMark } from '../../../../../../src/renderer/features/requests/components/examples/ExampleDiffMark.js';
import { compareExample } from '../../../../../../src/renderer/features/requests/lib/compare/compare-example.js';
import { httpResponseWith, textBody } from '../../../../support/http-response.js';

afterEach(cleanup);

const EXAMPLE = {
    body: '{"id":1}',
    contentType: 'application/json',
    name: 'Creado',
    status: '200',
};

function compared(body: string) {
    return compareExample(EXAMPLE, httpResponseWith({ body: textBody(body) }));
}

describe('what the Differences tab says from the strip (ExampleDiffMark)', () => {
    it('turns while the example is on its way', () => {
        const { container } = render(
            <ExampleDiffMark comparison={undefined} entry={{ sendId: 's1', state: 'sending' }} />,
        );

        expect(container.querySelector('[data-spin]')).not.toBeNull();
    });

    it('counts what differs once the answer came', () => {
        const { container } = render(
            <ExampleDiffMark
                comparison={compared('{"id":"2"}')}
                entry={{ response: httpResponseWith(), state: 'done' }}
            />,
        );

        expect(container.querySelector('[data-part="example-diff-mark"]')).toHaveTextContent('1');
    });

    it('says nothing when the answer matches, and nothing before one came', () => {
        const matching = render(
            <ExampleDiffMark
                comparison={compared('{"id":1}')}
                entry={{ response: httpResponseWith(), state: 'done' }}
            />,
        );

        expect(matching.container).toBeEmptyDOMElement();

        const idle = render(<ExampleDiffMark comparison={undefined} entry={{ state: 'idle' }} />);

        expect(idle.container).toBeEmptyDOMElement();
    });
});
