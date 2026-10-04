# Full OpenHands Research Harness

This fork runs the complete OpenHands local product stack while loading the
sibling `openhands-research-harness` checkout as its Agent Server and SDK.
OpenHands remains the product foundation; the research harness is an extension,
not a rewrite.

## Included stack

- Agent Canvas UI
- OpenHands Agent Server and SDK from the research fork
- OpenHands Automation backend
- terminal, file editor, browser, task delegation, skills, and MCP support
- persistent OpenHands settings and conversation history
- the research evidence registry, contracts, checkpoints, and six research roles

When the sibling research SDK is installed, Canvas registers Director,
Research Worker, Source Acquisition, Evidence Extractor, Falsifier, and
Reviewer as OpenHands subagents during Agent Server startup. The import is
optional, so the Canvas fork can still run against a released upstream SDK.

## Layout

Keep the two forks next to each other:

```text
outputs/
├── openhands-research-canvas/   # this repository
└── openhands-research-harness/  # software-agent-sdk fork
```

## Start

Prerequisites are Node.js 24+, npm, uv/uvx, and Docker Desktop when Docker
conversation isolation is enabled.

```sh
cd openhands-research-canvas
npm ci
npm run dev:research
```

Use the already-built static frontend when file-watcher limits are tight:

```sh
npm run build
npm run dev:research -- --static
```

Open <http://localhost:8000>. On first use, add an LLM profile in the Canvas
settings. Provider credentials are encrypted in OpenHands state and must not be
committed to either repository.

The default research launcher uses `OH_CONVERSATION_RUNTIME=local` so the
editable SDK checkout is loaded directly. It limits the initial workspace
selection to the sibling research SDK checkout, but a local agent process still
runs with the host user's filesystem permissions. The launcher defaults uv to
Python 3.12 because the current macOS browser-tool dependency is not compatible
with Python 3.14. Set `UV_PYTHON=3.13` explicitly if desired.

## Docker-isolated conversations

Docker mode must use an Agent Server image built from the research SDK fork;
using the stock OpenHands image would omit the research package.

Build the image once from the sibling SDK checkout (Apple Silicon):

```sh
cd ../openhands-research-harness
PYTHONPATH="$PWD/openhands-sdk:$PWD/openhands-tools:$PWD/openhands-workspace:$PWD/openhands-agent-server" \
  ./.venv/bin/python \
  openhands-agent-server/openhands/agent_server/docker/build.py \
  --image openhands-research-agent-server \
  --custom-tags local \
  --platforms linux/arm64 \
  --arch arm64 \
  --load \
  --sdk-project-root "$PWD"

docker tag \
  "openhands-research-agent-server:$(git rev-parse --short HEAD)-local-arm64" \
  openhands-research-agent-server:local
```

Use `linux/amd64` and `--arch amd64` on an Intel/AMD machine.

```sh
cd ../openhands-research-canvas
export OH_CONVERSATION_RUNTIME=docker
export OH_CONVERSATION_IMAGE=openhands-research-agent-server:local
npm run dev:research
```

The launcher intentionally fails closed when Docker mode is requested without
`OH_CONVERSATION_IMAGE`.

Docker conversations need to call back to the host, so the upstream launcher
binds the local stack to all host interfaces and deliberately does not embed
the session key in the page. On the first Canvas screen choose **Local**, use
the displayed localhost URL, and paste the contents of
`~/.openhands/agent-canvas/api-key.txt` into **API Key**. This is the local
Canvas session key, not an LLM provider key. Do not commit or share it.

After the backend connects, add an LLM profile in Canvas settings. Provider
credentials are stored by OpenHands and must not be placed in either Git
repository. Creating a conversation then starts the custom
`openhands-research-agent-server:local` image with Chromium, OpenVSCode Server,
terminal/file tools, and the research SDK extension.

## Useful overrides

- `OH_AGENT_SERVER_LOCAL_PATH`: non-sibling SDK checkout
- `VITE_WORKING_DIR`: project directory exposed as the initial workspace
- `OH_CONVERSATION_RUNTIME`: `local` or `docker`
- `OH_CONVERSATION_IMAGE`: custom research Agent Server image for Docker mode
- `UV_PYTHON`: Agent Server Python runtime, default `3.12`
- `PORT`: Canvas ingress port, default `8000`

OpenHands generates and persists its own local session and encryption keys.
LLM keys belong in Canvas settings, not `.env`, Git, or source files.
