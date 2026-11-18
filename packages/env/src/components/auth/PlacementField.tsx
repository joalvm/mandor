import { useMessages } from '@mandor/i18n';
import type { ApiKeyPlacement, AuthConfig } from '@mandor/schema';
import { FormRow, Select } from '@mandor/ui';
import type { ReactNode } from 'react';

type PlacementFieldProps = {
    auth: Extract<AuthConfig, { type: 'apikey' }>;
    onChange: (auth: AuthConfig | undefined) => void;
    placements: readonly ApiKeyPlacement[];
};

const PLACEMENT_MESSAGES: Record<
    ApiKeyPlacement,
    'placementHeader' | 'placementQuery' | 'placementCookie' | 'placementSubprotocol'
> = {
    header: 'placementHeader',
    query: 'placementQuery',
    cookie: 'placementCookie',
    subprotocol: 'placementSubprotocol',
};

/** The app that mounts the editor decides where an API key may go; here it is only chosen. */
export function PlacementField({ auth, onChange, placements }: PlacementFieldProps): ReactNode {
    const messages = useMessages('auth');

    return (
        <FormRow label={messages('placement')}>
            <Select
                className="w-full"
                label={messages('placement')}
                onValueChange={(placement) => {
                    onChange({ ...auth, in: placement });
                }}
                options={placements.map((placement) => ({
                    label: messages(PLACEMENT_MESSAGES[placement]),
                    value: placement,
                }))}
                value={auth.in}
            />
        </FormRow>
    );
}
