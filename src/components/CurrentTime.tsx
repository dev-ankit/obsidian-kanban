import { ComponentChildren } from 'preact';
import { createContext, useContext, useEffect, useState } from 'preact/compat';

const CurrentTimeContext = createContext(Date.now());

export function CurrentTimeProvider({
  win,
  children,
}: {
  win: Window;
  children: ComponentChildren;
}) {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    let timer: number;
    const refresh = () => {
      win.clearTimeout(timer);
      const now = Date.now();
      setNow(now);
      // Relative times and hour-based colors also change while the board stays open.
      timer = win.setTimeout(refresh, 60_000 - (now % 60_000));
    };

    refresh();
    win.addEventListener('focus', refresh);
    win.document.addEventListener('visibilitychange', refresh);
    return () => {
      win.clearTimeout(timer);
      win.removeEventListener('focus', refresh);
      win.document.removeEventListener('visibilitychange', refresh);
    };
  }, [win]);

  return <CurrentTimeContext.Provider value={now}>{children}</CurrentTimeContext.Provider>;
}

export function useCurrentTime() {
  return useContext(CurrentTimeContext);
}
