import { useMessages } from '@mandor/i18n';
import type {
    ApiKeyPlacement,
    AuthConfig,
    ConcreteAuth,
    Environment,
    Variable,
} from '@mandor/schema';
import { FormRow, Select } from '@mandor/ui';

import {
    ALL_SCHEMES,
    asksForToken,
    AUTH_KINDS,
    kindOf,
    offeredKinds,
} from '../../lib/auth-kinds.js';
import { AuthDescription } from './AuthDescription.js';
import { SchemeFields } from './AuthSchemeFields.js';
import { TokenStatus } from './TokenStatus.js';

type AuthEditorProps = {
    /** The auth this level carries. Undefined says it inherits, and it is the same as absent. */
    value: AuthConfig | undefined;
    onChange: (auth: AuthConfig | undefined) => void;
    /** Where an API key may go in this app. The app that mounts the editor decides. */
    placements: readonly ApiKeyPlacement[];
    /** The schemes this app applies; every one when it names none. The app decides. */
    schemes?: readonly ConcreteAuth['type'][] | undefined;
    /** The environment in force, for the fields to paint and suggest its variables. */
    environment: Environment | undefined;
    onVariablesChange: (variables: readonly Variable[]) => void;
    /** Whether «inherit» is an answer here: the workspace has nothing above to inherit from. */
    inheritable: boolean;
    /** Who the auth that rules comes from, said under the type while this level inherits. */
    inheritedLabel?: string | undefined;
    /** The environment a token is asked for in: a token never crosses to another. */
    environmentId: string | null;
    /** The folder this level hangs from, or null at the top: the chain above decides the rest. */
    parentPath: string | null;
};

/**
 * One editor for the auth of any level, read down a column the way the request tools lay it
 * out: the type, what that type does with the request in one line, the fields it needs, and the
 * ones few readers touch folded under «advanced». The scheme changes; the column stays.
 */
export function AuthEditor({
    value,
    onChange,
    placements,
    schemes = ALL_SCHEMES,
    environment,
    onVariablesChange,
    inheritable,
    inheritedLabel,
    environmentId,
    parentPath,
}: AuthEditorProps) {
    const messages = useMessages('auth');
    const kind = kindOf(value);
    const kinds = offeredKinds(schemes, inheritable, kind);

    function choose(next: string): void {
        const chosen = AUTH_KINDS.find((entry) => entry.kind === next);

        if (chosen !== undefined) {
            onChange(chosen.start(placements));
        }
    }

    return (
        <div className="flex min-w-0 max-w-form flex-col gap-gap-section" data-part="auth-editor">
            <div
                className="flex min-w-0 flex-col gap-gap-group border-b border-border-subtle pb-gap-group"
                data-part="auth-type"
            >
                <FormRow label={messages('type')}>
                    <Select
                        className="w-full"
                        label={messages('type')}
                        onValueChange={choose}
                        options={kinds.map((entry) => ({
                            label: messages(entry.label),
                            value: entry.kind,
                        }))}
                        value={kind}
                    />
                </FormRow>
                <AuthDescription inheritedLabel={inheritedLabel} kind={kind} />
            </div>
            <SchemeFields
                auth={value}
                environment={environment}
                onChange={onChange}
                onVariablesChange={onVariablesChange}
                placements={placements}
            />
            <OAuthTokenStatus environmentId={environmentId} parentPath={parentPath} value={value} />
        </div>
    );
}

function OAuthTokenStatus({
    environmentId,
    parentPath,
    value,
}: Pick<AuthEditorProps, 'environmentId' | 'parentPath' | 'value'>) {
    if (value === undefined || !('type' in value) || !asksForToken(value.type)) {
        return null;
    }

    return <TokenStatus environmentId={environmentId} own={value} parentPath={parentPath} />;
}
