# @gerrithoskins/capacitor-clarity-plugin

Typed Microsoft Clarity integration for Capacitor 8. Implements the session,
identity, tag, event, screen, capture and consent API listed below. Native view
masking and the deprecated current-session-ID API are outside this plugin's API.

## Install

```sh
npm install @gerrithoskins/capacitor-clarity-plugin
npx cap sync
```

This is a local, unpublished package. For local development, build the plugin
first, then install it by path (the included example uses `file:..`).

| Platform | Implementation | Limitations |
| --- | --- | --- |
| Android | Clarity 3.10.0, Ionic framework mode | Capacitor builds on API 24+; Clarity data requires API 29+. |
| iOS | Clarity >=3.5.4 <4, Ionic framework mode | **Experimental**. Capacitor targets iOS 15+; Clarity data requires iOS 16+. WKWebView replay quality is unverified. |
| Web | @microsoft/clarity 1.0.2 | Identity, tags, events, screen tag and consent. Native session/capture APIs and sessionStarted are unavailable. |

Microsoft's Cordova/Ionic support matrix covers Android only. The iOS bridge
uses public SDK APIs but is not a claim of supported Ionic replay. Enable WebView
capture and review allowed URLs in the mobile project's Clarity dashboard.
Use a mobile project for native runs and a web project for browser runs.

## Usage

```ts
import { Capacitor } from '@capacitor/core';
import { Clarity } from '@gerrithoskins/capacitor-clarity-plugin';

if (Capacitor.isNativePlatform()) {
  await Clarity.addListener('sessionStarted', async ({ sessionId }) => {
    console.log('Clarity session', sessionId);
    await Clarity.setCustomUserId({ customUserId: 'opaque-user-id' });
    await Clarity.setCustomTag({ key: 'plan', value: ['trial'] });
    console.log(await Clarity.getCurrentSessionUrl());
  });
}

await Clarity.initialize({ projectId: 'YOUR_PROJECT_ID', logLevel: 'verbose' });
// Forward choices from your own consent interface:
await Clarity.consent({ analyticsStorage: true, adsStorage: false });
```

Initialize once per app/page lifetime. Resolution means the SDK accepted the
request; use `sessionStarted` to know a native session is ready. An early native
event is retained until consumed by a listener. `startNewSession` resolves with
the ID from the SDK callback. Removing listeners does not stop capture.

Custom IDs, keys, values and screen names must be nonblank and at most 255 UTF-16
code units. Event names are limited to 254. The bridges validate these limits
without trimming the submitted value. On iOS tag values are deduplicated.

On web, both identity setters call `identify` and preserve the other ID. Setting
a session ID first creates an ephemeral random user ID, kept only for the page
lifetime until replaced by a custom user ID. Screen names use a `screen` tag;
resetting sends an empty value and cannot undo previously recorded tags.
Web method resolution means a command was queued, not that upload succeeded.

## Errors

| Code | Meaning |
| --- | --- |
| INVALID_ARGUMENT | Missing, wrong-type, blank or overlong argument, or invalid log level/project ID. |
| NOT_INITIALIZED | Initialize this bridge before sending commands. |
| ALREADY_INITIALIZED | Initialization was already accepted. |
| CLARITY_SDK_REJECTED | A native SDK command returned false, or web script injection failed. |
| CLARITY_SDK_ERROR | Android SDK threw an exception. |
| UNAVAILABLE | Native-only API on web, missing browser document, or no Android Activity. |

The false-result policy was explicitly selected by the project author: reject
with `CLARITY_SDK_REJECTED`. A false `isPaused` value is valid query data.
iOS pause/resume return Void, so their promises resolve after invocation.
If native initialization succeeds but callback registration fails, initialization
rejects while SDK capture may already be active. Reload the app before retrying.

## Privacy and consent

Initialization can start recording immediately. Configure masking, capture rules,
and consent requirements in your Clarity project before initialization. The plugin
does not collect consent, guarantee pre-consent blocking, or provide a masking UI.
Avoid personal data in IDs, tags and events. Set the SDK's dashboard rules and
your own consent interface to match the data you intend to collect.

`consent` forwards analytics and ads choices on Android/web. Omitted ads storage
defaults to denied; iOS has only an analytics flag and ignores ads storage.
The playground does not initialize or transmit analytics automatically.

## Development and example

Requires Node 22+, npm, and Java 21/Android SDK for native Android builds.
iOS compilation and SwiftLint require macOS/Xcode.

```sh
npm ci
npm run build
npm run lint
npm test
npm run verify:android
cd example-app
npm ci
npm run build
npx cap sync
npm run dev
```

The example app ID (Android application ID and iOS bundle ID) is
`com.gerrithoskins.clarity.example`. The plugin Android namespace is
`com.gerrithoskins.capacitor.clarity`. Configure Clarity with the app ID.
Optionally copy example-app/.env.example to example-app/.env.local and set
`VITE_CLARITY_PROJECT_ID` to prefill the input. This does not initialize the SDK.

The example contains buttons for every API and logs sessionStarted events plus
their recording URL. Initialization automatically registers the native listener
first. Build again before native sync after changing source.

For device verification, run `npx cap run android` from example-app on an API 29+
device/emulator, enter a real mobile project ID and initialize with verbose logs.
Confirm initialization and session events in Logcat, inspect the recording URL,
and check your project's live recordings. Uploads may take time. For web, enter a
web project ID, then inspect the clarity.ms/tag script and event upload requests
in browser developer tools. These checks send data to your own Clarity project.

On a Mac run `npm run verify:ios` and build/run the example in Xcode. Verify both
package-manager paths (Swift Package Manager and CocoaPods) before an iOS release.
On Windows `npm run lint` checks TypeScript/Java formatting and reports SwiftLint
as skipped; `verify:ios` fails explicitly to prevent a false verification claim.

The automated web tests exercise the built bundle and real Microsoft wrapper
against an inert document stub: no script is fetched and no telemetry is sent.

## Verification status (2026-10-27)

Verified on Windows: plugin TypeScript/Rollup/docgen build, ESLint/Prettier,
eight web contract scenarios, Android debug/release plugin build and Android lint,
example production build, Android/iOS sync, and example debug APK compilation.

An API 36 emulator initialized the SDK, emitted sessionStarted, returned a recording
URL, and accepted a new session, pause/resume queries, custom event and tag.
Logcat showed successful collection requests (HTTP 204). The browser loaded the
Clarity tag and SDK and accepted a custom event. Browser event upload contents
were not inspected. Dashboard playback was not verified because the Clarity
browser session required sign-in again.

Capacitor's native-run launcher hit its fixed five-second activity-start timeout
and reported the emulator offline, even though the app launched and worked.
Startup, bridge registration and the controls were verified separately in the
emulator UI and Logcat.

iOS compilation, SwiftLint, CocoaPods installation, and WKWebView replay remain
unverified. Three moderate advisories were reported in the example's development
CLI chain (xcode/uuid); runtime-only npm audits for both packages reported zero.
Dependency upgrades were not applied as a workaround.

## References

- [Android SDK API](https://learn.microsoft.com/en-us/clarity/mobile-sdk/android-sdk)
- [iOS SDK API](https://learn.microsoft.com/en-us/clarity/mobile-sdk/ios-sdk)
- [Clarity iOS 3.5.4 package](https://github.com/microsoft/clarity-apps/tree/3.5.4)
- [Microsoft web wrapper](https://github.com/microsoft/clarity/tree/master/packages/clarity-js)

## API

<docgen-index>

* [`initialize(...)`](#initialize)
* [`setCustomUserId(...)`](#setcustomuserid)
* [`setCustomSessionId(...)`](#setcustomsessionid)
* [`setCustomTag(...)`](#setcustomtag)
* [`sendCustomEvent(...)`](#sendcustomevent)
* [`setCurrentScreenName(...)`](#setcurrentscreenname)
* [`pause()`](#pause)
* [`resume()`](#resume)
* [`isPaused()`](#ispaused)
* [`startNewSession()`](#startnewsession)
* [`getCurrentSessionUrl()`](#getcurrentsessionurl)
* [`consent(...)`](#consent)
* [`addListener('sessionStarted', ...)`](#addlistenersessionstarted-)
* [`removeAllListeners()`](#removealllisteners)
* [Interfaces](#interfaces)
* [Type Aliases](#type-aliases)

</docgen-index>

<docgen-api>
<!--Update the source file JSDoc comments and rerun docgen to update the docs below-->

### initialize(...)

```typescript
initialize(options: InitializeOptions) => Promise<void>
```

Initialize once with a Clarity project ID. Resolves when initialization is
accepted, before a native session is ready. Subscribe to sessionStarted
first. iOS support is experimental; web injects the Clarity tag.

| Param         | Type                                                            |
| ------------- | --------------------------------------------------------------- |
| **`options`** | <code><a href="#initializeoptions">InitializeOptions</a></code> |

--------------------


### setCustomUserId(...)

```typescript
setCustomUserId(options: { customUserId: string; }) => Promise<void>
```

Associate a nonblank custom user ID (1–255 UTF-16 code units). Avoid personal
data. On native, call inside sessionStarted to target the correct session.

| Param         | Type                                   |
| ------------- | -------------------------------------- |
| **`options`** | <code>{ customUserId: string; }</code> |

--------------------


### setCustomSessionId(...)

```typescript
setCustomSessionId(options: { customSessionId: string; }) => Promise<void>
```

Associate a nonblank custom session ID (1–255 UTF-16 code units). On native,
call inside sessionStarted. Web caches this ID alongside the user ID;
without a custom user ID, it uses an ephemeral random ID for this page.

| Param         | Type                                      |
| ------------- | ----------------------------------------- |
| **`options`** | <code>{ customSessionId: string; }</code> |

--------------------


### setCustomTag(...)

```typescript
setCustomTag(options: { key: string; value: string | string[]; }) => Promise<void>
```

Set a nonblank tag key and one or more nonblank values, each at most 255
UTF-16 code units. On native, call inside sessionStarted for association
with the correct session. iOS deduplicates values.

| Param         | Type                                                     |
| ------------- | -------------------------------------------------------- |
| **`options`** | <code>{ key: string; value: string \| string[]; }</code> |

--------------------


### sendCustomEvent(...)

```typescript
sendCustomEvent(options: { name: string; }) => Promise<void>
```

Send a nonblank custom event name of at most 254 UTF-16 code units.

| Param         | Type                           |
| ------------- | ------------------------------ |
| **`options`** | <code>{ name: string; }</code> |

--------------------


### setCurrentScreenName(...)

```typescript
setCurrentScreenName(options: { name: string | null; }) => Promise<void>
```

Set a nonblank screen name (1–255 UTF-16 code units), or null to reset it.
Web maps this to the screen tag; null sends an empty value, not a native
screen reset, and does not remove previously recorded tag values.

| Param         | Type                                   |
| ------------- | -------------------------------------- |
| **`options`** | <code>{ name: string \| null; }</code> |

--------------------


### pause()

```typescript
pause() => Promise<void>
```

Pause native capture. Unavailable on web. iOS SDK returns no success flag.

--------------------


### resume()

```typescript
resume() => Promise<void>
```

Resume native capture. Unavailable on web. iOS SDK returns no success flag.

--------------------


### isPaused()

```typescript
isPaused() => Promise<{ paused: boolean; }>
```

Read native capture's paused state. Unavailable on web.

**Returns:** <code>Promise&lt;{ paused: boolean; }&gt;</code>

--------------------


### startNewSession()

```typescript
startNewSession() => Promise<{ sessionId: string; }>
```

Start a native session and resolve only when its ID is available. Associate
IDs/tags after resolution or inside sessionStarted. Unavailable on web.

**Returns:** <code>Promise&lt;{ sessionId: string; }&gt;</code>

--------------------


### getCurrentSessionUrl()

```typescript
getCurrentSessionUrl() => Promise<{ url: string | null; }>
```

Get the native recording URL, or null before a session exists. Call inside
sessionStarted for a ready session. Unavailable on web.

**Returns:** <code>Promise&lt;{ url: string | null; }&gt;</code>

--------------------


### consent(...)

```typescript
consent(options: { analyticsStorage: boolean; adsStorage?: boolean; }) => Promise<void>
```

Forward a user's storage choices after initialization. Omitted adsStorage
defaults to false on Android/web; iOS ignores it and forwards analytics only.
This does not present a consent interface or obtain consent for you.

| Param         | Type                                                              |
| ------------- | ----------------------------------------------------------------- |
| **`options`** | <code>{ analyticsStorage: boolean; adsStorage?: boolean; }</code> |

--------------------


### addListener('sessionStarted', ...)

```typescript
addListener(eventName: 'sessionStarted', listenerFunc: (event: { sessionId: string; }) => void) => Promise<PluginListenerHandle>
```

Listen for new/resumed native sessions. Register before initialize; early
events are retained until a listener consumes them. Unavailable on web.

| Param              | Type                                                    |
| ------------------ | ------------------------------------------------------- |
| **`eventName`**    | <code>'sessionStarted'</code>                           |
| **`listenerFunc`** | <code>(event: { sessionId: string; }) =&gt; void</code> |

**Returns:** <code>Promise&lt;<a href="#pluginlistenerhandle">PluginListenerHandle</a>&gt;</code>

--------------------


### removeAllListeners()

```typescript
removeAllListeners() => Promise<void>
```

Remove all plugin listeners. Does not stop SDK capture.

--------------------


### Interfaces


#### InitializeOptions

| Prop            | Type                                          | Description                                      |
| --------------- | --------------------------------------------- | ------------------------------------------------ |
| **`projectId`** | <code>string</code>                           | Clarity project ID from your project's settings. |
| **`logLevel`**  | <code><a href="#loglevel">LogLevel</a></code> | Native logging verbosity. Defaults to none.      |


#### PluginListenerHandle

| Prop         | Type                                      |
| ------------ | ----------------------------------------- |
| **`remove`** | <code>() =&gt; Promise&lt;void&gt;</code> |


### Type Aliases


#### LogLevel

Native SDK logging verbosity. Web ignores this option.

<code>'verbose' | 'debug' | 'info' | 'warning' | 'error' | 'none'</code>

</docgen-api>
