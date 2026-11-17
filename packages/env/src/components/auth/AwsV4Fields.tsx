import { useMessages } from '@mandor/i18n';
import type { AuthConfig, AwsSigV4Auth, Environment, Variable } from '@mandor/schema';
import { Disclosure } from '@mandor/ui';

import { emptyAsAbsent } from '../../lib/empty-as-absent.js';
import { SchemeField } from './SchemeField.js';

/** The fields few levels write: the host of an AWS endpoint already says region and service. */
const ADVANCED_FIELDS = ['region', 'service', 'sessionToken'] as const;

type AwsV4FieldsProps = {
    auth: AwsSigV4Auth;
    environment: Environment | undefined;
    onChange: (auth: AuthConfig | undefined) => void;
    onVariablesChange: (variables: readonly Variable[]) => void;
};

/**
 * An AWS signature: the access key and its secret. The region, the service and the session
 * token wait folded unless the level already carries one. An emptied optional field leaves the
 * level.
 */
export function AwsV4Fields({ auth, environment, onChange, onVariablesChange }: AwsV4FieldsProps) {
    const messages = useMessages('auth');

    return (
        <div className="flex min-w-0 flex-col gap-gap-section" data-part="auth-fields">
            <div className="flex min-w-0 flex-col gap-gap-group" data-part="auth-main-fields">
                <SchemeField
                    environment={environment}
                    label="accessKeyId"
                    onChange={(accessKeyId) => {
                        onChange({ ...auth, accessKeyId });
                    }}
                    onVariablesChange={onVariablesChange}
                    value={auth.accessKeyId}
                />
                <SchemeField
                    environment={environment}
                    label="secretAccessKey"
                    onChange={(secretAccessKey) => {
                        onChange({ ...auth, secretAccessKey });
                    }}
                    onVariablesChange={onVariablesChange}
                    value={auth.secretAccessKey}
                />
            </div>
            <Disclosure
                defaultOpen={ADVANCED_FIELDS.some((field) => auth[field] !== undefined)}
                label={messages('advanced')}
            >
                {ADVANCED_FIELDS.map((field) => (
                    <SchemeField
                        environment={environment}
                        key={field}
                        label={field}
                        onChange={(value) => {
                            onChange({ ...auth, [field]: emptyAsAbsent(value) });
                        }}
                        onVariablesChange={onVariablesChange}
                        value={auth[field] ?? ''}
                    />
                ))}
            </Disclosure>
        </div>
    );
}
