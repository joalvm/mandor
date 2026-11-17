import { degradation } from '../../src/resource/degradation.js';
import { describe, expect, it } from 'vitest';

import { clientCredentialsDraft, codeFlowDraft } from '../../src/import/oauth2-drafts.js';

const GRANT = {
    tokenUrl: 'https://auth.test/token',
    clientId: 'app',
    clientSecret: '{{secret}}',
    clientAuth: 'basic',
    scope: '',
} as const;

const FLOW = {
    authorizationUrl: 'https://auth.test/authorize',
    tokenUrl: 'https://auth.test/token',
    clientId: 'app',
    clientSecret: '',
    scope: 'read',
    redirectUrl: 'http://localhost:4010/callback',
    pkce: true,
} as const;

describe('clientCredentialsDraft', () => {
    it('keeps a secret that points at a variable and leaves out what the document left empty', () => {
        expect(clientCredentialsDraft(GRANT)).toEqual({
            auth: {
                type: 'oauth2-client-credentials',
                tokenUrl: 'https://auth.test/token',
                clientId: 'app',
                clientSecret: '{{secret}}',
                clientAuth: 'basic',
            },
            degradations: [],
        });
    });

    it('carries the scope and the audience when the document has them', () => {
        const { auth } = clientCredentialsDraft({
            ...GRANT,
            clientAuth: 'body',
            scope: 'read',
            audience: 'api',
        });

        expect(auth).toMatchObject({ clientAuth: 'body', scope: 'read', audience: 'api' });
    });

    it('keeps a secret written in the document', () => {
        const draft = clientCredentialsDraft({ ...GRANT, clientSecret: 'hunter2' });

        expect(draft.auth['clientSecret']).toBe('hunter2');
        expect(draft.degradations).toEqual([]);
    });
});

describe('codeFlowDraft', () => {
    it('pins the loopback port of the redirect and leaves the secret out when there is none', () => {
        expect(codeFlowDraft(FLOW)).toEqual({
            auth: {
                type: 'oauth2-code-pkce',
                authorizationUrl: 'https://auth.test/authorize',
                tokenUrl: 'https://auth.test/token',
                clientId: 'app',
                scope: 'read',
                redirectPort: 4010,
            },
            degradations: [],
        });
    });

    it('says that the PKCE and the loopback redirect are Mandor choices, not the document ones', () => {
        const draft = codeFlowDraft({
            ...FLOW,
            pkce: false,
            redirectUrl: 'https://app.test/callback',
        });

        expect(draft.auth).not.toHaveProperty('redirectPort');
        expect(draft.degradations).toEqual([
            degradation('redirectNotUsed', { noun: 'URL', address: 'https://app.test/callback' }),
            degradation('pkceAlways'),
        ]);
    });

    it('keeps a secret written in the document', () => {
        const draft = codeFlowDraft({ ...FLOW, clientSecret: 'hunter2' });

        expect(draft.auth['clientSecret']).toBe('hunter2');
        expect(draft.degradations).toEqual([]);
    });
});
