import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DocView } from '../src/index.js';

import { AppProviders } from './support/app-providers.js';

/**
 * A filter that drops everything passes the vectors and makes the docs useless. What a doc is
 * allowed to carry is asserted here, next to what it is not.
 */
describe('what a doc is allowed to link to', () => {
    /** The window denies every new window and hands the URL to the browser of the machine. */
    it('sends an https link out of the app instead of navigating inside it', () => {
        render(<DocView value={'[la guía](https://ejemplo.test/guia)\n'} />, {
            wrapper: AppProviders,
        });

        const link = screen.getByRole('link', { name: 'la guía' });

        expect(link).toHaveAttribute('href', 'https://ejemplo.test/guia');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', expect.stringContaining('noreferrer'));
    });

    /** The destination is readable before the click, which is the whole point of showing it. */
    it('shows the destination of an external link before it is followed', () => {
        render(<DocView value={'[la guía](https://ejemplo.test/guia)\n'} />, {
            wrapper: AppProviders,
        });

        expect(screen.getByRole('link', { name: 'la guía' })).toHaveAttribute(
            'title',
            'https://ejemplo.test/guia',
        );
    });

    /** A resource of the workbench is a link of the app, and the app opens it in a later phase. */
    it('keeps an mandor link', () => {
        render(<DocView value={'[la conexión](mandor://local/api/connection/eco)\n'} />, {
            wrapper: AppProviders,
        });

        expect(screen.getByRole('link', { name: 'la conexión' })).toHaveAttribute(
            'href',
            'mandor://local/api/connection/eco',
        );
    });

    /** A doc points at the file beside it far more often than at anything remote. */
    it('keeps a link relative to the doc', () => {
        render(<DocView value={'[el otro](./otro.md)\n'} />, { wrapper: AppProviders });

        expect(screen.getByRole('link', { name: 'el otro' })).toHaveAttribute('href', './otro.md');
    });

    /** An image of the repo is the only image there is, and it is drawn. */
    it('keeps an image relative to the doc', () => {
        render(<DocView value={'![el diagrama](imagenes/flujo.png)\n'} />, {
            wrapper: AppProviders,
        });

        expect(screen.getByRole('img', { name: 'el diagrama' })).toHaveAttribute(
            'src',
            'imagenes/flujo.png',
        );
    });
});
