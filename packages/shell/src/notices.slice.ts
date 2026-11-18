import type { ToastAction, ToastRequest, ToastTone } from '@mandor/ui';

/** What the centre keeps of a notice: enough to read it again and to know whether it was read. */
export type Notice = {
    action?: ToastAction | undefined;
    /** When it last happened, in milliseconds. */
    at: number;
    count: number;
    detail?: string | undefined;
    id: string;
    key: string;
    read: boolean;
    title: string;
    tone: ToastTone;
};

export type NoticesSlice = {
    /** Newest first. It lives in the window and is not written down: yesterday's notice lies today. */
    notices: Notice[];
    noticesOpen: boolean;
};

/** A hundred rows is more than anybody reads; the oldest go first. */
const NOTICE_LIMIT = 100;

/** The tones whose outcome is already in front of the reader. They never reach the centre. */
const KEPT_TONES: ReadonlySet<ToastTone> = new Set(['error', 'warning']);

let issued = 0;

export function initialNoticesSlice(): NoticesSlice {
    return { notices: [], noticesOpen: false };
}

/**
 * The list after a notice happened: ignored when its tone is a success or a piece of news, folded
 * into the row with the same key (which comes back to the top, unread) or added as a new row.
 */
export function noticesWith(
    notices: readonly Notice[],
    request: ToastRequest,
    at: number,
): Notice[] {
    if (!KEPT_TONES.has(request.tone)) {
        return [...notices];
    }

    const key = request.key ?? `${request.tone}:${request.title}`;
    const present = notices.find((notice) => notice.key === key);
    const others = notices.filter((notice) => notice !== present);

    issued += 1;

    const next: Notice = {
        action: request.action,
        at,
        count: (present?.count ?? 0) + 1,
        detail: request.detail,
        id: present?.id ?? `notice-${String(issued)}`,
        key,
        read: false,
        title: request.title,
        tone: request.tone,
    };

    return [next, ...others].slice(0, NOTICE_LIMIT);
}

/** What the window does to the notices it keeps. */
export type NoticesActions = {
    addNotice: (request: ToastRequest) => void;
    clearNotices: () => void;
    dismissNotice: (id: string) => void;
    markNoticesRead: () => void;
    setNoticesOpen: (open: boolean) => void;
};

export function noticesActionsFor(
    set: (update: (state: NoticesSlice) => Partial<NoticesSlice>) => void,
): NoticesActions {
    return {
        addNotice: (request) => {
            set((state) => ({ notices: noticesWith(state.notices, request, Date.now()) }));
        },
        clearNotices: () => {
            set(() => ({ notices: [] }));
        },
        dismissNotice: (id) => {
            set((state) => ({ notices: state.notices.filter((notice) => notice.id !== id) }));
        },
        markNoticesRead: () => {
            set((state) =>
                state.notices.some((notice) => !notice.read)
                    ? { notices: state.notices.map((notice) => ({ ...notice, read: true })) }
                    : {},
            );
        },
        setNoticesOpen: (noticesOpen) => {
            set(() => ({ noticesOpen }));
        },
    };
}

/** How many rows nobody has opened the centre on yet: what the bell counts. */
export function selectUnreadNotices(state: NoticesSlice): number {
    return state.notices.filter((notice) => !notice.read).length;
}
