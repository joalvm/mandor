import { describe, expect, it } from 'vitest';

import { formattedMarkup } from '../../src/editor/markup-format.js';

describe('laying out markup', () => {
    it('indents the children of an xml element by four spaces', async () => {
        await expect(formattedMarkup('<a><b x="1">t</b><c/></a>', 'xml')).resolves.toBe(
            '<a>\n    <b x="1">t</b>\n    <c />\n</a>',
        );
    });

    it('leaves xml it cannot read alone', async () => {
        await expect(formattedMarkup('<a><b></a>', 'xml')).resolves.toBeNull();
    });

    /** Blank lines around the head and the body are a habit of the formatter, not of the page. */
    it('lays out an html page level by level, with no blank lines of its own', async () => {
        const page =
            '<!doctype html><html><head><title>t</title></head><body><p>x</p></body></html>';

        await expect(formattedMarkup(page, 'html')).resolves.toBe(
            '<!doctype html>\n<html>\n    <head>\n        <title>t</title>\n    </head>\n    <body>\n        <p>x</p>\n    </body>\n</html>',
        );
    });
});
