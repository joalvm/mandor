import { useMessages } from '@mandor/i18n';
import type { AuthConfig, Environment, OAuth2ClientCredentials, Variable } from '@mandor/schema';
import { Disclosure, FormRow, Select } from '@mandor/ui';

import { emptyAsAbsent } from '../../lib/empty-as-absent.js';
import { OAuth2ClientRows } from './OAuth2ClientRows.js';
import { SchemeField } from './SchemeField.js';

type ClientCredentialsFieldsProps = {
    auth: OAuth2ClientCredentials;
    environment: Environment | undefined;
    onChange: (auth: AuthConfig | undefined) => void;
    onVariablesChange: (variables: readonly Variable[]) => void;
};

/**
 * The client credentials flow: the endpoint, the client and its secret, the scope, and how the
 * secret travels. The audience, which only some providers read, waits folded unless the level
 * already carries one. An emptied optional field leaves the level.
 */
export function ClientCredentialsFields({
    auth,
    environment,
    onChange,
    onVariablesChange,
}: ClientCredentialsFieldsProps) {
    const messages = useMessages('auth');

    return (
        <div className="flex min-w-0 flex-col gap-gap-section" data-part="auth-fields">
            <div className="flex min-w-0 flex-col gap-gap-group" data-part="auth-main-fields">
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
                        onChange({ ...auth, clientSecret });
                    }}
                    onVariablesChange={onVariablesChange}
                    value={auth.clientSecret}
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
                <FormRow label={messages('clientAuth')}>
                    <Select
                        className="w-full"
                        label={messages('clientAuth')}
                        onValueChange={(clientAuth) => {
                            onChange({ ...auth, clientAuth });
                        }}
                        options={[
                            { label: messages('clientAuthBasic'), value: 'basic' },
                            { label: messages('clientAuthBody'), value: 'body' },
                        ]}
                        value={auth.clientAuth}
                    />
                </FormRow>
            </div>
            <Disclosure defaultOpen={auth.audience !== undefined} label={messages('advanced')}>
                <SchemeField
                    environment={environment}
                    label="audience"
                    onChange={(audience) => {
                        onChange({ ...auth, audience: emptyAsAbsent(audience) });
                    }}
                    onVariablesChange={onVariablesChange}
                    value={auth.audience ?? ''}
                />
            </Disclosure>
        </div>
    );
}
