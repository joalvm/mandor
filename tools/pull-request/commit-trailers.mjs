const COAUTHOR = /^co-authored-by:/im;

/** This repository does not use the trailer, in any commit. The history names the change. */
export function trailerProblems(messages) {
    return messages
        .filter((message) => COAUTHOR.test(message))
        .map((message) => `Commit "${message.split('\n')[0]}" carries a Co-Authored-By trailer.`);
}
