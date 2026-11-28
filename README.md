<div align="center">

<img src="apps/sync/resources/icon.png" width="88" alt="Mandor Request" />&nbsp;&nbsp;&nbsp;<img src="apps/async/resources/icon.png" width="88" alt="Mandor Realtime" />

# Mandor

**API clients that live on your disk.**

No account. No cloud of ours. No telemetry.<br />
Your requests, sockets and secrets stay on your machine, in files you can read.

**English** · [Español](README.es.md) · [Website](https://joalvm.github.io/mandor/)

</div>

---

> [!NOTE]
> **Unsigned installers.** The installers carry no code-signing certificate yet: Windows and
> macOS ask once before they open them. [Install](#install) says how, and how to check that a
> file is the one this repository built. To hear of each release: **Watch → Custom → Releases**.

## Why Mandor

Most API clients started as tools and became platforms: a login before the first request, your
collections in someone else's cloud, a plan for the feature you used yesterday.

Mandor goes the other way.

- **Open it and work.** There is no sign-up, because there is nothing to sign up to.
- **Your work is files.** Plain YAML and Markdown in a folder you own. Read them, diff them, back
  them up, delete the app and keep everything.
- **Team sync without a vendor.** Point a workspace at a repository you already have. Mandor keeps
  it in sync in the background, with your credentials. No commands, no jargon, no seats.
- **Two focused apps instead of one crowded one.** A request and a live socket are different
  jobs. Each gets a workbench built for it.

## Two apps, one family

|                                                               |                                                                                                                                                                                                                                  |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| <img src="apps/sync/resources/icon.png" width="64" alt="" />  | **Mandor Request** — for everything that answers once.<br />HTTP and GraphQL, with history, cookies, OAuth 2.0, response examples, schema validation and code snippets. Imports OpenAPI, Postman, HAR and curl.                  |
| <img src="apps/async/resources/icon.png" width="64" alt="" /> | **Mandor Realtime** — for everything that keeps talking.<br />WebSocket and Socket.IO (v2 to v4, acknowledgements included), with a live activity log, reconnection, session recording and per-message schemas. Speaks AsyncAPI. |

They share collections, environments, docs and sync, and install separately. Use one or both.

## What you get

**Collections that carry their context.** Folders hold their own docs, variables, auth and
headers, and everything below inherits them.

**Environments and variables.** `{{variables}}` anywhere, resolved per environment. Mark a value
as secret and it goes to your operating system's secure storage: it is never written to your
files and never synced.

**Sync you do not have to think about.** Changes from two people are merged field by field. When
both edited the same thing, Mandor shows the two versions side by side and you choose. It never
overwrites history on the other end.

**Scripts, sandboxed.** Run JavaScript before and after a request to sign, chain or assert. Scripts
run in an isolated sandbox: no file system, no modules, no access to the app. A script that
arrived from someone else does not run until you approve it on your machine.

**Bring your work with you.** Import and export whole workspaces from Postman, Insomnia and
Bruno, plus OpenAPI and AsyncAPI documents.

**Docs next to the calls.** Markdown pages live in the workspace, beside the requests they
explain.

**A real desktop tool.** Tabs, split panes, a command palette and keyboard-first
navigation. English and Spanish.

## Your data, in the open

```text
mandor.yaml
workspaces/
  payments/
    collections/     requests and events, one file each
    environments/    variables per environment, secrets excluded
    connections/     sockets (Mandor Realtime)
    docs/            Markdown pages
```

No database, no binary blobs, no lock-in. If Mandor disappeared tomorrow, your work would still
open in any text editor.

## Principles

- **Local first.** Everything works offline, forever. Nothing that works locally today will
  ever require a server.
- **No account.** Not now, not as an upsell later.
- **No telemetry.** The apps send nothing about you or your work. Besides the traffic you send,
  they only ask GitHub whether a newer version exists, and in **Manual** mode not even that until
  you ask.
- **Secrets stay put.** A value you mark as secret never leaves your machine.
- **Nothing runs behind your back.** Code you did not write does not execute until you say so.

## Platforms

Windows (installer), macOS (dmg) and Linux (AppImage, deb). Updates arrive through stable and
beta channels, and you pick which; an install of a beta follows the betas until you pick stable.
On Windows and from the AppImage the app updates itself. On macOS and from the deb it tells you
of a new version and opens the page to download it.

## Install

Each app has its own releases: the [website](https://joalvm.github.io/mandor/#download) offers the
latest of **Mandor Request** and of **Mandor Realtime**, and
[Releases](https://github.com/joalvm/mandor/releases) lists them all. Until the apps carry a certificate, the system
asks before the first launch:

- **Windows.** SmartScreen says it protected your PC: choose **More info → Run anyway**. With
  Smart App Control on, Windows does not run an unsigned app at all.
- **macOS.** The first launch is refused. Open **System Settings → Privacy & Security** and
  choose **Open Anyway** next to the name of the app. It asks once.
- **Linux.** Make the AppImage executable and run it, or install the deb with
  `sudo apt install ./<file>.deb`.

Every release carries `SHA256SUMS` and a provenance attestation: GitHub signs that each file came
out of this repository's release workflow, at that tag. With the
[GitHub CLI](https://cli.github.com):

```sh
gh attestation verify <file> --repo joalvm/mandor
```

## Contributing

Pull requests are welcome. [CONTRIBUTING.md](CONTRIBUTING.md) explains how the code is laid out
and which gates a change has to pass; your first pull request asks you to sign the
[CLA](CLA.md). How scripts work and what their sandbox allows: [SCRIPTS.md](SCRIPTS.md).
Vulnerabilities are reported privately, as [SECURITY.md](SECURITY.md) describes.

## Open source

Mandor is free software under the [GNU Affero General Public License v3.0 only](LICENSE).
Copyright (C) 2026 Alejandro Vilchez.

Issues are open: tell us what your current client gets wrong.

The names and logos are trademarks and are not covered by the license: see
[TRADEMARKS.md](TRADEMARKS.md).
