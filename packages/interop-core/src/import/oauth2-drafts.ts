import { degradation, type Degradation } from '../resource/degradation.js';
import { loopbackPortOf, optionalField, type AuthDraft } from './auth-draft.js';

/** What a document says of a client credentials grant, already read out of its own field names. */
export type ClientCredentialsFields = {
    tokenUrl: string;
    clientId: string;
    clientSecret: string;
    clientAuth: 'basic' | 'body';
    scope: string;
    /** Empty when the format has no such field or the document left it empty. */
    audience?: string;
};

/** What a document says of an authorization code grant, already read out of its own field names. */
export type CodeFlowFields = {
    authorizationUrl: string;
    tokenUrl: string;
    clientId: string;
    clientSecret: string;
    scope: string;
    redirectUrl: string;
    pkce: boolean;
};

/** The client credentials grant as Mandor holds it. */
export function clientCredentialsDraft(fields: ClientCredentialsFields): AuthDraft {
    return {
        auth: {
            type: 'oauth2-client-credentials',
            tokenUrl: fields.tokenUrl,
            clientId: fields.clientId,
            clientSecret: fields.clientSecret,
            clientAuth: fields.clientAuth,
            ...optionalField('scope', fields.scope),
            ...optionalField('audience', fields.audience ?? ''),
        },
        degradations: [],
    };
}

/**
 * The authorization code grant as Mandor holds it. Mandor always uses PKCE and receives the code
 * on the loopback, so a document that asks for otherwise says what was not kept.
 */
export function codeFlowDraft(fields: CodeFlowFields): AuthDraft {
    const degradations: Degradation[] = [];
    const port = loopbackPortOf(fields.redirectUrl, degradations, 'URL');

    if (!fields.pkce) {
        degradations.push(degradation('pkceAlways'));
    }

    return {
        auth: {
            type: 'oauth2-code-pkce',
            authorizationUrl: fields.authorizationUrl,
            tokenUrl: fields.tokenUrl,
            clientId: fields.clientId,
            ...optionalField('clientSecret', fields.clientSecret),
            ...optionalField('scope', fields.scope),
            ...(port === undefined ? {} : { redirectPort: port }),
        },
        degradations,
    };
}
