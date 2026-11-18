import type {
    ApiKeyPlacement,
    AuthConfig,
    ConcreteAuth,
    Environment,
    Variable,
} from '@mandor/schema';

import { ApiKeyFields } from './ApiKeyFields.js';
import { AwsV4Fields } from './AwsV4Fields.js';
import { BasicFields } from './BasicFields.js';
import { BearerFields } from './BearerFields.js';
import { ClientCredentialsFields } from './ClientCredentialsFields.js';
import { CodePkceFields } from './CodePkceFields.js';

/** The schemes that carry fields of their own: inherit and none have none. */
type FieldedType = Exclude<ConcreteAuth['type'], 'none'>;

type FieldProps<Type extends FieldedType> = {
    auth: Extract<ConcreteAuth, { type: Type }>;
    environment: Environment | undefined;
    onChange: (auth: AuthConfig | undefined) => void;
    onVariablesChange: (variables: readonly Variable[]) => void;
    placements: readonly ApiKeyPlacement[];
};

type FieldsOf<Type extends FieldedType> = (props: FieldProps<Type>) => React.ReactNode;

/** One form per scheme, chosen by the type the level carries. */
const FIELDS_OF_SCHEME: { [Type in FieldedType]: FieldsOf<Type> } = {
    basic: BasicFields,
    bearer: BearerFields,
    apikey: ApiKeyFields,
    digest: BasicFields,
    awsv4: AwsV4Fields,
    'oauth2-client-credentials': ClientCredentialsFields,
    'oauth2-code-pkce': CodePkceFields,
};

type SchemeFieldsProps = Omit<FieldProps<FieldedType>, 'auth'> & {
    auth: AuthConfig | undefined;
};

/** The fields of the scheme in force. Inherit and none carry none of their own. */
export function SchemeFields({ auth, ...rest }: SchemeFieldsProps) {
    if (auth === undefined || !('type' in auth) || auth.type === 'none') {
        return null;
    }

    return <SchemeForm props={{ ...rest, auth }} type={auth.type} />;
}

/** The type and the level travel apart, so the compiler pairs the form with its own level. */
function SchemeForm<Type extends FieldedType>({
    props,
    type,
}: {
    props: FieldProps<Type>;
    type: Type;
}) {
    const Fields: FieldsOf<Type> = FIELDS_OF_SCHEME[type];

    return <Fields {...props} />;
}
