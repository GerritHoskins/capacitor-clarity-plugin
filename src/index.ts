import { registerPlugin } from '@capacitor/core';

import type { ClarityPlugin } from './definitions';

const Clarity = registerPlugin<ClarityPlugin>('Clarity', {
  web: () => import('./web').then((m) => new m.ClarityWeb()),
});

export * from './definitions';
export { Clarity };
