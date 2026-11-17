import { degradation, type Degradation, type InteropSecurityScheme } from '@mandor/interop-core';
import type { ConcreteAuth } from '@mandor/schema';

import { recordAt, textAt } from '../document/node-access.js';

/** The auth a scheme becomes with the variables it asks the person to fill, or why it cannot. */
export type AuthMapping = { auth: ConcreteAuth; variables: string[] } | { reason: Degradation };

/** Why a scheme did not enter, with the name the document gives it. */
export function namedSecurity(name: string, reason: Degradation): Degradation {
    return degradation(reason.code, { ...reason.values, name });
}

const API_KEY_PLACES = ['header', 'query', 'cookie'] as const;

/**
 * What Mandor keeps of a security scheme. The values are never the document's: each is a
 * `{{variable}}` the person fills in the environment, so a secret is never written into the repo.
 * `clientAuth` is what OpenAPI does not say, and `basic` is what servers expect by default.
 */
export function authOfScheme(scheme: InteropSecurityScheme): AuthMapping {
    const { type, extras } = scheme;
    const ofType = AUTH_OF_TYPE.get(type);

    return ofType === undefined
        ? { reason: degradation('securityTypeUnsupported', { type }) }
        : ofType(extras);
}

/** Each security type of the document that has an auth in Mandor, and how it is read. */
const AUTH_OF_TYPE = new Map<string, (extras: Record<string, unknown>) => AuthMapping>([
    ['http', (extras) => httpAuth(textAt(extras, 'scheme') ?? '')],
    ['apiKey', apiKeyAuth],
    ['oauth2', (extras) => oauth2Auth(recordAt(extras, 'flows'))],
]);

/** Each http scheme that has an auth in Mandor, by its lower case name. */
const HTTP_AUTHS = new Map<string, AuthMapping>([
    [
        'basic',
        {
            auth: { type: 'basic', username: '{{username}}', password: '{{password}}' },
            variables: ['username', 'password'],
        },
    ],
    ['bearer', { auth: { type: 'bearer', token: '{{token}}' }, variables: ['token'] }],
]);

function httpAuth(scheme: string): AuthMapping {
    return (
        HTTP_AUTHS.get(scheme.toLowerCase()) ?? {
            reason: degradation('securityHttpUnsupported', { scheme }),
        }
    );
}

function apiKeyAuth(extras: Record<string, unknown>): AuthMapping {
    const name = textAt(extras, 'name');
    const where = textAt(extras, 'in');
    const place = API_KEY_PLACES.find((each) => each === where);

    if (name === undefined || where === undefined) {
        return { reason: degradation('securityApiKeyUnplaced') };
    }

    if (place === undefined) {
        return { reason: degradation('securityApiKeyPlace', { where }) };
    }

    return {
        auth: { type: 'apikey', name, value: '{{apiKey}}', in: place },
        variables: ['apiKey'],
    };
}

function oauth2Auth(flows: Record<string, unknown>): AuthMapping {
    if ('clientCredentials' in flows) {
        return flowAuth('clientCredentials', recordAt(flows, 'clientCredentials'));
    }

    if ('authorizationCode' in flows) {
        return flowAuth('authorizationCode', recordAt(flows, 'authorizationCode'));
    }

    return {
        reason: degradation('securityFlowsUnsupported', { flows: Object.keys(flows).join(', ') }),
    };
}

function flowAuth(
    name: 'clientCredentials' | 'authorizationCode',
    flow: Record<string, unknown>,
): AuthMapping {
    const tokenUrl = textAt(flow, 'tokenUrl');
    const authorizationUrl = textAt(flow, 'authorizationUrl');
    const scope = Object.keys(recordAt(flow, 'scopes')).join(' ');
    const scoped = scope === '' ? {} : { scope };

    if (tokenUrl === undefined) {
        return { reason: degradation('securityFlowNoTokenUrl', { flow: name }) };
    }

    if (name === 'clientCredentials') {
        return {
            auth: {
                type: 'oauth2-client-credentials',
                tokenUrl,
                clientId: '{{clientId}}',
                clientSecret: '{{clientSecret}}',
                clientAuth: 'basic',
                ...scoped,
            },
            variables: ['clientId', 'clientSecret'],
        };
    }

    if (authorizationUrl === undefined) {
        return { reason: degradation('securityFlowNoAuthorizationUrl', { flow: name }) };
    }

    return {
        auth: {
            type: 'oauth2-code-pkce',
            authorizationUrl,
            tokenUrl,
            clientId: '{{clientId}}',
            ...scoped,
        },
        variables: ['clientId'],
    };
}
