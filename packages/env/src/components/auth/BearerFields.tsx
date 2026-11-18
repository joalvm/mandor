import { useMessages } from '@mandor/i18n';
import type { AuthConfig, BearerAuth, Environment, Variable } from '@mandor/schema';
import { Disclosure } from '@mandor/ui';

import { emptyAsAbsent } from '../../lib/empty-as-absent.js';
import { SchemeField } from './SchemeField.js';

type BearerFieldsProps = {
    auth: BearerAuth;
    environment: Environment | undefined;
    onChange: (auth: AuthConfig | undefined) => void;
    onVariablesChange: (variables: readonly Variable[]) => void;
};

/**
 * The token, and folded under it the word that goes before it. An emptied prefix leaves the
 * level, so the standard `Bearer` applies again; one the file already carries keeps the fold
 * open, since it changes what is sent.
 */
export function BearerFields({
    auth,
    environment,
    onChange,
    onVariablesChange,
}: BearerFieldsProps) {
    const messages = useMessages('auth');

    return (
        <div className="flex min-w-0 flex-col gap-gap-section" data-part="auth-fields">
            <SchemeField
                environment={environment}
                label="token"
                onChange={(token) => {
                    onChange({ ...auth, token });
                }}
                onVariablesChange={onVariablesChange}
                value={auth.token}
            />
            <Disclosure defaultOpen={auth.prefix !== undefined} label={messages('advanced')}>
                <SchemeField
                    environment={environment}
                    label="prefix"
                    onChange={(prefix) => {
                        onChange({ ...auth, prefix: emptyAsAbsent(prefix) });
                    }}
                    onVariablesChange={onVariablesChange}
                    value={auth.prefix ?? ''}
                />
            </Disclosure>
        </div>
    );
}
