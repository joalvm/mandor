/** Long options that rewrite or remove what the origin holds, spelled in full. */
const FORCING_OPTIONS = [
    '--force',
    '--force-with-lease',
    '--force-if-includes',
    '--mirror',
    '--delete',
    '--prune',
];

/** Short options with the same effect: `-f` forces and `-d` deletes. */
const FORCING_LETTERS = ['f', 'd'];

/**
 * Whether a git call is a push that could throw away commits Mandor did not write: forcing,
 * mirroring, deleting or pruning, in any spelling git accepts. The repo belongs to the user and
 * the origin to whoever else writes to it, so Mandor refuses these on every path, not just on
 * the ones that happen not to use them today.
 *
 * Git takes any unambiguous abbreviation of a long option (`--forc`), so an option that is the
 * start of a forcing one counts as that one. A refspec that starts with `+` forces its update
 * and one that starts with `:` deletes the ref.
 */
export function isForcingPush(args: readonly string[]): boolean {
    const at = args.indexOf('push');

    if (at < 0) {
        return false;
    }

    return args.slice(at + 1).some(forcesPush);
}

function forcesPush(arg: string): boolean {
    if (arg.startsWith('--')) {
        return abbreviatesForcing(arg.slice(2).replace(/=.*/, ''));
    }

    if (arg.startsWith('-')) {
        return FORCING_LETTERS.some((letter) => arg.slice(1).includes(letter));
    }

    return arg.startsWith('+') || arg.startsWith(':');
}

function abbreviatesForcing(name: string): boolean {
    return FORCING_OPTIONS.some((option) => option.slice(2).startsWith(name));
}
