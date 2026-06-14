/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Network status detection.
 * Native: Capacitor Network plugin (ConnectivityManager / NWPathMonitor).
 * Web: DOM online/offline events fallback.
 */

import { Capacitor } from '@capacitor/core';

type NetworkCallback = (online: boolean) => void;

export async function isOnline(): Promise<boolean> {
  try {
    const { Network } = await import('@capacitor/network');
    const status = await Network.getStatus();
    return status.connected;
  } catch {
    return navigator.onLine;
  }
}

export function subscribeToNetwork(callback: NetworkCallback): () => void {
  const isNative = Capacitor.getPlatform() !== 'web';

  if (isNative) {
    let active = true;
    let removeHandle: (() => void) | null = null;

    import('@capacitor/network').then(({ Network }) => {
      if (!active) return;
      Network.addListener('networkStatusChange', (status) => {
        callback(status.connected);
      }).then((handle) => {
        if (!active) {
          handle.remove();
        } else {
          removeHandle = () => handle.remove();
        }
      });
    });

    return () => {
      active = false;
      removeHandle?.();
    };
  }

  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
