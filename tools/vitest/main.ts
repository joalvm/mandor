// What the node files of a worker owe each other on top of the hygiene: main as a new process
// finds it. Main keeps one session per process, in module state: the origin it works in and the
// secrets it has learned. The files of a worker share their modules, so a file that resolved a
// secret and never forgot it handed the next file a session that already hid a value it never
// saw, and a test that a session starts with nothing to hide failed in one order and passed in
// another. Each file starts with no origin open and nothing learned.
//
// The two modules are reached by their path and not through `@mandor/host/testing`: that export
// loads the IPC contract and the variables, and what a setup loads runs for every file, so every
// pure file it touches would count as covered without a test of its own.
import { setActiveOrigin } from '../../packages/host/src/origin/active-origin.js';
import { forgetSessionSecrets } from '../../packages/host/src/secret/session-secrets.js';

setActiveOrigin(null);
forgetSessionSecrets();
