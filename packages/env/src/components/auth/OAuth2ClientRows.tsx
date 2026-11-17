import type {
    AuthConfig,
    Environment,
    OAuth2ClientCredentials,
    OAuth2CodePkce,
    Variable,
} from '@mandor/schema';

import { SchemeField } from './SchemeField.js';

type OAuth2ClientRowsProps = {
    auth: OAuth2ClientCredentials | OAuth2CodePkce;
    environment: Environment | undefined;
    onChange: (auth: AuthConfig | undefined) => void;
    onVariablesChange: (variables: readonly Variable[]) => void;
};

/** What every OAuth2 flow asks first: where the token is asked for, and who asks for it. */
export function OAuth2ClientRows({
    auth,
    environment,
    onChange,
    onVariablesChange,
}: OAuth2ClientRowsProps) {
    return (
        <>
            <SchemeField
                environment={environment}
                label="tokenUrl"
                onChange={(tokenUrl) => {
                    onChange({ ...auth, tokenUrl });
                }}
                onVariablesChange={onVariablesChange}
                value={auth.tokenUrl}
            />
            <SchemeField
                environment={environment}
                label="clientId"
                onChange={(clientId) => {
                    onChange({ ...auth, clientId });
                }}
                onVariablesChange={onVariablesChange}
                value={auth.clientId}
            />
        </>
    );
}
