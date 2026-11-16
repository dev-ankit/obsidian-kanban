import { ComponentChildren } from 'preact';
import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from 'preact/compat';

const minuteOf = (time: number) => time - (time % 60_000);

class Clock {
  // The start of the current minute, so reading it twice in a minute gives the same answer.
  now = minuteOf(Date.now());
  listeners = new Set<() => void>();

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  refresh() {
    const now = minuteOf(Date.now());
    if (now === this.now) return;
    this.now = now;
    this.listeners.forEach((listener) => listener());
  }
}

// No default: what shows the time outside a provider would show a clock that never moves.
const ClockContext = createContext<Clock>(null);

export function CurrentTimeProvider({
  win,
  children,
}: {
  win: Window;
  children: ComponentChildren;
}) {
  const clock = useMemo(() => new Clock(), []);

  useEffect(() => {
    let timer: number;
    const refresh = () => {
      win.clearTimeout(timer);
      clock.refresh();
      timer = win.setTimeout(refresh, 60_000 - (Date.now() % 60_000));
    };

    // Timers are late after sleep and in a hidden window, so coming back also refreshes.
    refresh();
    win.addEventListener('focus', refresh);
    win.document.addEventListener('visibilitychange', refresh);
    return () => {
      win.clearTimeout(timer);
      win.removeEventListener('focus', refresh);
      win.document.removeEventListener('visibilitychange', refresh);
    };
  }, [win]);

  return <ClockContext.Provider value={clock}>{children}</ClockContext.Provider>;
}

export function useClock() {
  return useContext(ClockContext);
}

// What `read` makes of the current time. The caller renders again when a new minute changes that
// result, so a tick costs a render only where it changes what is shown.
export function useCurrentTime<T>(read: (now: number) => T): T {
  const clock = useClock();
  return useSyncExternalStore(clock.subscribe, () => read(clock.now));
}
