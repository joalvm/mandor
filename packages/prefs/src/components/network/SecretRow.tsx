import { useTranslator } from '@mandor/i18n';
import { fireAndForget } from '@mandor/shell';
import { Button, Input, SettingRow, useToast } from '@mandor/ui';
import { useState } from 'react';

type SecretRowProps = {
    help?: string | undefined;
    /** Whether the keychain already keeps a value; the value itself never reaches the window. */
    kept: boolean;
    label: string;
    /** Answers whether the keychain took the value; an empty one asks it to forget. */
    onKeep: (value: string) => Promise<boolean>;
};

/**
 * A secret the keychain keeps: written once and sent away, never read back. What is typed waits
 * in the field until the keychain has taken it, then the field empties; when the keychain
 * refuses, the text stays, the field is marked and a toast says so. A kept value can be
 * forgotten. Nothing is greyed out: the way to keep appears with something to keep.
 */
export function SecretRow({ help, kept, label, onKeep }: SecretRowProps) {
    const translate = useTranslator();
    const { notify } = useToast();
    const [draft, setDraft] = useState('');
    const [refused, setRefused] = useState(false);

    const settle = (taken: boolean): void => {
        setRefused(!taken);

        if (!taken) {
            notify({ title: translate('preferences:secretRefused'), tone: 'error' });
        }
    };

    const keep = async (): Promise<void> => {
        const sent = draft;
        const taken = await onKeep(sent);

        settle(taken);

        if (taken) {
            // What was typed while the keychain answered is not what it took: it stays.
            setDraft((typed) => (typed === sent ? '' : typed));
        }
    };

    const forget = async (): Promise<void> => {
        settle(await onKeep(''));
    };

    return (
        <SettingRow help={help} label={label}>
            <Input
                invalid={refused}
                label={label}
                onValueChange={(typed) => {
                    setDraft(typed);
                    setRefused(false);
                }}
                placeholder={translate(kept ? 'preferences:secretKept' : 'preferences:secretNone')}
                value={draft}
            />
            <div className="flex items-center gap-gap-control">
                <SecretKeep
                    draft={draft}
                    onKeep={() => {
                        fireAndForget(keep());
                    }}
                />
                <SecretForget
                    kept={kept}
                    onForget={() => {
                        fireAndForget(forget());
                    }}
                />
            </div>
        </SettingRow>
    );
}

function SecretKeep({ draft, onKeep }: { draft: string; onKeep: () => void }) {
    const translate = useTranslator();

    if (draft === '') {
        return null;
    }

    return <Button onClick={onKeep}>{translate('preferences:secretKeep')}</Button>;
}

function SecretForget({ kept, onForget }: { kept: SecretRowProps['kept']; onForget: () => void }) {
    const translate = useTranslator();

    if (!kept) {
        return null;
    }

    return (
        <Button onClick={onForget} variant="ghost">
            {translate('preferences:secretForget')}
        </Button>
    );
}
