import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
  Object.defineProperty(window, 'electronAPI', {
    value: {},
    writable: true,
    configurable: true,
  });

  const noopAsync = () => Promise.resolve();
  const noop = () => undefined;

  if (typeof HTMLMediaElement !== 'undefined') {
    Object.defineProperty(HTMLMediaElement.prototype, 'paused', {
      configurable: true,
      writable: true,
      value: true,
    });

    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: vi.fn(function (this: HTMLMediaElement) {
        Object.defineProperty(this, 'paused', {
          configurable: true,
          writable: true,
          value: false,
        });
        return Promise.resolve();
      }),
    });

    Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      value: vi.fn(function (this: HTMLMediaElement) {
        Object.defineProperty(this, 'paused', {
          configurable: true,
          writable: true,
          value: true,
        });
        return undefined;
      }),
    });

    Object.defineProperty(HTMLMediaElement.prototype, 'load', {
      configurable: true,
      value: vi.fn(noop),
    });

    Object.defineProperty(HTMLMediaElement.prototype, 'requestFullscreen', {
      configurable: true,
      value: vi.fn(noopAsync),
    });
  }

  if (typeof document !== 'undefined') {
    Object.defineProperty(document, 'exitFullscreen', {
      configurable: true,
      value: vi.fn(noopAsync),
    });
  }
}
