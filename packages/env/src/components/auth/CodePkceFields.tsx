import { useMessages } from '@mandor/i18n';
import type { AuthConfig, Environment, OAuth2CodePkce, Variable } from '@mandor/schema';
import { Disclosure } from '@mandor/ui';

import { emptyAsAbsent } from '../../lib/empty-as-absent.js';
import { OAuth2ClientRows } from './OAuth2ClientRows.js';
import { RedirectPortField } from './RedirectPortField.js';
import { SchemeField } from './SchemeField.js';

type CodePkceFieldsProps = {
    auth: OAuth2CodePkce;
    environment: Environment | undefined;
    onChange: (auth: AuthConfig | undefined) => void;
    onVariablesChange: (variables: readonly Variable[]) => void;
};

/**
 * The code flow with PKCE: where the user signs in, the endpoint, the client, its secret if it
 * is not a public one, and the scope. The port of the loopback waits folded unless the level
 * pins one. An emptied optional field leaves the level.
 */
export function CodePkceFields({
    auth,
    environment,
    onChange,
    onVariablesChange,
}: CodePkceFieldsProps) {
    const messages = useMessages('auth');

    return (
        <div className="flex min-w-0 flex-col gap-gap-section" data-part="auth-fields">
            <div className="flex min-w-0 flex-col gap-gap-group" data-part="auth-main-fields">
                <SchemeField
                    environment={environment}
                    label="authorizationUrl"
                    onChange={(authorizationUrl) => {
                        onChange({ ...auth, authorizationUrl });
                    }}
                    onVariablesChange={onVariablesChange}
                    value={auth.authorizationUrl}
                />
                <OAuth2ClientRows
                    auth={auth}
                    environment={environment}
                    onChange={onChange}
                    onVariablesChange={onVariablesChange}
                />
                <SchemeField
                    environment={environment}
                    label="clientSecret"
                    onChange={(clientSecret) => {
                        onChange({ ...auth, clientSecret: emptyAsAbsent(clientSecret) });
                    }}
                    onVariablesChange={onVariablesChange}
                    value={auth.clientSecret ?? ''}
                />
                <SchemeField
                    environment={environment}
                    label="scope"
                    onChange={(scope) => {
                        onChange({ ...auth, scope: emptyAsAbsent(scope) });
                    }}
                    onVariablesChange={onVariablesChange}
                    value={auth.scope ?? ''}
                />
            </div>
            <Disclosure defaultOpen={auth.redirectPort !== undefined} label={messages('advanced')}>
                <RedirectPortField
                    onChange={(redirectPort) => {
                        onChange({ ...auth, redirectPort });
                    }}
                    value={auth.redirectPort}
                />
            </Disclosure>
        </div>
    );
}
