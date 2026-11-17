import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/** The stages of the last start, in milliseconds from the start of the process. */
export type Startup = Record<string, number>;

const MARK = ' startup ';

/**
 * The last start the log of the app tells about. The line `startup` of a reload carries only
 * `window-reloaded`, so a line is a start when it names `host-start`. `undefined` while the
 * window has not said it is ready, which is what `expect.poll` waits on.
 */
export async function readStartup(userDataDir: string): Promise<Startup | undefined> {
    const log = await readFile(join(userDataDir, 'mandor.log'), 'utf8').catch(() => '');
    const last = log.split('\n').findLast((line) => line.includes(`${MARK}host-start=`));

    if (last === undefined) {
        return undefined;
    }

    const stages = [...last.slice(last.indexOf(MARK) + MARK.length).matchAll(/(\S+)=(\d+)/g)];

    return Object.fromEntries(stages.map(([, name = '', ms = '0']) => [name, Number(ms)]));
}
