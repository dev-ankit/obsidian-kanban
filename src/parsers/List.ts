import { isPlainObject } from 'is-plain-object';
import { TFile } from 'obsidian';
import { getAPI } from 'obsidian-dataview';
import isEqual from 'react-fast-compare';
import { StateManager } from 'src/StateManager';
import { Board, Item, ItemMetadata } from 'src/components/types';

import { diff, diffApply } from '../helpers/patch';
import { BaseFormat, getLinkedPageMetadata, getSearchValue } from './common';
import {
  astToUnhydratedBoard,
  boardToMd,
  newItem,
  reparseBoard,
  updateItemContent,
} from './formats/list';
import { hydrateBoard, hydratePostOp } from './helpers/hydrateBoard';
import { parseMarkdown } from './parseMarkdown';

const generatedKeys: Array<string | number> = ['id', 'date', 'time', 'titleSearch', 'file'];

// The list itself when mapping changes none of its values.
function mapChanged<T>(list: T[], map: (value: T) => T): T[] {
  const mapped = list.map(map);
  return mapped.some((value, i) => value !== list[i]) ? mapped : list;
}

export class ListFormat implements BaseFormat {
  stateManager: StateManager;

  constructor(stateManager: StateManager) {
    this.stateManager = stateManager;
  }

  newItem(content: string, checkChar: string, forceEdit?: boolean) {
    return newItem(this.stateManager, content, checkChar, forceEdit);
  }

  updateItemContent(item: Item, content: string) {
    return updateItemContent(this.stateManager, item, content);
  }

  boardToMd(board: Board) {
    return boardToMd(board);
  }

  mdToBoard(md: string) {
    const { ast, settings, frontmatter } = parseMarkdown(this.stateManager, md);
    const newBoard = astToUnhydratedBoard(this.stateManager, settings, frontmatter, ast, md);
    const { state } = this.stateManager;
    const dv = getAPI();

    if (!this.stateManager.hasError() && state) {
      const ops = diff(
        state,
        newBoard,
        (path) => {
          return generatedKeys.includes(path.last());
        },
        (val: any) => {
          if (!val) return String(val);
          if (val instanceof TFile) return val.path;
          if (isPlainObject(val) || Array.isArray(val)) return String(val);
          if (dv && !dv.value.isObject(val)) return dv.value.toString(val);
          return String(val);
        }
      );

      const patchedBoard = diffApply(state, ops) as Board;

      return hydratePostOp(this.stateManager, patchedBoard, ops);
    }

    return hydrateBoard(this.stateManager, newBoard);
  }

  // What a parse derives from the notes cards link to, recomputed without parsing. Anything that
  // comes out the same keeps its object, so a vault change that doesn't concern this board
  // returns the board it was given.
  refreshFileMetadata() {
    const { stateManager } = this;
    const { state, app, file: boardFile } = stateManager;
    const resolve = (target?: string) =>
      target === undefined
        ? undefined
        : app.metadataCache.getFirstLinkpathDest(target, boardFile.path) ?? undefined;
    const withMetadata = (item: Item, metadata: Partial<ItemMetadata>): Item => ({
      ...item,
      data: { ...item.data, metadata: { ...item.data.metadata, ...metadata } },
    });
    const linkedMetadata = ({ fileMetadataTarget }: ItemMetadata) => {
      const linked = getLinkedPageMetadata(stateManager, resolve(fileMetadataTarget));
      return { fileMetadata: linked.fileMetadata, fileMetadataOrder: linked.fileMetadataOrder };
    };
    const refreshItem = (item: Item): Item => {
      const { metadata } = item.data;
      if (!metadata.fileAccessor) return item;

      const refreshed = withMetadata(item, {
        ...linkedMetadata(metadata),
        file: resolve(metadata.fileAccessor.target),
      });
      refreshed.data.titleSearch = getSearchValue(refreshed, stateManager);
      return isEqual(refreshed, item) ? item : refreshed;
    };
    // A parse gives archived cards their linked metadata but doesn't hydrate them.
    const refreshArchivedItem = (item: Item): Item => {
      const { metadata } = item.data;
      if (metadata.fileMetadataTarget === undefined) return item;

      const refreshed = withMetadata(item, linkedMetadata(metadata));
      return isEqual(refreshed, item) ? item : refreshed;
    };

    const children = mapChanged(state.children, (lane) => {
      const items = mapChanged(lane.children, refreshItem);
      return items === lane.children ? lane : { ...lane, children: items };
    });
    const archive = mapChanged(state.data.archive, refreshArchivedItem);

    return children === state.children && archive === state.data.archive
      ? state
      : { ...state, children, data: { ...state.data, archive } };
  }

  reparseBoard() {
    return reparseBoard(this.stateManager, this.stateManager.state);
  }
}
