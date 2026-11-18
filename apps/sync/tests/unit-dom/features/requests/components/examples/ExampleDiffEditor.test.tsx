import type { RequestExample } from '@mandor/schema';
import { diffEditorAt } from '@mandor/ui/testing/diff-editors-in';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { ExampleDiffEditor } from '../../../../../../src/renderer/features/requests/components/examples/ExampleDiffEditor.js';
import { compareExample } from '../../../../../../src/renderer/features/requests/lib/compare/compare-example.js';
import { AppProviders } from '../../../../support/app-providers.js';
import { httpResponseWith, textBody } from '../../../../support/http-response.js';

afterEach(cleanup);

const EXAMPLE: RequestExample = {
    body: '{"id":1,"at":"x"}',
    contentType: 'application/json',
    name: 'Creado',
    status: '200',
};

function draw(example = EXAMPLE, body = '{"id":2,"at":"y"}'): void {
    const response = httpResponseWith({ body: textBody(body) });

    render(
        <ExampleDiffEditor comparison={compareExample(example, response)} example={example} wrap />,
        { wrapper: AppProviders },
    );
}

describe('the diff editor of an example (ExampleDiffEditor)', () => {
    it('is the diff editor of the app, read only, named for the differences', async () => {
        draw();

        expect(screen.getByRole('group', { name: 'Differences' })).toHaveAttribute(
            'data-part',
            'diff-code-editor',
        );

        const shown = await diffEditorAt(0);

        expect(shown.readOnly()).toBe(true);
        expect(shown.language()).toBe('jsonc');
    });

    it('sets the example on the left against what came on the right, both laid out', async () => {
        draw();

        const shown = await diffEditorAt(0);

        expect(shown.original()).toBe('{\n  "id": 1,\n  "at": "x"\n}');
        expect(shown.modified()).toBe('{\n  "id": 2,\n  "at": "y"\n}');
    });

    it('reads a body that is not JSON as the language of its content type', async () => {
        draw({ ...EXAMPLE, body: '<a/>', contentType: 'application/xml' }, '<b/>');

        const shown = await diffEditorAt(0);

        expect(shown.language()).toBe('xml');
        expect(shown.original()).toBe('<a/>');
    });
});
