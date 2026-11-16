# Releasing

Every deploy to https://www.exsabujian.org is a numbered release, tracked on GitHub:
a version in `package.json`, an entry in [CHANGELOG.md](../CHANGELOG.md), a `vX.Y.Z` tag
and a GitHub Release with the same notes.

## Which number

Semantic Versioning, `MAJOR.MINOR.PATCH`:

| Change | Example | New version from 1.4.2 |
| --- | --- | --- |
| Bug fix, wording, small UI fix | robot check refused real visitors | 1.4.3 |
| New feature or page, nothing removed | forgot password by SMS | 1.5.0 |
| Breaking change: removes a feature, changes how members sign in, needs a manual data step | switching login to phone only | 2.0.0 |

Several changes in one deploy take the highest bump among them.

## While working

Add each change to the `## [Unreleased]` section of CHANGELOG.md in the same commit,
under `Added`, `Changed`, `Fixed`, `Removed` or `Security`, written for members and the
committee (what they notice), not for developers.

## Cutting a release (at deploy time)

1. Tests: `npm test` passes and the changed flows were tried on localhost (see the
   local-testing rule: real UI flow, throwaway account, deleted afterwards).
2. Version: `npm version X.Y.Z --no-git-tag-version` (updates package.json and package-lock.json).
3. Changelog: rename `[Unreleased]` to `[X.Y.Z] - YYYY-MM-DD`, add a fresh empty
   `[Unreleased]` above it, and update the compare links at the bottom.
4. Commit and tag:
   ```bash
   git commit -am "chore(release): vX.Y.Z"
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push origin main --follow-tags
   ```
5. Deploy that commit (zip from the tag: `git archive --format=zip -o <zip> vX.Y.Z -- . ':(exclude)video' ':(exclude).env.example'`).
6. After the live build: smoke-test the site and read the server log, then publish the notes:
   ```bash
   gh release create vX.Y.Z --title "vX.Y.Z" --notes-file <notes>
   ```
   where `<notes>` is that version's section of CHANGELOG.md.

A hotfix follows the same steps with a PATCH bump. If a release must be rolled back,
redeploy the previous tag's zip and note it in the next version's changelog.

The repository is public: release notes never contain secrets, member data or internal addresses.
