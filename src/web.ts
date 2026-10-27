import { CapacitorException, WebPlugin } from '@capacitor/core';
import type { ExceptionCode, ListenerCallback, PluginListenerHandle } from '@capacitor/core';
import ClaritySDK from '@microsoft/clarity';

import type { ClarityPlugin, InitializeOptions } from './definitions';
import { boolean, invalid, logLevel, tagValues, text } from './validation';

export class ClarityWeb extends WebPlugin implements ClarityPlugin {
  private projectId?: string;
  private customUserId?: string;
  private customSessionId?: string;

  async initialize(options: InitializeOptions): Promise<void> {
    const projectId = text(options?.projectId, 'projectId');
    if (!/^[a-zA-Z0-9]+$/.test(projectId)) invalid('projectId must be alphanumeric.');
    logLevel(options?.logLevel);
    if (this.projectId)
      throw new CapacitorException('Clarity is already initialized.', 'ALREADY_INITIALIZED' as ExceptionCode);
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      throw this.unavailable('Clarity requires a browser document.');
    }
    // The upstream injector expects an existing script insertion point.
    if (!document.getElementsByTagName('script').length) {
      document.head.appendChild(document.createElement('script'));
    }
    ClaritySDK.init(projectId);
    if (!document.getElementById('clarity-script')) {
      throw new CapacitorException('Clarity script injection failed.', 'CLARITY_SDK_REJECTED' as ExceptionCode);
    }
    this.projectId = projectId;
  }

  async setCustomUserId(options: { customUserId: string }): Promise<void> {
    const id = text(options?.customUserId, 'customUserId');
    this.requireInitialized();
    ClaritySDK.identify(id, this.customSessionId);
    this.customUserId = id;
  }

  async setCustomSessionId(options: { customSessionId: string }): Promise<void> {
    const id = text(options?.customSessionId, 'customSessionId');
    this.requireInitialized();
    // identify requires a user ID. Keep the same anonymous ID for this page.
    const userId = this.customUserId ?? window.crypto.randomUUID();
    ClaritySDK.identify(userId, id);
    this.customUserId = userId;
    this.customSessionId = id;
  }

  async setCustomTag(options: { key: string; value: string | string[] }): Promise<void> {
    const key = text(options?.key, 'key');
    const value = tagValues(options?.value);
    this.requireInitialized();
    ClaritySDK.setTag(key, value);
  }

  async sendCustomEvent(options: { name: string }): Promise<void> {
    const name = text(options?.name, 'name', 254);
    this.requireInitialized();
    ClaritySDK.event(name);
  }

  async setCurrentScreenName(options: { name: string | null }): Promise<void> {
    const name = options?.name === null ? '' : text(options?.name, 'name');
    this.requireInitialized();
    ClaritySDK.setTag('screen', name);
  }

  async consent(options: { analyticsStorage: boolean; adsStorage?: boolean }): Promise<void> {
    const analytics = boolean(options?.analyticsStorage, 'analyticsStorage');
    const ads = options?.adsStorage === undefined ? false : boolean(options.adsStorage, 'adsStorage');
    this.requireInitialized();
    ClaritySDK.consentV2({
      ad_Storage: ads ? 'granted' : 'denied',
      analytics_Storage: analytics ? 'granted' : 'denied',
    });
  }

  async pause(): Promise<void> {
    throw this.unavailable('pause is available on native platforms only.');
  }
  async resume(): Promise<void> {
    throw this.unavailable('resume is available on native platforms only.');
  }
  async isPaused(): Promise<{ paused: boolean }> {
    throw this.unavailable('isPaused is available on native platforms only.');
  }
  async startNewSession(): Promise<{ sessionId: string }> {
    throw this.unavailable('startNewSession is available on native platforms only.');
  }
  async getCurrentSessionUrl(): Promise<{ url: string | null }> {
    throw this.unavailable('getCurrentSessionUrl is available on native platforms only.');
  }
  async addListener(_eventName: string, _listenerFunc: ListenerCallback): Promise<PluginListenerHandle> {
    void _eventName;
    void _listenerFunc;
    throw this.unavailable('sessionStarted is available on native platforms only.');
  }

  private requireInitialized(): void {
    if (!this.projectId) throw new CapacitorException('Call initialize first.', 'NOT_INITIALIZED' as ExceptionCode);
  }
}
