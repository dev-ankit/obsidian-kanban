import { generateInstanceId } from 'src/components/helpers';

import {
  CoordinateShift,
  Entity,
  Path,
  ScrollState,
  Side,
  initialScrollShift,
  initialScrollState,
} from '../types';
import { getParentWindow } from '../util/getWindow';
import {
  adjustHitbox,
  calculateScrollHitbox,
  getElementScrollOffsets,
  numberOrZero,
} from '../util/hitbox';
import { DndManager } from './DndManager';
import { ScrollEventData } from './DragManager';

export type IntersectionObserverHandler = (entry: IntersectionObserverEntry) => void;

export const scrollContainerEntityType = 'scroll-container';

// Drag auto-scroll speed at the very edge of the scroll zone, in px per second. Time-based so
// it doesn't change with the display's refresh rate.
const maxScrollSpeed = 600;

const sides: Side[] = ['top', 'right', 'bottom', 'left'];

export class ScrollManager {
  dndManager: DndManager;
  instanceId: string;
  scopeId: string;
  triggerTypes: string[];
  scrollState: ScrollState;
  scrollEl: HTMLElement;
  parent: ScrollManager | null;

  observer: IntersectionObserver;
  observerHandlers: Map<string, IntersectionObserverHandler>;

  top: Entity;
  right: Entity;
  bottom: Entity;
  left: Entity;

  scrollFrame: number = 0;
  scrollFrameRequested = false;
  lastScrollFrame: number | null = null;
  activeScroll: Map<Side, number>;

  constructor(
    dndManager: DndManager,
    scopeId: string,
    triggerTypes: string[],
    parent: ScrollManager | null
  ) {
    this.dndManager = dndManager;
    this.instanceId = generateInstanceId();
    this.scopeId = scopeId;
    this.triggerTypes = triggerTypes;
    this.scrollState = initialScrollState;
    this.parent = parent;
    this.activeScroll = new Map();
    this.observerHandlers = new Map();
  }

  initNodes(scrollEl: HTMLElement) {
    this.scrollEl = scrollEl;
    this.scrollEl.dataset.hitboxid = this.instanceId;
    this.scrollEl.dataset.scrollid = this.instanceId;

    this.top = this.createScrollEntity('top');
    this.right = this.createScrollEntity('right');
    this.bottom = this.createScrollEntity('bottom');
    this.left = this.createScrollEntity('left');

    this.bindScrollHandlers();

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const targetId = (entry.target as HTMLElement).dataset?.hitboxid;

          if (targetId && this.observerHandlers.has(targetId)) {
            const handler = this.observerHandlers.get(targetId);
            handler && handler(entry);
          }
        });
      },
      {
        root: scrollEl,
        threshold: 0.1,
      }
    );

    const { observerQueue } = this;
    this.observerQueue = [];

    observerQueue.forEach(([id, element, handler]) => {
      this.observerHandlers.set(id, handler);
      this.observer.observe(element);
    });

    this.scrollEl.addEventListener('scroll', this.onScroll, {
      passive: true,
      capture: false,
    });

    this.dndManager.emitter.on('scrollResize', this.onScroll);

    this.scrollEl.win.setTimeout(() => this.onScroll());
    this.dndManager.observeResize(this.scrollEl);

    if (this.parent) {
      this.parent.registerObserverHandler(this.instanceId, this.scrollEl, (entry) => {
        if (entry.isIntersecting) {
          this.handleEntityRegistration();
        } else {
          this.handleEntityUnregistration();
        }
      });
    } else {
      this.handleEntityRegistration();
    }
  }

  destroy() {
    if (!this.scrollEl && !this.observer) return;

    this.observerQueue.length = 0;
    this.handleEntityUnregistration();
    this.observer.disconnect();
    this.unbindScrollHandlers();
    this.scrollEl.removeEventListener('scroll', this.onScroll);
    this.dndManager.emitter.off('scrollResize', this.onScroll);
    this.parent?.unregisterObserverHandler(this.instanceId, this.scrollEl);
    this.dndManager.unobserveResize(this.scrollEl);
  }

  handleEntityRegistration() {
    sides.forEach((side) => {
      const win = getParentWindow(this.scrollEl);
      const id = this.getId(side);

      const hasId = this.dndManager.scrollEntities.has(id);
      const isDoneScrolling = this.isDoneScrolling(side);

      if (!isDoneScrolling && !hasId) {
        this.dndManager.registerScrollEntity(id, this[side], win);
      } else if (isDoneScrolling && hasId) {
        this.dndManager.unregisterScrollEntity(id, win);
      }
    });
  }

  handleEntityUnregistration() {
    sides.forEach((side) => {
      const win = getParentWindow(this.scrollEl);
      const id = this.getId(side);
      this.dndManager.unregisterScrollEntity(id, win);
    });
  }

  observerQueue: [string, HTMLElement, IntersectionObserverHandler][] = [];

  registerObserverHandler(id: string, element: HTMLElement, handler: IntersectionObserverHandler) {
    if (!this.observer) {
      this.observerQueue.push([id, element, handler]);
    } else {
      this.observerHandlers.set(id, handler);
      this.observer.observe(element);
    }
  }

  unregisterObserverHandler(id: string, element: HTMLElement) {
    if (!this.observer) {
      this.observerQueue = this.observerQueue.filter((q) => q[0] !== id);
    } else {
      this.observerHandlers.delete(id);
      this.observer.unobserve(element);
    }
  }

  bindScrollHandlers() {
    sides.forEach((side) => {
      const id = this.getId(side);
      this.dndManager.dragManager.emitter.on('beginDragScroll', this.handleBeginDragScroll, id);
      this.dndManager.dragManager.emitter.on('updateDragScroll', this.handleUpdateDragScroll, id);
      this.dndManager.dragManager.emitter.on('endDragScroll', this.handleEndDragScroll, id);
      this.dndManager.dragManager.emitter.on('dragEnd', this.onDragEnd);
    });
  }

  unbindScrollHandlers() {
    sides.forEach((side) => {
      const id = this.getId(side);
      this.dndManager.dragManager.emitter.off('beginDragScroll', this.handleBeginDragScroll, id);
      this.dndManager.dragManager.emitter.off('updateDragScroll', this.handleUpdateDragScroll, id);
      this.dndManager.dragManager.emitter.off('endDragScroll', this.handleEndDragScroll, id);
      this.dndManager.dragManager.emitter.off('dragEnd', this.onDragEnd);
    });
  }

  onScroll = () => {
    if (this.activeScroll.size === 0) {
      this.scrollState = getElementScrollOffsets(this.scrollEl);
      this.handleEntityRegistration();
    }
  };

  onDragEnd = () => {
    this.activeScroll.clear();
  };

  handleBeginDragScroll = ({ scrollEntitySide, scrollStrength }: ScrollEventData) => {
    if (this.isDoneScrolling(scrollEntitySide)) return;

    this.activeScroll.set(scrollEntitySide, scrollStrength);
    this.handleDragScroll();
  };

  handleUpdateDragScroll = ({ scrollEntitySide, scrollStrength }: ScrollEventData) => {
    if (this.isDoneScrolling(scrollEntitySide)) return;

    this.activeScroll.set(scrollEntitySide, scrollStrength);
  };

  handleEndDragScroll = ({ scrollEntitySide }: ScrollEventData) => {
    this.activeScroll.delete(scrollEntitySide);
  };

  isDoneScrolling(side: Side) {
    switch (side) {
      case 'top':
        return this.scrollState.y === 0;
      case 'right':
        return this.scrollState.x === this.scrollState.maxX;
      case 'bottom':
        return this.scrollState.y === this.scrollState.maxY;
      case 'left':
        return this.scrollState.x === 0;
    }
  }

  handleDragScroll() {
    // One frame loop at a time: beginDragScroll can fire again while a loop is already
    // running, and every extra loop adds another scroll step per frame.
    if (this.activeScroll.size === 0) {
      this.lastScrollFrame = null;
      return;
    }
    if (this.scrollFrameRequested) return;

    this.scrollFrameRequested = true;
    this.scrollEl.win.requestAnimationFrame((now) => {
      this.scrollFrameRequested = false;
      // Seconds since the previous frame; capped so a stalled frame can't cause a jump.
      const dt =
        this.lastScrollFrame === null ? 1 / 60 : Math.min(now - this.lastScrollFrame, 50) / 1000;
      this.lastScrollFrame = now;
      const scrollBy = {
        left: 0,
        top: 0,
      };

      this.activeScroll.forEach((rawStrength, side) => {
        if (this.isDoneScrolling(side)) {
          return this.activeScroll.delete(side);
        }

        // Strength is how far the dragged entity's edge is from the scroll edge, 35px at the
        // start of the zone and 0 at the edge. A wide card can reach past the edge, which made
        // it negative and the speed unbounded; keep it inside the zone.
        const strength = Math.min(Math.max(rawStrength, 0), 35);

        const scrollKey = ['left', 'right'].includes(side) ? 'left' : 'top';
        const shouldIncreaseScroll = ['right', 'bottom'].includes(side);

        scrollBy[scrollKey] = shouldIncreaseScroll
          ? maxScrollSpeed * dt * (1 - strength / 35)
          : -maxScrollSpeed * dt * (1 - strength / 35);
      });

      this.scrollEl.scrollBy(scrollBy);
      this.scrollState = getElementScrollOffsets(this.scrollEl);
      this.handleEntityRegistration();
      this.handleDragScroll();
    });
  }

  getId(side: Side) {
    return `${this.instanceId}-${side}`;
  }

  getPath(side?: Side): Path {
    switch (side) {
      case 'right':
        return [...(this.parent?.getPath() || []), 1];
      case 'bottom':
        return [...(this.parent?.getPath() || []), 2];
      case 'left':
        return [...(this.parent?.getPath() || []), 3];
    }

    // top
    return [...(this.parent?.getPath() || []), 0];
  }

  getScrollShift(): CoordinateShift {
    const parentShift = this.parent?.getScrollShift();

    return {
      x: numberOrZero(this.parent?.scrollState.x) + numberOrZero(parentShift?.x),
      y: numberOrZero(this.parent?.scrollState.y) + numberOrZero(parentShift?.y),
    };
  }

  createScrollEntity(side: Side): Entity {
    const manager = this;

    return {
      scopeId: this.scopeId,
      entityId: manager.getId(side),
      initial: calculateScrollHitbox(
        this.scrollEl.getBoundingClientRect(),
        this.parent?.scrollState || initialScrollState,
        this.parent?.getScrollShift() || initialScrollShift,
        side
      ),
      getParentScrollState() {
        return manager.parent?.scrollState || initialScrollState;
      },
      getParentScrollShift() {
        return manager.parent?.getScrollShift() || initialScrollShift;
      },
      recalcInitial() {
        this.initial = calculateScrollHitbox(
          manager.scrollEl.getBoundingClientRect(),
          manager.parent?.scrollState || initialScrollState,
          manager.parent?.getScrollShift() || initialScrollShift,
          side
        );
      },
      getHitbox() {
        return adjustHitbox(
          this.initial[0],
          this.initial[1],
          this.initial[2],
          this.initial[3],
          this.getParentScrollState(),
          this.getParentScrollShift()
        );
      },
      getPath() {
        return manager.getPath(side);
      },
      getData() {
        return {
          id: manager.getId(side),
          type: scrollContainerEntityType,
          side: side,
          accepts: manager.triggerTypes || [],
          scrollContainer: manager.scrollEl,
          win: getParentWindow(manager.scrollEl),
        };
      },
    };
  }
}
