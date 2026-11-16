import EventEmitter from 'eventemitter3';
import { debounce } from 'obsidian';

import { Entity } from '../types';
import { getParentWindow } from '../util/getWindow';
import { DragManager } from './DragManager';

export type DropHandler = (dragEntity: Entity, dropEntity: Entity) => void;

export class DndManager {
  win: Window;
  emitter: EventEmitter;
  hitboxEntities: Map<string, Entity>;
  scrollEntities: Map<string, Entity>;
  resizeObserver: ResizeObserver;
  dragManager: DragManager;
  onDrop: DropHandler;

  constructor(win: Window, onDrop: DropHandler) {
    this.win = win;
    this.emitter = new EventEmitter();
    this.hitboxEntities = new Map();
    this.scrollEntities = new Map();
    this.onDrop = onDrop;

    this.resizeObserver = new ResizeObserver(debounce(this.handleResize, 100, true));
    this.dragManager = new DragManager(win, this.emitter, this.hitboxEntities, this.scrollEntities);
  }

  destroy() {
    this.resizeObserver.disconnect();
  }

  handleResize: ResizeObserverCallback = (entries) => {
    if (!entries.some((entry) => getParentWindow(entry.target) === this.win)) return;

    // A resized card or placeholder changes the scroll range even if its container stays fixed.
    this.emitter.emit('scrollResize', null);

    this.hitboxEntities.forEach((entity) => {
      entity.recalcInitial();
    });

    this.scrollEntities.forEach((entity) => {
      entity.recalcInitial();
    });
  };

  observeResize(element: HTMLElement) {
    if (!element.instanceOf(HTMLElement)) return;
    this.resizeObserver.observe(element, { box: 'border-box' });
  }

  unobserveResize(element: HTMLElement) {
    if (!element.instanceOf(HTMLElement)) return;
    this.resizeObserver.unobserve(element);
  }

  registerHitboxEntity(id: string, entity: Entity, win: Window) {
    if (win !== this.win) return;
    this.hitboxEntities.set(id, entity);
  }

  registerScrollEntity(id: string, entity: Entity, win: Window) {
    if (win !== this.win) return;
    this.scrollEntities.set(id, entity);
  }

  unregisterHitboxEntity(id: string, win: Window) {
    if (win !== this.win) return;
    this.hitboxEntities.delete(id);
  }

  unregisterScrollEntity(id: string, win: Window) {
    if (win !== this.win) return;
    this.scrollEntities.delete(id);
  }
}
