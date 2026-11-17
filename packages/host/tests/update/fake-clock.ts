import type { UpdateTimers } from '../../src/update/update-schedule.js';

type Job = { at: number; run: () => void; period?: number };

/** A clock that moves only when the test says so. */
export function fakeClock() {
    let now = 0;
    let next = 0;
    const jobs = new Map<number, Job>();
    const add = (job: Job) => {
        next += 1;
        jobs.set(next, job);

        const id = next;

        return () => {
            jobs.delete(id);
        };
    };

    const timers: UpdateTimers = {
        after: (run, ms) => add({ at: now + ms, run }),
        every: (run, ms) => add({ at: now + ms, run, period: ms }),
    };

    const dueBefore = (end: number) =>
        [...jobs.entries()].filter(([, job]) => job.at <= end).sort((a, b) => a[1].at - b[1].at)[0];

    return {
        timers,
        pending: () => jobs.size,
        advance: (ms: number) => {
            const end = now + ms;

            for (let due = dueBefore(end); due !== undefined; due = dueBefore(end)) {
                const [id, job] = due;

                now = job.at;
                job.run();

                if (job.period === undefined) {
                    jobs.delete(id);
                } else {
                    job.at += job.period;
                }
            }

            now = end;
        },
    };
}
