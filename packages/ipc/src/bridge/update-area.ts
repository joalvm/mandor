import type { Empty, Result } from '../result/result.js';
import type { UpdateConfigureRequest } from '../update/update-configure.js';
import type { UpdateState } from '../update/update-state.js';

/**
 * What the window asks of the updates and hears about them. Main owns the state: the window asks
 * for it once, and every change after that arrives as a push of the whole of it.
 */
export type UpdateArea = {
    state: () => Promise<Result<UpdateState>>;
    /** Hands over the mode and the channel the person chose, so main looks as they asked. */
    configure: (input: UpdateConfigureRequest) => Promise<Result<Empty>>;
    /** Looks for a new version now. Answers when the look is over, not when it found something. */
    check: () => Promise<Result<Empty>>;
    /** Downloads the version found. Answers when the download is over. */
    download: () => Promise<Result<Empty>>;
    /** Settles what is written, installs the version downloaded and opens the app again. */
    install: () => Promise<Result<Empty>>;
    /** Opens the page of the app where a version can be taken, for the installs that cannot. */
    openPage: () => Promise<Result<Empty>>;
    /** The state changed in main. The push carries the whole state, never a difference. */
    onChanged: (handler: (state: UpdateState) => void) => () => void;
};
