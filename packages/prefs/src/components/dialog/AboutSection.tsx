import { useTranslator } from '@mandor/i18n';
import { CopyIcon, ExternalLinkIcon } from '@mandor/icons';
import type { AppAbout } from '@mandor/ipc';
import { bridge, fireAndForget, useMarkedCopy } from '@mandor/shell';
import { Button } from '@mandor/ui';
import { useEffect, useId, useState } from 'react';

import { aboutReport } from '../../lib/about-report.js';

/** The names the systems go by; one this table does not know is shown as Node names it. */
const PLATFORM_NAME: Readonly<Partial<Record<string, string>>> = {
    darwin: 'macOS',
    linux: 'Linux',
    win32: 'Windows',
};

type AboutPartProps = { about: AppAbout };

type AboutMarkProps = { src: string };

/** The mark of the app over its name. It is decoration: the name under it says the same. */
function AboutMark({ src }: AboutMarkProps) {
    if (src === '') {
        return null;
    }

    return <img alt="" className="size-icon-app" data-part="about-mark" src={src} />;
}

/**
 * What runs the app, one fact under another, each named above its value. The values can be
 * selected, so one of them goes into a message without copying the whole report.
 */
function AboutFacts({ about }: AboutPartProps) {
    const translate = useTranslator();
    const system = `${PLATFORM_NAME[about.platform] ?? about.platform} ${about.system}`;
    const facts = [
        { key: 'preferences:aboutVersion', value: about.version },
        { key: 'preferences:aboutElectron', value: about.electron },
        { key: 'preferences:aboutChromium', value: about.chrome },
        { key: 'preferences:aboutNode', value: about.node },
        { key: 'preferences:aboutSystem', value: system },
        { key: 'preferences:aboutArch', value: about.arch },
    ] as const;

    return (
        <dl className="flex flex-col items-center gap-gap-group" data-part="about-facts">
            {facts.map(({ key, value }) => (
                <div
                    className="flex flex-col items-center gap-gap-tight"
                    data-part="about-fact"
                    key={key}
                >
                    <dt className="text-xs text-text-secondary">{translate(key)}</dt>
                    <dd className="text-sm whitespace-nowrap text-text-primary tabular-nums select-text">
                        {value}
                    </dd>
                </div>
            ))}
        </dl>
    );
}

/** Puts the whole report on the clipboard, and says it did for as long as it takes to read. */
function CopyAboutButton({ about }: AboutPartProps) {
    const translate = useTranslator();
    const { copied, copy } = useMarkedCopy();

    return (
        <Button
            onClick={() => {
                copy(aboutReport(about));
            }}
            size="sm"
        >
            <CopyIcon size="sm" />
            {translate(copied ? 'preferences:aboutCopied' : 'preferences:aboutCopy')}
        </Button>
    );
}

/**
 * What opens outside the window, each with the arrow that says so. The licenses are opened by
 * main, which is the one that knows where the install keeps them: the window names no path.
 */
function AboutLinks() {
    const translate = useTranslator();

    return (
        <div className="flex flex-col items-center gap-gap-tight" data-part="about-links">
            <Button
                onClick={() => {
                    fireAndForget(bridge.update.openPage());
                }}
                size="sm"
                variant="ghost"
            >
                {translate('preferences:aboutWebsite')}
                <ExternalLinkIcon size="sm" />
            </Button>
            <Button
                onClick={() => {
                    fireAndForget(bridge.app.openLicenses());
                }}
                size="sm"
                variant="ghost"
            >
                {translate('preferences:aboutLicenses')}
                <ExternalLinkIcon size="sm" />
            </Button>
        </div>
    );
}

/**
 * Which app this is, read down the middle: its mark and its name, then what version runs and
 * what it runs on, then the way to put all of it in a report of a fault and what lies outside.
 * The section needs no heading of its own: the name of the app is the heading.
 */
export function AboutSection() {
    const nameId = useId();
    const [about, setAbout] = useState<AppAbout | undefined>();

    useEffect(() => {
        let live = true;

        fireAndForget(
            bridge.app.about().then((result) => {
                if (live && result.ok) {
                    setAbout(result.value);
                }
            }),
        );

        return () => {
            live = false;
        };
    }, []);

    if (about === undefined) {
        return null;
    }

    return (
        <section
            aria-labelledby={nameId}
            className="flex flex-col items-center gap-gap-section py-pad-dialog text-center"
            data-part="about"
        >
            <div className="flex flex-col items-center gap-gap-control" data-part="about-identity">
                <AboutMark src={about.icon} />
                <h3 className="text-lg font-semibold text-text-primary" id={nameId}>
                    {about.name}
                </h3>
            </div>
            <AboutFacts about={about} />
            <div className="flex flex-col items-center gap-gap-control" data-part="about-actions">
                <CopyAboutButton about={about} />
                <AboutLinks />
            </div>
        </section>
    );
}
