import { useMessages } from '@mandor/i18n';
import type { ConflictChoice, ConflictItem } from '@mandor/ipc';
import { Badge, Button, detectedFormat, DiffCodeEditor, languageOfFormat } from '@mandor/ui';

import { answerText } from '../../lib/answer-text.js';
import { describeSide } from '../../lib/describe-side.js';

type TextChoiceProps = {
    choice: ConflictChoice | undefined;
    item: ConflictItem;
    label: string;
    onChoose: (itemId: string, choice: ConflictChoice) => void;
};

/**
 * A text both copies rewrote, with the incoming one read on the left and the result written on
 * the right: it starts from the merge by lines, and each chunk that clashed is whatever the
 * person leaves there. Nothing is an answer until the person says so — typing in the result,
 * taking a side whole, or accepting what is there — because a merge nobody looked at is not a
 * decision.
 */
export function TextChoice({ choice, item, label, onChoose }: TextChoiceProps) {
    const messages = useMessages('conflicts');
    const incoming = describeSide(item.theirs, '').text;
    const result = answerText(item, choice);

    return (
        <div className="flex min-w-0 flex-col gap-gap-control" data-part="text-choice">
            <div className="flex min-w-0 flex-wrap items-center gap-gap-control">
                <Button
                    onClick={() => {
                        onChoose(item.id, { pick: 'ours' });
                    }}
                    size="sm"
                >
                    {messages('useOurs')}
                </Button>
                <Button
                    onClick={() => {
                        onChoose(item.id, { pick: 'theirs' });
                    }}
                    size="sm"
                >
                    {messages('useTheirs')}
                </Button>
                <Button
                    onClick={() => {
                        onChoose(item.id, { text: result });
                    }}
                    size="sm"
                    variant="primary"
                >
                    {messages('useResult')}
                </Button>
                <ChosenBadge chosen={choice !== undefined} />
            </div>
            <div className="h-72 min-w-0 overflow-hidden rounded-md bg-surface-sunken">
                <DiffCodeEditor
                    labels={{
                        editor: label,
                        modified: messages('textResult'),
                        original: messages('textIncoming'),
                    }}
                    language={languageOfFormat(detectedFormat(result))}
                    modified={result}
                    onModifiedChange={(text) => {
                        onChoose(item.id, { text });
                    }}
                    original={incoming}
                />
            </div>
        </div>
    );
}

function ChosenBadge({ chosen }: { chosen: boolean }) {
    const messages = useMessages('conflicts');

    if (!chosen) {
        return null;
    }

    return (
        <Badge className="ms-auto" tone="success">
            {messages('chosen')}
        </Badge>
    );
}
