# Publishing

## Short description

Microsoft Clarity session replay and analytics for Capacitor 8, with typed Android, iOS and web APIs.

Use this description for the GitHub repository's About field. Keep the iOS
experimental status visible in release notes and the README.

## Current state

The prepared version is 0.0.1. The source repository is
https://github.com/GerritHoskins/capacitor-clarity-plugin, configured as origin.
Publishing an npm version, creating a release tag and creating a GitHub release
are separate steps; CI performs validation only.

Android builds and live SDK uploads have been verified locally. iOS compilation,
SwiftLint, CocoaPods installation and replay remain unverified; 0.0.1 must describe
iOS as experimental. GitHub CI validates web/package behavior on Node 22 and 24
and builds the Android library. The workflow itself needs its first GitHub run.

## Local release checks

Run from the repository root with Node 22+ and npm:

```sh
npm ci
npm test
npm run lint
npm run verify:package
npm run verify:android
npm ci --prefix example-app
npm run build --prefix example-app
npm pack
```

The final command creates
`gerrithoskins-capacitor-clarity-plugin-0.0.1.tgz` locally. It does not publish.
The prepare hook builds compiled JavaScript and types before packing and when
npm installs this repository through a Git URL. Registry/tarball consumers use the
included build outputs and do not need the plugin's development toolchain.

`verify:package` checks entry points, TypeScript declarations, Android/iOS sources
and license files against the npm pack manifest. It rejects unexpected files,
including examples and local configuration. The manifest's files allowlist also
keeps repository workflows, tests and release tooling out of the npm package.

Before a stable iOS release, run the native build and runtime checks on a Mac.
This Windows preparation does not replace those checks.

## GitHub source and release

For an authorized release:

1. Review and commit the release changes.
2. Push main to the configured origin:

   ```sh
   git push -u origin main
   ```

3. Confirm GitHub CI passes.
4. Tag the same reviewed commit and push the tag:

   ```sh
   git tag -a v0.0.1 -m "Release 0.0.1"
   git push origin v0.0.1
   ```

5. Create a GitHub release for v0.0.1 with the 0.0.1 changelog and explicit iOS
   limitations. Optionally attach the verified npm tarball.

The v-prefixed tag matches the CocoaPods source declaration. After the source and
tag exist, consumers can install directly from GitHub:

```sh
npm install github:gerrithoskins/capacitor-clarity-plugin#v0.0.1
npx cap sync
```

## npm public registry

The package name requires publishing rights for the @gerrithoskins scope.
Authenticate in npm using your own account and verify the intended identity.
Check that the exact version is unused:

```sh
npm whoami
npm view @gerrithoskins/capacitor-clarity-plugin@0.0.1 version
```

A registry 404 means that version was not found; authentication or network errors
do not prove availability. Account ownership and version availability are not
established by the local package checks.

After the source tag exists, publishing is explicitly authorized, and the local
checks pass:

```sh
npm publish --access public
```

The public npm registry and public access are set in publishConfig. The
prepublishOnly hook runs tests, lint and package-content checks; prepare rebuilds
the package before upload. npm may request authentication or an OTP.
No npm token is stored in the repository.

After publishing, verify and test the actual registry package:

```sh
npm view @gerrithoskins/capacitor-clarity-plugin@0.0.1 version dist.integrity
```

For later versions, update package.json, both lockfiles' parent-package metadata,
the changelog and the release tag together. npm versions are immutable; publish a
new version rather than trying to replace an existing release.

## Optional future GitHub publishing automation

CI currently performs validation only. If publishing from GitHub Actions is
desired later, configure npm trusted publishing for this repository and a
dedicated publish workflow, following
[the npm documentation](https://docs.npmjs.com/trusted-publishers/). This repository
does not contain an automatically triggered publication workflow.
