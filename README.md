# Solana Studio

**An AI-powered GitHub engineering workspace that runs entirely in your browser.**

<img width="1865" height="1056" alt="Screenshot From 2026-09-22 20-16-31" src="https://github.com/user-attachments/assets/3810227b-530c-41d7-bbc7-48bbf3d2026d" />


> **No backend ever sees your code, your repo, or your keys.**
> A Next.js app (deployable to Vercel as-is) serves the UI; the engineering
> workspace runs entirely in your browser. GitHub is the source of truth. The AI
> is the engineering assistant. The browser holds a temporary working copy. **You**
> control every write back to GitHub. The only server-side code is one optional
> OAuth token-exchange route.

Connect GitHub, open a repository in a VS Code–style workspace, ask an AI agent to
understand it, describe an engineering requirement, review the agent's plan, let it
generate structured file changes into a browser-local workspace, edit anything by
hand, review the full diff, then create a branch, commit, and open a pull request —
all without a server.

It has strong Solana awareness (wallet-adapter, `@solana/web3.js`, `@solana/kit`,
Anchor, SPL tokens, devnet) but works as a general GitHub engineering agent for any
repository.

---

## Product architecture

```
                 ┌──────────────────────────┐
                 │      React Frontend       │
                 │  GitHub + AI + Workspace  │
                 └────────────┬─────────────┘
                              │
              ┌───────────────┼────────────────┐
              ▼               ▼                ▼
          GitHub API       AI Provider      Browser Storage
              │               │                │
              ▼               ▼                ▼
        Repository        AI Planning       Workspace State
        Files             AI Coding         User Settings
        Branches          AI Analysis       Temporary Changes
        Commits
        Pull Requests
```

There is **no application backend** — no database, no WebSocket server, no code
execution, no server that ever receives your repository, edits, tokens, or AI keys.
The browser talks directly to the GitHub REST/Git-Data API and to the AI provider's
API. The Next.js server does two things only: serve the (mostly static) UI, and host
one **optional** OAuth token-exchange route.

## App architecture

- **Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS**, deployable to
  Vercel with zero configuration.
- Routes:
  - `/` — the marketing landing page (prerendered as static HTML; the editor bundle
    is never pulled into it).
  - `/app` — the engineering workspace, a **client-only** SPA (`ssr: false`) so
    Monaco and browser storage never touch the server.
  - `/api/github-oauth` — the optional OAuth token-exchange route (a serverless
    function on Vercel). Unused unless you enable OAuth.
- Monaco Editor is loaded on demand (via `@monaco-editor/react`'s loader) only when
  you open a file in the workspace — so the landing and the connect screen stay light.
- All workspace state (repository tree, file contents, edits, agent run) lives in
  memory / sessionStorage / localStorage in the browser.

## GitHub integration

`src/services/github/` is a clean service layer over the GitHub API:

| Module | Responsibility |
| --- | --- |
| `githubClient.ts` | Auth, error shaping, rate-limit detection, pagination |
| `githubAuth.ts` | Validate token, fetch user, read granted scopes |
| `repositories.ts` | List / fetch repositories |
| `branches.ts` | List branches, resolve head SHA, create feature branch |
| `files.ts` | Recursive tree, read blobs / file contents (UTF-8 + binary detection) |
| `commits.ts` | Multi-file commit via the Git Data API (blobs → tree → commit → ref) |
| `pullRequests.ts` | Create / find pull requests |

User flow: **Connect GitHub → load repositories → select repository → select branch
→ load repository → open workspace.**

## AI architecture

- **Provider-agnostic.** `src/services/ai/types.ts` defines an `AIProvider`
  interface (`analyzeRepository`, `generatePlan`, `generateImplementation`,
  `answerQuestion`, `summarizeChanges`). Providers are registered in
  `src/services/ai/index.ts` (`PROVIDERS`), which drives both the factory
  (`createProvider`) and the settings UI. Adding a provider = one client + one
  provider class + one registry entry.
- **Two providers ship today** — pick either in AI Settings:
  - **Anthropic (Claude)** (`anthropicProvider.ts`) — calls the Messages API with
    `anthropic-dangerous-direct-browser-access`; structured output via forced
    tool-use. Default model `claude-opus-4-8`.
  - **OpenAI (ChatGPT)** (`openaiProvider.ts`) — calls Chat Completions
    (CORS-enabled for browser use); structured output via a forced function
    `tool_choice`; key validated via `GET /v1/models`. Default model `gpt-4o`
    (model field is a free-text combobox, so `gpt-4o-mini`, `gpt-4.1`, `gpt-5`, … all work).
  Both stream responses (SSE) so large generations don't time out, and both feed the
  exact same prompts/JSON-schemas (`prompts.ts`) and validation.
- **Structured output.** The agent never emits free-form code. Plans and file
  operations come back as validated JSON, then every file operation is re-validated
  client-side before it touches the workspace.
- **The `Agent`** (`src/services/agent/agent.ts`) is a thin orchestrator: it builds
  repository context, selects relevant files, and delegates LLM calls to the
  provider. It never touches GitHub or the workspace directly.

The agent workflow is **plan-first**:

```
requirement → repository context → analysis → plan → USER APPROVAL →
structured file operations → validate → apply to browser workspace → diff → review
```

## Workspace architecture

- **Virtual workspace** (`src/workspace/virtualWorkspace.ts`): an in-browser mirror
  of the repository. Files are lazily loaded; edits/creates/deletes/moves are tracked
  against a baseline so a change list and per-file diff can be derived. Nothing is
  written to GitHub until you commit.
- **Repository context** (`repositoryContext.ts`): detects project type/framework,
  reads a curated, size-bounded set of important files, and summarizes structure — we
  never dump the whole repo into a prompt.
- **Ignore rules** (`ignore.ts`): keep `node_modules`, build output, binaries,
  lockfiles, and secrets out of AI context.
- **Structured operations** (`src/services/agent/operations.ts`): every AI operation
  is validated (path safety, existence, size, supported type) before it is applied.

The workspace is a VS Code–inspired three-pane layout: **Explorer** (file tree) ·
**Editor** (Monaco tabs, dirty indicators, Edit/Diff toggle) · **Agent** (build &
ask) — with a **Changes** panel for the diff/commit flow.

## Security model

This is a frontend-only app, so security is taken seriously:

- **No secret is ever hardcoded, committed, or logged.** Not the GitHub token, not
  the AI key.
- **GitHub token** and **AI API key** are entered in the UI and sent only to the
  respective provider's API (GitHub / the AI provider). You choose how they persist:
  **"Keep me signed in on this device"** stores them in `localStorage` (survives
  restarts, so you don't reconnect each visit); turning it off keeps them in
  `sessionStorage` (that browser tab only). Either way the token lives only in your
  browser — use a **fine-grained, expiring** token, and turn persistence off on
  shared machines. Disconnecting clears both stores.
- **The one server route only exchanges an OAuth code.** One-click GitHub OAuth needs
  a client *secret* and a server-side exchange (GitHub's token endpoint has no browser
  CORS). The `/api/github-oauth` route does exactly that and nothing else — the secret
  lives only in the server environment and is never bundled into the browser. If you
  don't enable OAuth, the route is inert and the connect screen uses the token flow.
- **`NEXT_PUBLIC_*` variables are public.** They are inlined into the browser bundle,
  so they hold only non-secret config. The app never reads secrets from env vars.
- **AI-generated paths are untrusted.** `checkRepoPath()` rejects absolute paths,
  `..` traversal, Windows drive paths, control characters, and secret files
  (`.env`, keypairs, `*.pem`, `id.json`, …). Only repository-relative paths are
  allowed.
- **Secrets are never sent to the AI.** `.env` and credential files are excluded from
  repository context and Q&A.
- **The AI never writes to GitHub.** It proposes structured operations; the frontend
  validates and applies them to the browser workspace; the user reviews and commits.
- **The default branch is never modified.** Committing always creates a feature
  branch and opens a PR — never an auto-merge.
- Repository code is treated as untrusted input and is **never executed**.

## Local development

Requires Node ≥ 20.11.

```bash
npm install
npm run dev        # start the Next.js dev server (http://localhost:3000)
npm run build      # production build (type-check + optimized .next output)
npm start          # serve the production build
npm run lint       # next lint
npm run typecheck  # tsc --noEmit
```

The app lives at the repository root: the App Router under `src/app/`, and the
workspace/services/state under `src/`.

## Environment variables

There are **no required environment variables** and **no application secrets**. See
[`.env.example`](./.env.example). Only genuinely-public config belongs in
`NEXT_PUBLIC_*` variables (which are inlined into the browser bundle). Your GitHub
token and AI key are entered at runtime and never read from env vars.

## GitHub setup

Create a **Personal Access Token** at GitHub → Settings → Developer settings →
Personal access tokens.

- **Fine-grained (recommended):** scope it to the repositories you'll use, with
  **Contents: Read & write** and **Pull requests: Read & write**.
- **Classic:** the `repo` scope (or `public_repo` for public-only, read-heavy use).

A token without write access still lets you browse and use the agent; committing and
opening PRs require write access. Paste the token on the Connect screen (it persists
if you keep "Keep me signed in on this device" ticked).

### One-click "Connect with GitHub" (optional OAuth)

By default the connect screen uses the token flow above. To enable a true one-click
sign-in, turn on the optional OAuth flow. The code→token exchange runs in the route
handler at [`src/app/api/github-oauth/route.ts`](./src/app/api/github-oauth/route.ts)
(a browser can't do it: it needs the client *secret*, and GitHub's token endpoint has
no CORS).

1. Create a **GitHub OAuth App** (Settings → Developer settings → OAuth Apps). Set the
   **Authorization callback URL** to `https://your-app.vercel.app/app` (the connect
   screen lives at `/app`, which is where GitHub redirects back).
2. Set these environment variables (in your Vercel project, or a local `.env.local`):
   - `NEXT_PUBLIC_GITHUB_OAUTH_CLIENT_ID` — the client id (public; enables the button).
   - `GITHUB_OAUTH_CLIENT_ID` and `GITHUB_OAUTH_CLIENT_SECRET` — used only by the route
     handler (the secret is **never** bundled into the browser).
3. Deploy. On Vercel the route is served automatically. Unlike the old Vite setup,
   `npm run dev` runs the route handler too, so OAuth also works locally.

When these are set, the Connect screen shows a one-click **Connect with GitHub** button;
otherwise it falls back to the guided token flow. The OAuth token persists the same way,
so you sign in once.

## AI provider setup

Bring your own API key. In **AI Settings**, choose a provider and paste its key:

- **Anthropic (Claude)** — key from `console.anthropic.com`; models Opus 4.8 /
  Sonnet 4.6 / Haiku 4.5.
- **OpenAI (ChatGPT)** — key from `platform.openai.com/api-keys`; models GPT-4o /
  GPT-4o mini / GPT-4.1 / GPT-5, or type any model id.

The key is validated with a lightweight request, then used **directly from your
browser** to that provider's API only. It is never persisted unless you opt in for
the session, never logged, and never included in generated files. Switching provider
just needs that provider's key.

> Both providers work best with a chat/agentic model that supports forced
> tool/function calls and streaming. Reasoning-only variants that don't support
> forced tools may not return structured plans.

## Deployment

This is a standard Next.js app — **Vercel** deploys it with zero configuration:

1. Import the repository in Vercel (Framework preset: **Next.js**, auto-detected).
2. Build command `npm run build`, output handled by the Next.js preset — nothing to set.
3. (Optional) Add the OAuth env vars from the section above to enable one-click sign-in.

Any host that runs Next.js works too (`npm run build` then `npm start`, or a Node/Docker
target). The `/api/github-oauth` route needs a server runtime; the rest of the app is
static and client-rendered.

## Limitations

- **No code execution.** This MVP does not run `npm install` / tests / builds. It is
  honest about that — there is no fake remote shell. (A browser runtime like
  WebContainers could be added later, clearly labeled as in-browser execution.)
- **File-size limits.** Files over ~1 MB and binary files are not loaded into the
  text workspace.
- **Very large repositories** may hit GitHub's tree-truncation limit (surfaced in the
  Explorer).
- **GitHub API rate limits** apply to the user's token.
- **Move as delete+create.** A move is committed as a delete of the source plus a
  create at the destination.

## Future roadmap

- In-browser execution/testing via WebContainers (clearly distinguished from remote
  execution).
- Additional AI providers behind the existing `AIProvider` interface.
- Multi-file, chunked context for very large repositories.
- Inline per-hunk accept/reject in the diff view.
- Draft PR review comments and iterative agent revisions.

---

The defining architectural principle:

> **No backend owns your code.** The browser is the application. GitHub is the source
> of truth. The AI is the engineering assistant. The browser is the temporary
> workspace. The user controls the final GitHub write. The server only serves the UI
> and, optionally, exchanges an OAuth code.
