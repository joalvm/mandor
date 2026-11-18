import { byPart } from '@mandor/ui/testing';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { RequestSectionBody } from '../../../../src/renderer/features/requests/components/panel/RequestSectionBody.js';

afterEach(cleanup);

describe('the air of one section of the request', () => {
    it('holds what the section writes inside it, in the order it was written', () => {
        render(
            <RequestSectionBody>
                <p>primero</p>
                <p>segundo</p>
            </RequestSectionBody>,
        );

        const body = byPart('request-section-body');

        expect(body).toContainElement(screen.getByText('primero'));
        expect(body).toContainElement(screen.getByText('segundo'));
        expect(body).toHaveTextContent('primerosegundo');
    });

    it('draws an empty section as an empty box', () => {
        render(<RequestSectionBody />);

        expect(byPart('request-section-body')).toBeEmptyDOMElement();
    });
});
