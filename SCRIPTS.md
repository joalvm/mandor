# Scripts

A script is a short piece of JavaScript you write in Mandor, hooked to one moment of a request or
of a connection. It reads what is being sent or received, sets variables, writes tests, logs to the
console and, where the moment allows it, changes what goes out.

Scripts run inside a sandboxed interpreter (QuickJS compiled to WebAssembly) in a worker thread.
They have no file system, no network of their own, no modules, no timers and no access to Node or
to the window. Everything they can do goes through the objects listed below.

## Where scripts live

| App             | Moments                                                                                    | Where you write them                                   |
| --------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| Mandor Request  | `onBeforeRequest` (Before the request), `onResponse` (After the response)                  | Scripts section of a request, a folder or a collection |
| Mandor Realtime | `onBeforeConnect` (Before connecting), `onConnect` (On connect), `onMessage` (On messages) | Scripts section of the connection settings             |

Each place holds at most one script per moment, with its own Enabled switch. In Mandor Request the
scripts of a moment run as a chain, from the collection down to the folders and then the request.

Scripts are saved in the same files as the request, folder, collection or connection, so they sync
with everything else.

## The API

Every moment has the four names of JavaScript a script expects, `console`, `atob`, `btoa` and
`URLSearchParams`, and one object, `mandor`, with what Mandor gives. Every moment has
`mandor.variables`, `mandor.test` and `mandor.expect`; the rest of `mandor` depends on the moment:

| Moment            | Also in `mandor`                                                          |
| ----------------- | ------------------------------------------------------------------------- |
| `onBeforeRequest` | `request` (writable), `sendRequest`                                       |
| `onResponse`      | `request` (read only), `response`, `sendRequest`                          |
| `onBeforeConnect` | `request` (writable: url, query and headers), `sendRequest`               |
| `onConnect`       | `socket`, `sendRequest`                                                   |
| `onMessage`       | `message`, `socket` (no `sendRequest`: a frame never starts an HTTP call) |

A name of `mandor` that the moment does not have is `undefined`. Your own
names never clash with the API: `const response = await mandor.sendRequest(…)` and even
`const mandor = 1` are fine.

There is no `require`, `import`, `fetch`, `setTimeout`, `setInterval`, `pm`, `insomnia` or `bru`.

### `mandor.variables`

- `mandor.variables.get(name)` gives the value of a variable, or `undefined`. A variable marked
  secret is never readable: `get` gives `undefined` and the console says why.
- `mandor.variables.has(name)` says whether the variable exists, secret or not.
- `mandor.variables.set(name, value)` sets a script variable. The value is turned into text.
- `mandor.variables.replaceIn(text)` fills `{{name}}` placeholders with the values a script may
  read. A secret placeholder stays as written.

Script variables live in memory, per origin, workspace and environment. They are never written to
disk, never synced, and they are gone when Mandor closes. They rank above the environment, so a
request after the script sees them. The command **Forget what scripts set** clears them.

### `mandor.request`

- `mandor.request.url`, `mandor.request.method`: text. `{{var}}` placeholders are shown as written.
- `mandor.request.headers` and `mandor.request.query`: `get(name)` gives the first value, `has(name)` asks. Where
  the request is writable, `set(name, value)` replaces or adds and `delete(name)` removes. Header
  names match in any case. Headers include the ones inherited from the collection and folders, and
  `delete` removes those too.
- `mandor.request.body`: the body as text when its type is JSON, text or XML (an empty body becomes text
  when written). Any other type (form, multipart, file, GraphQL) reads as `undefined` and cannot be
  written; the console says so.

Auth, TLS, proxy and settings are not part of `mandor.request`. In Mandor Realtime, a script cannot write
the auth or the subprotocols of a connection.

### `mandor.response`

`mandor.response.status`, `mandor.response.time` (milliseconds),
`mandor.response.headers.get(name)` and `.has(name)`, `mandor.response.text()` and
`mandor.response.json()`. A body over 2 MiB gives `undefined` from `text()` and
`json()`, with a line in the console. It is never cut silently.

### `mandor.test` and `mandor.expect`

`mandor.test(name, body)` declares a case. A case that throws, or whose promise is rejected, fails; the
cases after it still run. Results show in the Tests tab of the response (Mandor Request) or in the
activity line of the scripts (Mandor Realtime).

`mandor.expect(value)` is a small subset of chai's `expect`, with the same meaning:

- Chain words that say nothing: `to`, `be`, `been`, `is`, `that`, `and`, `have`, `has`, `with`,
  `of`. `not` flips what follows.
- `equal(x)`: strict equality (`===`).
- `eql(x)`: deep equality of values, arrays and plain objects.
- `include(x)`: a substring of a string, an item of an array (strict), or every key and value of
  `x` in an object.
- `match(regexp)`: a string that matches.
- `a(type)`, `an(type)`: the type, by name: `'string'`, `'number'`, `'boolean'`, `'object'`,
  `'array'`, `'null'`, `'undefined'`, `'regexp'`…
- `property(name)` and `property(name, value)`: the property exists, and has that value (strict).
- `lengthOf(n)`, `above(n)`, `below(n)`.
- Flags read as properties: `true`, `false`, `null`, `undefined`, `exist`.

A failed assertion throws an `AssertionError` that says what was expected and what was received.
Plugins, `should`, `assert` and the rest of chai are not there.

### `console`

`console.log`, `info`, `warn` and `error`. Lines go to the console panel, opened from the status
bar. Each line is cut at 4 KiB, and all the output of a run at 1 MiB, with a mark.

### `atob`, `btoa`, `URLSearchParams`

`btoa` encodes text whose characters are all Latin-1, as in a browser: any other character throws.
`URLSearchParams` takes a query string, a list of pairs or an object, and has `append`, `delete`,
`get`, `getAll`, `has`, `set`, `toString`, `entries`, `keys`, `values` and iteration.

### `mandor.sendRequest`

`await mandor.sendRequest({ url, method, headers, body })` makes an HTTP or HTTPS call and gives
back an object shaped like `mandor.response`. A failure rejects with the reason.

- Main makes the call, with the proxy and the client certificates of this machine. The script does
  not choose them and cannot read them. It reaches what you reach, `localhost` included.
- No secret is resolved in it, no cookie jar is used, and redirects are not followed.
- Up to 10 calls per run, failed ones included; 10 seconds and 1 MiB each.

### `mandor.socket` and `mandor.message` (Mandor Realtime)

- `mandor.socket.send(text)` sends a text frame on the open connection. Placeholders are not resolved.
  Up to 10 per run and 100 per second per connection. Over Socket.IO it emits the `message` event.
- `mandor.message.text`, `mandor.message.direction` (`'incoming'` or `'outgoing'`),
  `mandor.message.binary` and `mandor.message.event` (the Socket.IO event name) describe the
  frame. Binary frames carry no bytes.

## Limits

| Limit                                 | Value                             |
| ------------------------------------- | --------------------------------- |
| Running time of one script            | 5 s, counting only while it runs  |
| A whole chain, network waits included | 30 s                              |
| Scripts in one chain                  | 32                                |
| Memory                                | 64 MiB                            |
| Size of a script                      | 1 MiB (a longer one does not run) |
| Body a script reads or writes         | 2 MiB                             |
| Script variables                      | 200, 64 KiB each, 2 MiB per scope |
| Messages waiting for `onMessage`      | 100, or 8 MiB, per connection     |

A script that goes past its time or memory is stopped. Messages that arrive while the queue of
`onMessage` is full are not run, and the activity counts them as dropped.

## When something fails

- `onBeforeRequest` fails or runs out of time: the request does not go out. **Send without scripts**
  sends it as it is.
- `onResponse` fails: the response is shown anyway.
- `onBeforeConnect` fails: the connection does not open. **Connect without scripts** opens it.
- `onConnect` or `onMessage` fails: the connection stays open, and the activity shows the error.

## Approval

A script you type in Mandor runs. A script that arrives in any other way does not run until you
approve it on this machine: one imported, pulled from the shared origin, or changed on disk by
something other than you. The Scripts section shows a band, **It does not run until you approve
it**, with an **Approve** button. A send runs the approved scripts of its chain and leaves the
others out, telling you which.

Approval is kept per machine, per workspace, per place and per moment, for that exact text. Editing
a text you approved keeps it approved; a text you did not approve stays unapproved while you edit
it. **Forget approvals**, in the Scripts settings, asks for every script again.

**Run scripts**, in the same settings, switches every script off at once without deleting or
unapproving anything. It is there for a fault in the engine; the console counts what did not run.

## Secrets

A value you marked secret in an environment travels only where you wrote it, and to a destination
no script chose.

- A script cannot read a secret. It can know that the variable exists.
- A field a script wrote resolves without secrets: `{{token}}` stays literal there. Fields the script
  did not touch resolve as usual.
- If a script changes the destination (host, port, scheme, or the `Host` header), the whole send
  goes without secrets and is marked. If the host comes from a login response, put it in the
  environment: then the destination is yours and the secrets go along.
- If a send a script influenced is redirected to another site, the headers that carry a secret are
  dropped, `Authorization` included. Where dropping them is not enough (a secret in the body of a
  307 or 308, or in the URL of the redirect) the redirect is not followed.
- A Socket.IO connection that may fall back to polling, and whose handshake a script influenced,
  opens without secrets for its whole life: polling follows redirects. Choose **WebSocket only** in
  the connection to avoid it.
- What a script receives (responses, the request sent) has the secrets of the session blanked out in
  the forms Mandor knows: as text, in a URL, in base64, in JSON. Not in every transformation. A very
  short secret blanks out every occurrence of its text.

## What approval promises, and what it does not

- Approving says who wrote the text on this machine. It does not say the script is harmless.
- An HTTP call that went out cannot be undone. An approved script can delete on a server whatever
  its request is allowed to delete.
- A token a script saves from a login is a script variable, not a secret. It shows in the console
  and in the hover of `{{name}}`, and it is gone when Mandor closes.
- What a script prints is cleaned of known secrets before it reaches the window, in the forms listed
  above.

## Not supported

- Computing with a secret: an HMAC signature with a secret key, or refreshing a token with a secret
  `client_secret` or password. A script cannot read the secret, by design. SHA written in plain
  JavaScript runs, on data that is not secret. There is no built-in hash.
- OAuth 2 is built in for client credentials and PKCE. There is no password grant.
- Timers, modules, workspace-level scripts, a runner, keeping script variables after Mandor closes.

## Patterns

**Login, then use the token.** A separate login request carries its own secret. Its `onResponse`
saves the token:

```js
const body = mandor.response.json();
mandor.variables.set('token', body.access_token);
```

The requests after it use `{{token}}` in their auth or headers.

**A login that also gives the host** (for example an `instance_url`): put the host in the
environment by hand, not from the script. A host chosen by a script receives no secrets.

**Cookies.** `mandor.sendRequest` uses no cookie jar. Read the `set-cookie` header of the answer and send
it on yourself:

```js
const login = await mandor.sendRequest({ url: 'https://api.example.com/login', method: 'POST' });
const cookie = login.headers.get('set-cookie');
if (cookie !== undefined) {
    mandor.request.headers.set('Cookie', cookie.split(';')[0]);
}
```

**Body by type.** Check what the body is before writing it:

```js
if (mandor.request.body !== undefined) {
    const data = JSON.parse(mandor.request.body);
    data.sentAt = new Date().toISOString();
    mandor.request.body = JSON.stringify(data);
}
```

## Scripts from other apps

Importing never runs anything. Postman and Insomnia scripts arrive as text, marked with the app
they came from, and are exported back to the same format untouched. They show under the scripts of
the request, folder or collection, and the import tells you how many there are to adjust. Bruno
scripts are not read on import: the import notes where they were left out.

The pencil button moves an imported script into the script of the same moment, as it is: nothing
is translated. If a script was already there, the imported text goes after it, past a blank line.
The moved text does not run until you approve it, so you can adjust it first.

There is no compatibility layer: `pm`, `insomnia` and `bru` do not exist in Mandor, and a script that
uses them fails with a `ReferenceError`. A translation would run foreign code as
soon as it was imported, and would read secrets that Mandor keeps away from scripts.

Common Postman calls and what to write instead:

- `pm.environment.get('x')`, `pm.variables.get('x')`, `pm.collectionVariables.get('x')` → `mandor.variables.get('x')`.
- `pm.environment.set('x', v)`, `pm.variables.set('x', v)` → `mandor.variables.set('x', v)`. It is a script
  variable: it lasts until Mandor closes and is never written to the environment.
- `pm.variables.replaceIn(text)` → `mandor.variables.replaceIn(text)`.
- `pm.test('name', fn)` → `mandor.test('name', fn)`.
- `pm.expect(x)` → `mandor.expect(x)`, within the subset above.
- `pm.response.code` → `mandor.response.status`; `pm.response.json()` → `mandor.response.json()`;
  `pm.response.text()` → `mandor.response.text()`; `pm.response.responseTime` → `mandor.response.time`;
  `pm.response.headers.get('x')` → `mandor.response.headers.get('x')`.
- `pm.request.url` → `mandor.request.url`; `pm.request.headers.add`, `.upsert` → `mandor.request.headers.set`;
  `pm.request.headers.remove` → `mandor.request.headers.delete`; `pm.request.body.raw` → `mandor.request.body`.
- `pm.sendRequest(options, callback)` → `await mandor.sendRequest(options)`, with a promise instead of a
  callback.
- `console.log` → `console.log`.

With no equivalent: `pm.globals`, `pm.iterationData`, `pm.info`, `pm.cookies`, `pm.vault`,
`pm.execution.setNextRequest`, `pm.visualizer`, `pm.require` and the bundled libraries (lodash,
moment, cheerio, crypto-js, ajv, xml2js, uuid…), `setTimeout`, and anything that reads a secret.
