import { RefObject, useContext, useLayoutEffect, useMemo } from 'preact/compat';

import { ScrollManager } from '../managers/ScrollManager';
import { WithChildren } from '../types';
import { DndManagerContext, ScopeIdContext, ScrollManagerContext } from './context';

interface ScrollContextProps extends WithChildren {
  scrollRef: RefObject<HTMLElement | null>;
  triggerTypes?: string[];
}

export function Scrollable({ scrollRef, triggerTypes, children }: ScrollContextProps) {
  const dndManager = useContext(DndManagerContext);
  const scopeId = useContext(ScopeIdContext);
  const parentScrollManager = useContext(ScrollManagerContext);

  const scrollManager = useMemo(() => {
    if (!dndManager) return null;

    return new ScrollManager(dndManager, scopeId, triggerTypes || [], parentScrollManager);
  }, [dndManager, scopeId, triggerTypes, parentScrollManager]);

  useLayoutEffect(() => {
    scrollManager?.initNodes(scrollRef.current);
    return () => scrollManager?.destroy();
  }, [scrollManager, scrollRef]);

  if (!scrollManager) {
    return null;
  }

  return (
    <ScrollManagerContext.Provider value={scrollManager}>{children}</ScrollManagerContext.Provider>
  );
}
