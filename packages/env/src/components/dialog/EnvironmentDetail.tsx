import { useMessages } from '@mandor/i18n';
import type { Environment } from '@mandor/schema';
import { Input } from '@mandor/ui';
import { type ReactNode, useState } from 'react';

import { useVariableLines } from '../../hooks/useVariableLines.js';
import { blocksTheWrite } from '../../lib/writable-variables.js';
import { KeyValueTable } from '../key-value/KeyValueTable.js';
import type { KeyValueColumns, KeyValueLine } from '../key-value/key-value-line.js';

const COLUMNS: KeyValueColumns = { description: false, value: true };

type EnvironmentDetailProps = {
    environment: Environment;
    onChange: (environment: Environment) => void;
    /** The globals keep their name: only an environment of the workspace is renamed. */
    renamable: boolean;
};

/**
 * Edits the name and the variables of the one environment on screen. The variables are the
 * shared table — key, value, switch — with the mark of secret as its only extra: the value
 * wears dots until its own eye lifts them. A value here is a literal; this is where the
 * variables are born, not where they are spoken, so the cells suggest nothing. A key the
 * environment cannot be kept under wears the error line: until it is fixed, the last good
 * version is the one on disk.
 */
export function EnvironmentDetail({
    environment,
    onChange,
    renamable,
}: EnvironmentDetailProps): ReactNode {
    const messages = useMessages('environment');
    const { adopt, lines } = useVariableLines(environment.variables);
    const [columns, setColumns] = useState<KeyValueColumns>(COLUMNS);

    const onLinesChange = (next: readonly KeyValueLine[]): void => {
        onChange({ ...environment, variables: adopt(next) });
    };

    return (
        <div className="grid min-h-0 content-start gap-gap-group" data-part="environment-detail">
            <EnvironmentName environment={environment} onChange={onChange} renamable={renamable} />
            <KeyValueTable
                bulkEdit={false}
                columnMenu={false}
                columns={columns}
                environment={undefined}
                keyInvalid={blocksTheWrite}
                lines={lines}
                onColumnsChange={setColumns}
                onLinesChange={onLinesChange}
                onVariablesChange={() => undefined}
                secretable
                title={messages('variables')}
                typed={false}
                variables={false}
            />
        </div>
    );
}

/** The name of an environment, to edit; the globals have none of their own to change. */
function EnvironmentName({ environment, onChange, renamable }: EnvironmentDetailProps) {
    const messages = useMessages('environment');

    if (!renamable) {
        return null;
    }

    return (
        <Input
            label={messages('name')}
            onValueChange={(name) => {
                onChange({ ...environment, name });
            }}
            value={environment.name}
        />
    );
}
