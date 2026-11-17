import { useMessages } from '@mandor/i18n';
import type { ScriptTest } from '@mandor/schema';
import { LogLines } from '@mandor/ui';

import { testLines } from './lib/script-lines.js';

type ScriptTestsTabProps = {
    tests: readonly ScriptTest[];
};

/** The cases the scripts of a send named, in the order they ran, each with whether it held. */
export function ScriptTestsTab({ tests }: ScriptTestsTabProps) {
    const labels = useMessages('requests');

    return (
        <div className="h-full min-h-0 min-w-0" data-part="script-tests">
            <LogLines
                empty={labels('scriptTestsNone')}
                label={labels('scriptTestList')}
                lines={testLines(tests, labels)}
            />
        </div>
    );
}
