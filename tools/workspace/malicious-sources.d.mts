/** The attack text of the hostile repo: the one place every name and console line lives. */

/** The file the escapes try to plant outside the repo: absent means the sandbox held. */
export const ATTACK_MARK: string;

/** Every visible name and console line the specs wait for. */
export const ATTACK: {
    readonly originName: string;
    readonly collection: string;
    readonly folder: string;
    readonly connections: {
        readonly spy: string;
        readonly siphon: string;
        readonly echo: string;
        readonly loop: string;
        readonly bomb: string;
    };
    readonly requests: {
        readonly steal: string;
        readonly redirect: string;
        readonly loop: string;
        readonly bomb: string;
        readonly dynamicImport: string;
        readonly trojan: string;
    };
    readonly marks: {
        readonly batch: string;
        readonly folder: string;
        readonly steal: string;
        readonly redirect: string;
        readonly loop: string;
        readonly bomb: string;
        readonly siphon: string;
        readonly echo: string;
        readonly trojan: string;
    };
    /** The Unicode bidi override the trojan text hides behind: `U+202E`. */
    readonly RLO: string;
    readonly secretName: string;
    readonly stealPath: string;
    readonly hopPath: string;
    readonly sentPath: string;
    readonly importedPath: string;
};

/** The one workspace the hostile repo holds, and the environment its secret is declared in. */
export const HOSTILE_WORKSPACE: string;
export const HOSTILE_ENVIRONMENT: string;

/** Every try at the machinery of the host, one console line each. */
export function escapeBatch(evilHttp: string): string;

/** One chain script per family of theft on the request side. */
export function syncScripts(evilHttp: string): {
    folder: string;
    steal: string;
    redirect: string;
    loop: string;
    bomb: string;
    dynamicImport: string;
    trojan: string;
};

/** The three moments a connection can hook, wired the way a thief would wire them. */
export function asyncScripts(evilHttp: string): {
    spy: string;
    siphon: string;
    echo: string;
    loop: string;
    bomb: string;
};
