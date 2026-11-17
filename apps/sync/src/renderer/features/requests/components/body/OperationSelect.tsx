import { useMessages } from '@mandor/i18n';
import type { GraphqlOperation } from '@mandor/graphql';
import { Select } from '@mandor/ui';

type OperationSelectProps = {
    operations: readonly GraphqlOperation[];
    onValueChange: (name: string) => void;
    /** The operation the request names; `undefined` while nobody picked one. */
    value: string | undefined;
};

/**
 * Which operation of the document runs. It is there only when there is a choice: with one
 * operation the server needs no name. A subscription is listed and cannot be picked, because
 * Sync does not send it.
 */
export function OperationSelect({ onValueChange, operations, value }: OperationSelectProps) {
    const labels = useMessages('requests');
    const named = operations.flatMap(({ kind, name }) => (name === null ? [] : [{ kind, name }]));

    if (named.length < 2) {
        return null;
    }

    return (
        <Select
            className="w-56 shrink-0 self-start"
            label={labels('graphqlOperation')}
            onValueChange={onValueChange}
            options={named.map(({ kind, name }) => {
                const subscription = kind === 'subscription';

                return {
                    disabled: subscription,
                    label: subscription ? labels('graphqlSubscription', { name }) : name,
                    value: name,
                };
            })}
            placeholder={labels('graphqlOperationPick')}
            value={value ?? ''}
        />
    );
}
