import { describe, expect, it } from 'vitest';

import {
    applyChromiumLimits,
    CHROMIUM_LIMITS,
    REGEX_FLAGS,
} from '../../src/runtime/chromium-limits.js';

type Appended = [name: string, value: string | undefined];

type CommandLineSpy = {
    appended: Appended[];
    appendSwitch: (name: string, value?: string) => void;
};

function spyCommandLine(): CommandLineSpy {
    const appended: Appended[] = [];

    return {
        appended,
        appendSwitch: (name, value) => {
            appended.push([name, value]);
        },
    };
}

function limit(name: string): string | undefined {
    return CHROMIUM_LIMITS.find(([switchName]) => switchName === name)?.[1];
}

describe('the chromium limits', () => {
    /** A leak that hits a ceiling is a bug report. A leak without one is a machine at eight gigs. */
    it('caps the v8 old space well under what the machine would hand out', () => {
        expect(limit('js-flags')).toContain('--max-old-space-size=512');
    });

    /** A young generation too small promotes short-lived objects into the space that never shrinks. */
    it('pins the semi space instead of leaving the size to v8', () => {
        expect(limit('js-flags')).toContain('--max-semi-space-size=16');
    });

    it('bounds the disk cache instead of letting it grow with use', () => {
        expect(limit('disk-cache-size')).toBe(String(50 * 1024 * 1024));
    });

    /** A frame the server shapes for a pattern of the document would freeze the window. */
    it('lets the windows read a regex that backtracks too much with the linear engine', () => {
        expect(limit('js-flags')).toContain(REGEX_FLAGS);
    });

    it('appends every limit to the command line it is given', () => {
        const commandLine = spyCommandLine();

        applyChromiumLimits(commandLine);

        expect(commandLine.appended).toEqual([...CHROMIUM_LIMITS]);
    });
});
