import type {
    ApiKeyAuth,
    ApiKeyPlacement,
    AuthConfig,
    Environment,
    Variable,
} from '@mandor/schema';

import { PlacementField } from './PlacementField.js';
import { SchemeField } from './SchemeField.js';

type ApiKeyFieldsProps = {
    auth: ApiKeyAuth;
    environment: Environment | undefined;
    onChange: (auth: AuthConfig | undefined) => void;
    onVariablesChange: (variables: readonly Variable[]) => void;
    placements: readonly ApiKeyPlacement[];
};

/** The name of the key, its value, and where in the request it travels. */
export function ApiKeyFields({
    auth,
    environment,
    onChange,
    onVariablesChange,
    placements,
}: ApiKeyFieldsProps) {
    return (
        <div className="flex min-w-0 flex-col gap-gap-group" data-part="auth-fields">
            <SchemeField
                environment={environment}
                label="name"
                onChange={(name) => {
                    onChange({ ...auth, name });
                }}
                onVariablesChange={onVariablesChange}
                value={auth.name}
            />
            <SchemeField
                environment={environment}
                label="value"
                onChange={(value) => {
                    onChange({ ...auth, value });
                }}
                onVariablesChange={onVariablesChange}
                value={auth.value}
            />
            <PlacementField auth={auth} onChange={onChange} placements={placements} />
        </div>
    );
}
