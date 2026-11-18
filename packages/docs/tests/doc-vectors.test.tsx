import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DocView } from '../src/index.js';

import { AppProviders } from './support/app-providers.js';

/**
 * A doc is markdown from the repo of the user, which is to say from whoever wrote it. Every case
 * here is a doc written to attack the app, and the library is not taken at its word for any of
 * them: what is asserted is what reached the DOM.
 */
describe('a doc written to attack', () => {
    /** Raw HTML is not a node and is not text either: it is left out, and the doc reads on. */
    it('draws no script for one written in the markdown', () => {
        const { container } = render(<DocView value={"Antes\n\n<script>alert('x')</script>\n"} />, {
            wrapper: AppProviders,
        });

        expect(container.querySelector('script')).toBeNull();
        expect(screen.queryByText(/alert/)).toBeNull();
        expect(screen.getByText('Antes')).toBeVisible();
    });

    /** The handler rides on the tag, so no tag is no handler. */
    it('draws no image and no handler for an img written as raw HTML', () => {
        const { container } = render(
            <DocView value={'<img src="x" onerror="alert(1)" alt="trampa">\n'} />,
            { wrapper: AppProviders },
        );

        expect(container.querySelector('img')).toBeNull();
        expect(screen.queryByRole('img')).toBeNull();
    });

    /** A `javascript:` href is the oldest one there is, and the text around it stays readable. */
    it('leaves the text of a javascript link without a link to follow', () => {
        render(<DocView value={'[pulsa aquí](javascript:alert(1))\n'} />, {
            wrapper: AppProviders,
        });

        expect(screen.queryByRole('link')).toBeNull();
        expect(screen.getByText('pulsa aquí')).toBeVisible();
    });

    /** `data:text/html` is a page of its own carried inside the URL. */
    it('leaves the text of a data:text/html link without a link to follow', () => {
        render(<DocView value={'[abre](data:text/html,<script>alert(1)</script>)\n'} />, {
            wrapper: AppProviders,
        });

        expect(screen.queryByRole('link')).toBeNull();
        expect(screen.getByText('abre')).toBeVisible();
    });

    /** An image is fetched with nobody clicking, so a remote one reports the reader to a stranger. */
    it('does not load an image hosted somewhere else', () => {
        render(<DocView value={'![captura](https://ajeno.example/pixel.png)\n'} />, {
            wrapper: AppProviders,
        });

        expect(screen.queryByRole('img')).toBeNull();
        expect(screen.getByText('captura')).toBeVisible();
    });

    /** `..` walks out of the repo, and what is outside the repo is not the docs of the workspace. */
    it('does not load an image that climbs out of the repo', () => {
        render(<DocView value={'![secreto](../../../.ssh/id_rsa.png)\n'} />, {
            wrapper: AppProviders,
        });

        expect(screen.queryByRole('img')).toBeNull();
        expect(screen.getByText('secreto')).toBeVisible();
    });
});
