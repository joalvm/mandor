import { useMessages } from '@mandor/i18n';
import type { Environment, Variable } from '@mandor/schema';
import { FormRow } from '@mandor/ui';

import { VariableInput } from '../field/VariableInput.js';

type FieldName =
    | 'username'
    | 'prefix'
    | 'name'
    | 'password'
    | 'token'
    | 'value'
    | 'tokenUrl'
    | 'authorizationUrl'
    | 'clientId'
    | 'clientSecret'
    | 'scope'
    | 'audience'
    | 'accessKeyId'
    | 'secretAccessKey'
    | 'region'
    | 'service'
    | 'sessionToken';

/** What an empty field shows, where an example says more than repeating its name. */
const PLACEHOLDER_OF_FIELD = {
    username: 'username',
    prefix: 'prefixPlaceholder',
    name: 'namePlaceholder',
    password: 'password',
    token: 'token',
    value: 'value',
    tokenUrl: 'tokenUrlPlaceholder',
    authorizationUrl: 'authorizationUrlPlaceholder',
    clientId: 'clientId',
    clientSecret: 'clientSecret',
    scope: 'scopePlaceholder',
    audience: 'audiencePlaceholder',
    accessKeyId: 'accessKeyId',
    secretAccessKey: 'secretAccessKey',
    region: 'regionPlaceholder',
    service: 'servicePlaceholder',
    sessionToken: 'sessionToken',
} as const satisfies Record<FieldName, string>;

type HintKey =
    'prefixHelp' | 'scopeHelp' | 'audienceHelp' | 'regionHelp' | 'serviceHelp' | 'sessionTokenHelp';

/** What a field means, for the few whose name alone does not say how it is used. */
const HINT_OF_FIELD: Partial<Record<FieldName, HintKey>> = {
    prefix: 'prefixHelp',
    scope: 'scopeHelp',
    audience: 'audienceHelp',
    region: 'regionHelp',
    service: 'serviceHelp',
    sessionToken: 'sessionTokenHelp',
};

type SchemeFieldProps = {
    environment: Environment | undefined;
    label: FieldName;
    onChange: (value: string) => void;
    onVariablesChange: (variables: readonly Variable[]) => void;
    value: string;
};

/**
 * One field of the scheme, as a row of the form, spoken as a variable field. What the field
 * means waits beside its name. A credential in plain text would reach the repo as it is typed:
 * the fields that carry one say so under them.
 */
export function SchemeField({
    environment,
    label,
    onChange,
    onVariablesChange,
    value,
}: SchemeFieldProps) {
    const messages = useMessages('auth');
    const hint = HINT_OF_FIELD[label];

    return (
        <FormRow hint={hint === undefined ? undefined : messages(hint)} label={messages(label)}>
            <VariableInput
                environment={environment}
                label={messages(label)}
                onChange={onChange}
                onVariablesChange={onVariablesChange}
                placeholder={messages(PLACEHOLDER_OF_FIELD[label])}
                value={value}
            />
        </FormRow>
    );
}
