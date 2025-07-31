// Wake Lock API type definitions
interface WakeLockSentinel extends EventTarget {
  released: boolean;
  type: 'screen';
  release(): Promise<void>;
  onrelease: ((this: WakeLockSentinel, ev: Event) => any) | null;
}

interface NavigatorWakeLock {
  request(type: 'screen'): Promise<WakeLockSentinel>;
}

declare global {
  interface Navigator {
    wakeLock?: NavigatorWakeLock;
  }
}