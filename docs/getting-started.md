# Getting started

This guide runs the site on your machine, first with the Astro dev server and then as the same image the platform deploys, and runs the tests that `ci / ci` runs on every PR.

## 1. What you need

| Tool | Version | Check |
| --- | --- | --- |
| Node.js | 22 | `node --version` |
| pnpm | The version in `packageManager` of `package.json` | `pnpm --version` |
| Docker | Any recent version, for the image | `docker version` |

pnpm comes with Node through Corepack. Run `corepack enable` once, and pnpm then uses the version `package.json` names.

## 2. Run the site with the dev server

```sh
pnpm install
pnpm dev
```

Open <http://localhost:4321>. The page reloads when you save a file. The dev server has no `/config.json`, so the footer shows `Environment: local` (see [configuration.md](configuration.md)).

## 3. Run the tests

```sh
pnpm test
```

`pnpm test` runs `astro check`, which type-checks the pages and the content, and then the linter (`pnpm lint`). `ci / ci` runs the same command: `pnpm install --frozen-lockfile && pnpm test`.

## 4. Build the static files

```sh
pnpm build
pnpm preview
```

`pnpm build` writes the site to `dist/`. `pnpm preview` serves `dist/` at <http://localhost:4321>.

## 5. Run the site as the image

This is the image the platform builds and deploys, with nginx in front of the files.

```sh
docker build -t website-web:local .
docker run --rm -p 8080:8080 -e PLATFORM_ENVIRONMENT=local -e PUBLIC_GREETING=hello website-web:local
```

Then check it:

| Request | Answer |
| --- | --- |
| <http://localhost:8080/> | The home page |
| <http://localhost:8080/about> | The about page |
| <http://localhost:8080/no-such-page> | The site's 404 page, with status 404 |
| <http://localhost:8080/healthz> and <http://localhost:8080/readyz> | `ok`, with status 200 |
| <http://localhost:8080/config.json> | `{"PLATFORM_ENVIRONMENT":"local","PUBLIC_GREETING":"hello"}` |

Stop the container with Ctrl+C.

## 6. Your first PR

1. Create a branch, change a page in `src/pages/` or an article in `src/content/articles/`, and run `pnpm test`.
2. Push the branch and open a PR. The PR template asks for screenshots of the pages you changed.
3. `ci / ci` must pass, and a reviewer from the code owners must approve. Then squash-merge.

What happens after the merge is in [deployment.md](deployment.md).
