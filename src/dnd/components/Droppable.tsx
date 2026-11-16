import { RefObject, memo, useContext, useLayoutEffect, useMemo, useRef } from 'preact/compat';

import { EntityManager } from '../managers/EntityManager';
import { EntityData, WithChildren } from '../types';
import {
  DndManagerContext,
  EntityManagerContext,
  ExplicitPathContext,
  ScopeIdContext,
  ScrollManagerContext,
  SortManagerContext,
} from './context';

export interface DraggableProps extends WithChildren {
  id: string;
  index: number;
  elementRef: RefObject<HTMLElement | null>;
  measureRef: RefObject<HTMLElement | null>;
  data: EntityData;
}

export function StaticDroppable(props: DraggableProps) {
  return <>{props.children}</>;
}

export const Droppable = memo(function Droppable({
  id,
  index,
  elementRef,
  measureRef,
  children,
  data,
}: DraggableProps) {
  const dndManager = useContext(DndManagerContext);
  const sortManager = useContext(SortManagerContext);
  const scopeId = useContext(ScopeIdContext);
  const parentEntityManager = useContext(EntityManagerContext);
  const parentScrollManager = useContext(ScrollManagerContext);
  const dataRef = useRef(data);

  dataRef.current = data;

  const entityManager = useMemo(() => {
    if (!dndManager) return null;

    return new EntityManager(
      dndManager,
      scopeId,
      id,
      index,
      parentEntityManager,
      parentScrollManager,
      sortManager,
      dataRef
    );
  }, [id, index, dndManager, scopeId, parentEntityManager, parentScrollManager, sortManager]);

  useLayoutEffect(() => {
    entityManager?.initNodes(elementRef.current, measureRef.current);
    return () => entityManager?.destroy();
  }, [entityManager, elementRef, measureRef]);

  if (!entityManager) {
    return null;
  }

  return (
    <EntityManagerContext.Provider value={entityManager}>{children}</EntityManagerContext.Provider>
  );
});

export function useNestedEntityPath(selfIndex?: number) {
  const entityManager = useContext(EntityManagerContext);
  const explicitPath = useContext(ExplicitPathContext);
  const currentPath = explicitPath ?? entityManager?.getPath() ?? [];

  if (selfIndex !== undefined) {
    currentPath.push(selfIndex);
  }

  return useMemo(() => currentPath, currentPath);
}
