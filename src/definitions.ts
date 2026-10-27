import type { PluginListenerHandle } from '@capacitor/core';

/** Native SDK logging verbosity. Web ignores this option. */
export type LogLevel = 'verbose' | 'debug' | 'info' | 'warning' | 'error' | 'none';

export interface InitializeOptions {
  /** Clarity project ID from your project's settings. */
  projectId: string;
  /** Native logging verbosity. Defaults to none. */
  logLevel?: LogLevel;
}

export interface ClarityPlugin {
  /**
   * Initialize once with a Clarity project ID. Resolves when initialization is
   * accepted, before a native session is ready. Subscribe to sessionStarted
   * first. iOS support is experimental; web injects the Clarity tag.
   */
  initialize(options: InitializeOptions): Promise<void>;
  /**
   * Associate a nonblank custom user ID (1–255 UTF-16 code units). Avoid personal
   * data. On native, call inside sessionStarted to target the correct session.
   */
  setCustomUserId(options: { customUserId: string }): Promise<void>;
  /**
   * Associate a nonblank custom session ID (1–255 UTF-16 code units). On native,
   * call inside sessionStarted. Web caches this ID alongside the user ID;
   * without a custom user ID, it uses an ephemeral random ID for this page.
   */
  setCustomSessionId(options: { customSessionId: string }): Promise<void>;
  /**
   * Set a nonblank tag key and one or more nonblank values, each at most 255
   * UTF-16 code units. On native, call inside sessionStarted for association
   * with the correct session. iOS deduplicates values.
   */
  setCustomTag(options: { key: string; value: string | string[] }): Promise<void>;
  /** Send a nonblank custom event name of at most 254 UTF-16 code units. */
  sendCustomEvent(options: { name: string }): Promise<void>;
  /**
   * Set a nonblank screen name (1–255 UTF-16 code units), or null to reset it.
   * Web maps this to the screen tag; null sends an empty value, not a native
   * screen reset, and does not remove previously recorded tag values.
   */
  setCurrentScreenName(options: { name: string | null }): Promise<void>;
  /** Pause native capture. Unavailable on web. iOS SDK returns no success flag. */
  pause(): Promise<void>;
  /** Resume native capture. Unavailable on web. iOS SDK returns no success flag. */
  resume(): Promise<void>;
  /** Read native capture's paused state. Unavailable on web. */
  isPaused(): Promise<{ paused: boolean }>;
  /**
   * Start a native session and resolve only when its ID is available. Associate
   * IDs/tags after resolution or inside sessionStarted. Unavailable on web.
   */
  startNewSession(): Promise<{ sessionId: string }>;
  /**
   * Get the native recording URL, or null before a session exists. Call inside
   * sessionStarted for a ready session. Unavailable on web.
   */
  getCurrentSessionUrl(): Promise<{ url: string | null }>;
  /**
   * Forward a user's storage choices after initialization. Omitted adsStorage
   * defaults to false on Android/web; iOS ignores it and forwards analytics only.
   * This does not present a consent interface or obtain consent for you.
   */
  consent(options: { analyticsStorage: boolean; adsStorage?: boolean }): Promise<void>;
  /**
   * Listen for new/resumed native sessions. Register before initialize; early
   * events are retained until a listener consumes them. Unavailable on web.
   */
  addListener(
    eventName: 'sessionStarted',
    listenerFunc: (event: { sessionId: string }) => void,
  ): Promise<PluginListenerHandle>;
  /** Remove all plugin listeners. Does not stop SDK capture. */
  removeAllListeners(): Promise<void>;
}
