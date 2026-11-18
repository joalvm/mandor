import { useMessages } from '@mandor/i18n';
import type { SkippedScript } from '@mandor/schema';
import { Button } from '@mandor/ui';
import { useState } from 'react';

import { SkippedScriptsDialog } from './SkippedScriptsDialog.js';

type ReviewSkippedScriptsProps = {
    scripts: readonly SkippedScript[];
    workspaceId: string;
};

/**
 * The way from a mark of scripts left out to reading them, and approving them where they are:
 * a button, and the dialog it opens. Both apps put it at the end of the mark that counts them.
 */
export function ReviewSkippedScripts({ scripts, workspaceId }: ReviewSkippedScriptsProps) {
    const labels = useMessages('collections');
    const [reviewing, setReviewing] = useState(false);

    return (
        <>
            <Button
                onClick={() => {
                    setReviewing(true);
                }}
                size="sm"
            >
                {labels('reviewSkipped')}
            </Button>
            <SkippedScriptsDialog
                onOpenChange={setReviewing}
                open={reviewing}
                scripts={scripts}
                workspaceId={workspaceId}
            />
        </>
    );
}
