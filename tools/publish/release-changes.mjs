/**
 * The title a squash leaves on `main`: `type(scope): text`, and the number of its pull request
 * when GitHub appended one.
 */
const SUBJECT =
    /^(?<type>[a-z]+)(?:\((?<scope>[a-z0-9@/-]+)\))?: (?<text>.+?)(?: \(#(?<pr>\d+)\))?$/u;

/**
 * What a person who installs the app reads, in this order, and how far each one moves the
 * version. A dependency counts when it is one the app ships: the paths say so before this does.
 * Tooling, docs, tests and a change of form leave the app as it was and stay out.
 */
const SECTIONS = [
    { kind: 'feat', title: 'Novedades', bump: 'minor' },
    { kind: 'fix', title: 'Correcciones', bump: 'patch' },
    { kind: 'deps', title: 'Dependencias', bump: 'patch' },
];

const KIND_OF_TYPE = { feat: 'feat', fix: 'fix' };

function kindOf(type, scope) {
    if (type === 'build' && scope?.startsWith('deps') === true) {
        return 'deps';
    }

    return KIND_OF_TYPE[type];
}

/** The change a commit makes to the app, or nothing when the app is the same after it. */
export function changeOf(subject) {
    const match = SUBJECT.exec(subject);

    if (match === null) {
        return undefined;
    }

    const { type, scope, text, pr } = match.groups;
    const kind = kindOf(type, scope);

    return kind === undefined ? undefined : { kind, text, pr };
}

/** The changes among the titles of a range of commits, newest first as git lists them. */
export function changesOf(subjects) {
    return subjects.map(changeOf).filter((change) => change !== undefined);
}

/** How far the changes move the version: a feature is a minor, anything else a patch. */
export function bumpOf(changes) {
    return SECTIONS.find((section) => changes.some((change) => change.kind === section.kind))?.bump;
}

function lineOf(change) {
    const text = `${change.text.charAt(0).toUpperCase()}${change.text.slice(1)}`;

    return change.pr === undefined ? `- ${text}` : `- ${text} (#${change.pr})`;
}

function sectionOf(section, changes) {
    const lines = changes.filter((change) => change.kind === section.kind).map(lineOf);

    return lines.length === 0 ? [] : [`## ${section.title}`, '', ...lines, ''];
}

/**
 * The notes of a release: what changed for the person who installs it, how to check where the
 * files came from, since nothing is signed by a certificate, and the full comparison.
 */
export function releaseNotes({ changes, repository, compare }) {
    const body = SECTIONS.flatMap((section) => sectionOf(section, changes));
    const check = [
        'Sin firma de certificado: el origen de cada archivo se comprueba con',
        `\`gh attestation verify <archivo> --repo ${repository}\`, y su suma está en \`SHA256SUMS\`.`,
    ].join(' ');
    const tail = compare === undefined ? [] : ['', `**Cambios:** ${compare}`];

    return [...body, check, ...tail, ''].join('\n');
}
