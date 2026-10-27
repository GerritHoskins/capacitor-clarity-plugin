import type { ExceptionCode } from '@capacitor/core';
import { CapacitorException } from '@capacitor/core';

import type { LogLevel } from './definitions';

export function invalid(message: string): never {
  throw new CapacitorException(message, 'INVALID_ARGUMENT' as ExceptionCode);
}
export function text(value: unknown, name: string, max = 255): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) {
    invalid(`${name} must be a nonblank string of 1–${max} UTF-16 code units.`);
  }
  return value;
}
export function logLevel(value: unknown): LogLevel {
  if (value === undefined) return 'none';
  if (!['verbose', 'debug', 'info', 'warning', 'error', 'none'].includes(value as string)) {
    invalid('logLevel must be verbose, debug, info, warning, error or none.');
  }
  return value as LogLevel;
}
export function boolean(value: unknown, name: string): boolean {
  if (typeof value !== 'boolean') invalid(`${name} must be a boolean.`);
  return value;
}
export function tagValues(value: unknown): string | string[] {
  if (!Array.isArray(value)) return text(value, 'value');
  if (!value.length) invalid('value must contain at least one string.');
  return value.map((entry) => text(entry, 'value'));
}
