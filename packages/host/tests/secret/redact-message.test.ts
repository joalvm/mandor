import { REDACTED } from '@mandor/vars';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
    answerRedactor,
    redactMessage,
    redactedDocument,
    redactedText,
} from '../../src/secret/redact-message.js';
import { forgetSessionSecrets, rememberSessionSecrets } from '../../src/secret/session-secrets.js';

beforeEach(() => {
    rememberSessionSecrets(['tok_abcdefgh']);
});

afterEach(() => {
    forgetSessionSecrets();
});

describe('the hiding of what a server answered', () => {
    it('hides a short value, and one the server wrote back in base64', () => {
        rememberSessionSecrets(['123', 'secret12']);

        const hide = answerRedactor();

        expect(hide('pin 123')).toBe(`pin ${REDACTED}`);
        expect(hide('c2VjcmV0MTI=')).toBe(REDACTED);
    });
});

describe('redacting a message about to leave the process', () => {
    it('hides the value wherever it sits inside the message', () => {
        const message = redactMessage({
            connectionId: 'one',
            frames: [{ text: 'auth tok_abcdefgh' }],
        });

        expect(message).toEqual({
            connectionId: 'one',
            frames: [{ text: `auth ${REDACTED}` }],
        });
    });

    it('leaves numbers, booleans and nothing at all as they came', () => {
        expect(redactMessage({ at: 17, open: true, detail: null })).toEqual({
            at: 17,
            open: true,
            detail: null,
        });
    });

    it('hands the message back as it came when the session holds nothing to hide', () => {
        const message = { frames: [{ text: 'auth tok_abcdefgh' }] };

        forgetSessionSecrets();

        expect(redactMessage(message)).toBe(message);
    });

    /** Every answer of the window passes here: one that hides nothing is not copied for it. */
    it('hands back as it came a message that spells no secret, however deep it goes', () => {
        const message = { items: [{ name: 'pedidos', headers: [{ value: 'tok_abcdefg' }] }] };

        expect(redactMessage(message)).toBe(message);
    });

    it('copies the message that spells a secret, and leaves the one it was handed alone', () => {
        const message = { items: [{ name: 'pedidos' }, { headers: [{ value: 'tok_abcdefgh' }] }] };

        const redacted = redactMessage(message);

        expect(redacted).toEqual({
            items: [{ name: 'pedidos' }, { headers: [{ value: REDACTED }] }],
        });
        expect(message.items[1]).toEqual({ headers: [{ value: 'tok_abcdefgh' }] });
    });

    it('hides the value in a message that is only a string', () => {
        expect(redactMessage('tok_abcdefgh')).toBe(REDACTED);
    });

    it('hides the value in the text of a file about to be written', () => {
        expect(redactedText('token=tok_abcdefgh; rest')).toBe(`token=${REDACTED}; rest`);
    });
});

describe('redacting a document still data', () => {
    it('answers an object with the same keys, the values hidden however deep', () => {
        rememberSessionSecrets(['s3cr3t-value']);

        expect(
            redactedDocument({ info: { title: 'Pasarela' }, examples: ['token s3cr3t-value'] }),
        ).toEqual({ info: { title: 'Pasarela' }, examples: [`token ${REDACTED}`] });
    });
});
