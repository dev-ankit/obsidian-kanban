import { moment } from 'obsidian';
import { StateManager } from 'src/StateManager';
import { c, escapeRegExpStr } from 'src/components/helpers';
import { Board, DataTypes, Item, Lane } from 'src/components/types';
import { Path } from 'src/dnd/types';
import { getEntityFromPath } from 'src/dnd/util/data';
import { Op } from 'src/helpers/patch';

import { getSearchValue } from '../common';

export function hydrateLane(stateManager: StateManager, lane: Lane) {
  return lane;
}

export function preprocessTitle(stateManager: StateManager, title: string) {
  const dateTrigger = stateManager.getSetting('date-trigger');
  const dateFormat = stateManager.getSetting('date-format');
  const dateDisplayFormat = stateManager.getSetting('date-display-format');
  const timeTrigger = stateManager.getSetting('time-trigger');
  const timeFormat = stateManager.getSetting('time-format');

  const { app } = stateManager;

  const timeRegEx = new RegExp(`(^|\\s)${escapeRegExpStr(timeTrigger)}{([^}]+)}`, 'g');
  const atTime = (date: moment.Moment, time: moment.Moment) =>
    date.clone().hour(time.hour()).minute(time.minute()).second(time.second());

  // A chip stands for the same moment as the card's footer, which is what colors both: a date at
  // the card's time, and a time on the card's date (today when the card has none).
  let time: moment.Moment | undefined;
  for (let match; (match = timeRegEx.exec(title)); ) {
    const parsed = moment(match[2], timeFormat);
    if (parsed.isValid()) time = parsed;
  }
  const dateAttr = (date: moment.Moment) => (time ? atTime(date, time) : date).toISOString();

  let date: moment.Moment;

  title = title.replace(
    new RegExp(`(^|\\s)${escapeRegExpStr(dateTrigger)}\\[\\[([^\\]]+)\\]\\]`, 'g'),
    (match, space, content) => {
      const parsed = moment(content, dateFormat);
      if (!parsed.isValid()) return match;
      date = parsed;
      const linkPath = app.metadataCache.getFirstLinkpathDest(content, stateManager.file.path);
      return `${space}<span data-date="${dateAttr(date)}" class="${c('preview-date-wrapper')} ${c('date')} ${c('preview-date-link')}"><a class="${c('preview-date')} internal-link" data-href="${linkPath?.path ?? content}" href="${linkPath?.path ?? content}" target="_blank" rel="noopener">${parsed.format(dateDisplayFormat)}</a></span>`;
    }
  );
  title = title.replace(
    new RegExp(`(^|\\s)${escapeRegExpStr(dateTrigger)}\\[([^\\]]+)\\]\\([^)]+\\)`, 'g'),
    (match, space, content) => {
      const parsed = moment(content, dateFormat);
      if (!parsed.isValid()) return match;
      date = parsed;
      const linkPath = app.metadataCache.getFirstLinkpathDest(content, stateManager.file.path);
      return `${space}<span data-date="${dateAttr(date)}" class="${c('preview-date-wrapper')} ${c('date')} ${c('preview-date-link')}"><a class="${c('preview-date')} internal-link" data-href="${linkPath?.path ?? content}" href="${linkPath?.path ?? content}" target="_blank" rel="noopener">${parsed.format(dateDisplayFormat)}</a></span>`;
    }
  );
  let dateIndex = 0;
  title = title.replace(
    new RegExp(`(^|\\s)${escapeRegExpStr(dateTrigger)}{([^}]+)}`, 'g'),
    (match, space, content) => {
      const index = dateIndex++;
      const parsed = moment(content, dateFormat);
      if (!parsed.isValid()) return match;
      date = parsed;
      return `${space}<span data-date="${dateAttr(date)}" data-date-index="${index}" class="${c('preview-date-wrapper')} ${c('date')}"><span class="${c('preview-date')} ${c('item-metadata-date')}">${parsed.format(dateDisplayFormat)}</span></span>`;
    }
  );

  title = title.replace(timeRegEx, (match, space, content) => {
    const parsed = moment(content, timeFormat);
    if (!parsed.isValid()) return match;
    const at = date ? atTime(date, parsed) : parsed;
    return `${space}<span data-date="${at.toISOString()}" class="${c('preview-time-wrapper')} ${c('date')}"><span class="${c('preview-time')} ${c('item-metadata-time')}">${parsed.format(timeFormat)}</span></span>`;
  });

  return title;
}

export function hydrateItem(stateManager: StateManager, item: Item) {
  const { dateStr, timeStr, fileAccessor } = item.data.metadata;

  if (dateStr) {
    item.data.metadata.date = moment(dateStr, stateManager.getSetting('date-format'));
  }

  if (timeStr) {
    let time = moment(timeStr, stateManager.getSetting('time-format'));

    if (item.data.metadata.date) {
      const date = item.data.metadata.date;

      date.hour(time.hour());
      date.minute(time.minute());
      date.second(time.second());

      time = date.clone();
    }

    item.data.metadata.time = time;
  }

  if (fileAccessor) {
    const file = stateManager.app.metadataCache.getFirstLinkpathDest(
      fileAccessor.target,
      stateManager.file.path
    );

    if (file) {
      item.data.metadata.file = file;
    }
  }

  item.data.titleSearch = getSearchValue(item, stateManager);

  return item;
}

export function hydrateBoard(stateManager: StateManager, board: Board): Board {
  try {
    board.children.map((lane) => {
      hydrateLane(stateManager, lane);
      lane.children.map((item) => {
        return hydrateItem(stateManager, item);
      });
    });
  } catch (e) {
    stateManager.setError(e);
    throw e;
  }

  return board;
}

function opAffectsHydration(op: Op) {
  return (
    (op.op === 'add' || op.op === 'replace') &&
    ['title', 'titleRaw', 'dateStr', 'timeStr', /\d$/, /\/fileAccessor\/.+$/].some((postFix) => {
      if (typeof postFix === 'string') {
        return op.path.last().toString().endsWith(postFix);
      } else {
        return postFix.test(op.path.last().toString());
      }
    })
  );
}

export function hydratePostOp(stateManager: StateManager, board: Board, ops: Op[]): Board {
  const seen: Record<string, boolean> = {};
  const toHydrate = ops.reduce((paths, op) => {
    if (!opAffectsHydration(op)) {
      return paths;
    }

    const path = op.path.reduce((path, segment) => {
      if (typeof segment === 'number') {
        path.push(segment);
      }

      return path;
    }, [] as Path);

    const key = path.join(',');

    if (!seen[key]) {
      seen[key] = true;
      paths.push(path);
    }

    return paths;
  }, [] as Path[]);

  toHydrate.map((path) => {
    const entity = getEntityFromPath(board, path);

    if (entity.type === DataTypes.Lane) {
      return hydrateLane(stateManager, entity);
    }

    if (entity.type === DataTypes.Item) {
      return hydrateItem(stateManager, entity);
    }
  });

  return board;
}
