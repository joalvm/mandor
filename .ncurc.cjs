/**
 * What `npm run deps:upgrade` may move to: the latest stable release that has been out for three
 * days, the same wait Dependabot keeps. The rest is held on purpose.
 */
module.exports = {
    cooldown: 3,
    deep: false,
    peer: true,
    // The old protocol is why these two exist: the client reaches v2 servers, and the server tests
    // it. npm comes with Node and moves with it.
    reject: ['npm', 'socket.io-client-v2', 'socket.io-v2'],
    root: true,
    // TypeScript 7 ships no compiler API yet, and typescript-eslint, knip and dependency-cruiser read
    // the program through it. `typescript-native` is the one that moves to 7.
    target: (name) => (name === 'typescript' ? 'minor' : 'latest'),
    workspaces: true,
};
