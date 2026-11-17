import type { AuthConfig, BasicAuth, DigestAuth, Environment, Variable } from '@mandor/schema';

import { SchemeField } from './SchemeField.js';

type BasicFieldsProps = {
    auth: BasicAuth | DigestAuth;
    environment: Environment | undefined;
    onChange: (auth: AuthConfig | undefined) => void;
    onVariablesChange: (variables: readonly Variable[]) => void;
};

/** A user and a password: the pair the Basic header carries, or the Digest answer hashes. */
export function BasicFields({ auth, environment, onChange, onVariablesChange }: BasicFieldsProps) {
    return (
        <div className="flex min-w-0 flex-col gap-gap-group" data-part="auth-fields">
            <SchemeField
                environment={environment}
                label="username"
                onChange={(username) => {
                    onChange({ ...auth, username });
                }}
                onVariablesChange={onVariablesChange}
                value={auth.username}
            />
            <SchemeField
                environment={environment}
                label="password"
                onChange={(password) => {
                    onChange({ ...auth, password });
                }}
                onVariablesChange={onVariablesChange}
                value={auth.password}
            />
        </div>
    );
}
