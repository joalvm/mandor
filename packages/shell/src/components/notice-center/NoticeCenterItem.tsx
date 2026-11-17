import { StatusItem } from '../status-line/StatusItem.js';
import { NoticeCenter } from './NoticeCenter.js';

/** Hangs the bell of the notices from the status line of this window while it is mounted. */
export function NoticeCenterItem() {
    return (
        <StatusItem id="notices" order={10}>
            <NoticeCenter />
        </StatusItem>
    );
}
