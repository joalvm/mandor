# syntax=docker/dockerfile:1
# Ubuntu matches the Linux runner family; Node and npm match the local toolchain.
FROM node:26.13.0-bookworm-slim AS node
FROM ubuntu:24.04 AS base

# xz-utils and binutils: the deb target of electron-builder packs with `tar -J` and `ar`.
# libatomic1: Node needs it to start.
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates git xvfb xauth dbus libgtk-3-0 libnss3 libatomic1 libasound2t64 \
    libgbm1 libdrm2 libxss1 libxtst6 libatk-bridge2.0-0 libx11-xcb1 \
    fonts-liberation xz-utils binutils \
    && rm -rf /var/lib/apt/lists/*
COPY --from=node /usr/local/ /usr/local/

# What npm reads to install: the lockfile, every manifest and the package an override points at,
# each where it sits. Any edit runs
# this stage again, but what it hands on changes only with a manifest, so the install below is
# reused across edits of code and reruns only when a dependency moves.
FROM base AS manifests
WORKDIR /src
COPY . .
RUN mkdir /manifests \
    && cp package.json package-lock.json /manifests/ \
    && find apps packages -mindepth 2 -maxdepth 2 -name package.json -exec cp --parents {} /manifests/ \; \
    && cp --parents packages/transport-async/vendor/parseuri/* /manifests/

FROM base
WORKDIR /workspace
ENV CI=true TURBO_TELEMETRY_DISABLED=1
COPY --from=manifests --chown=ubuntu:ubuntu /manifests/ ./
# Cache downloads only; npm ci still installs the exact lockfile in Linux.
RUN --mount=type=cache,target=/root/.npm \
    --mount=type=cache,target=/root/.cache/electron \
    npm ci --foreground-scripts && chown -R ubuntu:ubuntu /workspace
# The snapshot includes uncommitted edits. It never mounts Windows node_modules.
COPY --chown=ubuntu:ubuntu . .
USER ubuntu
ENTRYPOINT ["bash", "tools/ci/run-local-ci.sh"]
CMD ["npm", "run", "verify"]
