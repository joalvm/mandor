import { serveScripts } from '@mandor/host/script-worker';

// The bundle every script runs in, beside main. A script is text of the user: here it runs against
// a clock and a ceiling of memory, in a thread that main can end, and main stays free.
serveScripts();
