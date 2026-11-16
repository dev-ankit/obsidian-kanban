import { isPlainObject } from 'is-plain-object';
import { TFile } from 'obsidian';
import { getAPI } from 'obsidian-dataview';
import { StateManager } from 'src/StateManager';
import { Board, Item } from 'src/components/types';

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

function metadataValueToString(val: any) {
  if (!val) return String(val);
  if (val instanceof TFile) return val.path;
  if (isPlainObject(val) || Array.isArray(val)) return String(val);
  const dv = getAPI();
  if (dv && !dv.value.isObject(val)) return dv.value.toString(val);
  return String(val);
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

    if (!this.stateManager.hasError() && state) {
      const ops = diff(
        state,
        newBoard,
        (path) => {
          return generatedKeys.includes(path.last());
        },
        metadataValueToString
      );

      const patchedBoard = diffApply(state, ops) as Board;

      return hydratePostOp(this.stateManager, patchedBoard, ops);
    }

    return hydrateBoard(this.stateManager, newBoard);
  }

  refreshFileMetadata() {
    const { stateManager } = this;
    const { state, app, file: boardFile } = stateManager;
    const resolve = (target: string) =>
      app.metadataCache.getFirstLinkpathDest(target, boardFile.path);
    const refreshItem = (item: Item): Item => {
      const { fileAccessor, fileMetadataTarget } = item.data.metadata;
      if (!fileAccessor) return item;

      const file = resolve(fileAccessor.target);
      const metadata = getLinkedPageMetadata(
        stateManager,
        fileMetadataTarget !== undefined ? resolve(fileMetadataTarget) : null
      );
      const refreshed = {
        ...item,
        data: {
          ...item.data,
          metadata: {
            ...item.data.metadata,
            file,
            fileAccessor: fileAccessor.isEmbed
              ? { ...fileAccessor, stats: file?.stat }
              : fileAccessor,
            fileMetadata: metadata.fileMetadata,
            fileMetadataOrder: metadata.fileMetadataOrder,
          },
        },
      };
      refreshed.data.titleSearch = getSearchValue(refreshed, stateManager);
      return refreshed;
    };
    const refreshed = {
      ...state,
      children: state.children.map((lane) => ({
        ...lane,
        children: lane.children.map(refreshItem),
      })),
      data: { ...state.data, archive: state.data.archive.map(refreshItem) },
    };
    const ops = diff(state, refreshed, () => false, metadataValueToString);
    return ops.length ? (diffApply(state, ops) as Board) : state;
  }

  reparseBoard() {
    return reparseBoard(this.stateManager, this.stateManager.state);
  }
}
