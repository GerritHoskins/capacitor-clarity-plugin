import { Capacitor } from '@capacitor/core';
import { Clarity } from '@gerrithoskins/capacitor-clarity-plugin';
import type { LogLevel } from '@gerrithoskins/capacitor-clarity-plugin';
import './style.css';

const field = (id: string): HTMLInputElement => document.getElementById(id) as HTMLInputElement;
const output = document.getElementById('log') as HTMLPreElement;
field('project-id').value = import.meta.env.VITE_CLARITY_PROJECT_ID ?? '';
(document.getElementById('platform') as HTMLElement).textContent = `Platform: ${Capacitor.getPlatform()}`;
function log(label: string, value?: unknown): void {
  const detail = value === undefined ? '' : ` ${JSON.stringify(value)}`;
  output.textContent = `[${new Date().toLocaleTimeString()}] ${label}${detail}\n` + output.textContent;
}
let listening = false;
async function listen(): Promise<void> {
  if (listening) return;
  await Clarity.addListener('sessionStarted', (event) => {
    log('sessionStarted', event);
    void Clarity.getCurrentSessionUrl()
      .then((result) => log('Session URL', result))
      .catch(reportError);
  });
  listening = true;
}
function reportError(error: unknown): void {
  const failure = error as { message?: string; code?: string };
  log('Error', { code: failure?.code, message: failure?.message ?? String(error) });
}
const actions: Record<string, () => Promise<unknown>> = {
  initialize: async () => {
    if (Capacitor.isNativePlatform()) await listen();
    return Clarity.initialize({ projectId: field('project-id').value, logLevel: field('log-level').value as LogLevel });
  },
  listen,
  'remove-listeners': async () => {
    await Clarity.removeAllListeners();
    listening = false;
  },
  url: () => Clarity.getCurrentSessionUrl(),
  'new-session': () => Clarity.startNewSession(),
  pause: () => Clarity.pause(),
  resume: () => Clarity.resume(),
  paused: () => Clarity.isPaused(),
  user: () => Clarity.setCustomUserId({ customUserId: field('user-id').value }),
  session: () => Clarity.setCustomSessionId({ customSessionId: field('session-id').value }),
  tag: () =>
    Clarity.setCustomTag({
      key: field('tag-key').value,
      value: field('tag-values')
        .value.split(',')
        .map((value) => value.trim()),
    }),
  event: () => Clarity.sendCustomEvent({ name: field('event-name').value }),
  screen: () => Clarity.setCurrentScreenName({ name: field('screen-name').value }),
  'reset-screen': () => Clarity.setCurrentScreenName({ name: null }),
  consent: () => Clarity.consent({ analyticsStorage: field('analytics').checked, adsStorage: field('ads').checked }),
};
document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button) => {
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      const name = button.dataset.action;
      if (!name) return;
      log(name, await actions[name]());
    } catch (error) {
      reportError(error);
    } finally {
      button.disabled = false;
    }
  });
});
document.getElementById('clear')?.addEventListener('click', () => {
  output.textContent = '';
});
log('Ready. No SDK initialization or data transmission has been requested.');
