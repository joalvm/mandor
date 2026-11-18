import { app } from 'electron';

/**
 * A variable of the environment that only a run from the source may set: the development server,
 * the runs that stand in for the user. An installed app reads none of them, so nothing outside it
 * can point the window, bridge and all, at a page of its own, or land a save where the user did
 * not pick. The same reason the fuses of the installer turn off `NODE_OPTIONS`.
 */
export function unpackagedVariable(name: string): string | undefined {
    if (app.isPackaged) {
        return undefined;
    }

    return process.env[name];
}
