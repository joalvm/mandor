import type { BodyPart, BodyPartKind } from './curl-body-part.js';
import type { CurlArg } from './curl-args.js';

const KIND_OF: Readonly<Record<string, BodyPartKind>> = {
    data: 'data',
    'data-ascii': 'data',
    'data-raw': 'raw',
    'data-binary': 'binary',
    'data-urlencode': 'urlencode',
    json: 'json',
    form: 'form',
    'form-string': 'form-string',
};

/** The options that name a body, in order, and whether `-G` was among them. */
export function bodyPartsOf(args: readonly CurlArg[]): { parts: BodyPart[]; get: boolean } {
    const parts = args.flatMap((arg) => {
        const kind = KIND_OF[arg.name];

        return kind === undefined || arg.value === null
            ? []
            : [{ flag: arg.flag, kind, value: arg.value }];
    });

    return { parts, get: args.some((arg) => arg.name === 'get') };
}
