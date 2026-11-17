import type { MessageItem } from '@mandor/schema';

export type MessagesSlice = {
    /** What the disk said, filed under the resource so two views of one item share one answer. */
    messages: Record<string, MessageItem>;
    /** Resources with a read in flight. A second view asks nothing and waits for the first. */
    reading: string[];
};

export function initialMessagesSlice(): MessagesSlice {
    return { messages: {}, reading: [] };
}
