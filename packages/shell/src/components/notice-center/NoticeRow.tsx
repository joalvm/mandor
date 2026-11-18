import { useLanguage, useMessages } from '@mandor/i18n';
import { Icon } from '@mandor/icons';
import { Button, IconButton } from '@mandor/ui';

import type { Notice } from '../../notices.slice.js';
import { relativeTime } from './relative-time.js';
import { walkNotices } from './walk-notices.js';

const TONE_COLORS = { error: 'text-text-error', warning: 'text-text-warning' } as const;

/** The center keeps what went wrong: an error stays one, anything else reads as a warning. */
const ROW_TONES: Readonly<Record<Notice['tone'], keyof typeof TONE_COLORS>> = {
    error: 'error',
    info: 'warning',
    success: 'warning',
    warning: 'warning',
};

type NoticeRowProps = {
    notice: Notice;
    now: number;
    onDismiss: (id: string) => void;
};

/** One thing that went wrong, with when, how many times, and the way out its owner offered. */
export function NoticeRow({ notice, now, onDismiss }: NoticeRowProps) {
    const messages = useMessages('notices');
    const language = useLanguage();
    const tone = ROW_TONES[notice.tone];

    return (
        <li
            className="flex items-start gap-gap-icon-text rounded-md px-pad-control py-1 hover:veil"
            data-focus-ring=""
            data-part="notice"
            data-tone={tone}
            onKeyDown={(event) => {
                walkNotices(event, () => {
                    onDismiss(notice.id);
                });
            }}
            tabIndex={0}
        >
            <span className={TONE_COLORS[tone]}>
                <Icon name={tone} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-gap-tight">
                <span className="text-sm break-words text-text-primary">
                    {notice.title}
                    <NoticeCount count={notice.count} />
                </span>
                <NoticeDetail detail={notice.detail} />
                <span className="text-xs text-text-secondary">
                    {relativeTime(notice.at, now, language)}
                </span>
                <NoticeAction action={notice.action} />
            </div>
            <IconButton
                icon="close"
                label={messages('dismiss')}
                onClick={() => {
                    onDismiss(notice.id);
                }}
            />
        </li>
    );
}

function NoticeCount({ count }: Pick<Notice, 'count'>) {
    if (count <= 1) {
        return null;
    }

    return (
        <span className="ml-gap-icon-text text-xs text-text-secondary">{`×${String(count)}`}</span>
    );
}

function NoticeDetail({ detail }: Pick<Notice, 'detail'>) {
    if (detail === undefined) {
        return null;
    }

    return <span className="text-xs break-words text-text-secondary">{detail}</span>;
}

function NoticeAction({ action }: Pick<Notice, 'action'>) {
    if (action === undefined) {
        return null;
    }

    return (
        <Button className="self-start" onClick={action.onSelect} size="sm" variant="ghost">
            {action.label}
        </Button>
    );
}
