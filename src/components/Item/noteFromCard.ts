import { StateManager } from 'src/StateManager';
import { extractWrappedInlineFields } from 'src/parsers/helpers/inlineMetadata';

import { escapeRegExpStr } from '../helpers';

const illegalCharsRegEx = /[\\/:"*?<>|]+/g;
const embedRegEx = /!?\[\[([^\]]*)\.[^\]]+\]\]/g;
const wikilinkRegEx = /!?\[\[([^\]]*)\]\]/g;
const mdLinkRegEx = /!?\[([^\]]*)\]\([^)]*\)/g;
const tagRegEx = /(?:^|\s)#([^\u2000-\u206F\u2E00-\u2E7F'!"#$%&()*+,.:;<=>?@^`{|}~[\]\\\s\n\r]+)/g;
const condenceWhiteSpaceRE = /\s+/g;

export function getNoteFromCardTitle(firstLine: string, stateManager: StateManager) {
  const dateTrigger = escapeRegExpStr(stateManager.getSetting('date-trigger') as string);
  const timeTrigger = escapeRegExpStr(stateManager.getSetting('time-trigger') as string);
  // Match dates before links so daily-note dates never become part of the filename.
  const dateTimeRegEx = new RegExp(
    `(?:^|\\s)(?:${timeTrigger}\\{[^}]+\\}|${dateTrigger}(?:\\{[^}]+\\}|\\[\\[[^\\]]+\\]\\]|\\[[^\\]]+\\]\\([^)]+\\)))`,
    'g'
  );
  const retained: { start: number; end: number; title: string }[] = [];
  const metadataRegEx = new RegExp(`${dateTimeRegEx.source}|${tagRegEx.source}`, 'g');
  let match: RegExpExecArray | null;
  while ((match = metadataRegEx.exec(firstLine))) {
    retained.push({ start: match.index, end: match.index + match[0].length, title: ' ' });
  }

  for (const field of extractWrappedInlineFields(firstLine)) {
    retained.push({ start: field.start, end: field.end, title: ' ' });
  }

  retained.sort((a, b) => a.start - b.start || b.end - a.end);
  let title = '';
  let cursor = 0;
  const preservedContent: string[] = [];
  for (const part of retained) {
    if (part.start < cursor) continue;
    title += firstLine.slice(cursor, part.start) + part.title;
    preservedContent.push(firstLine.slice(part.start, part.end).trim());
    cursor = part.end;
  }
  title += firstLine.slice(cursor);

  const sanitizedTitle = title
    .replace(embedRegEx, '$1')
    .replace(wikilinkRegEx, '$1')
    .replace(mdLinkRegEx, '$1')
    .replace(illegalCharsRegEx, ' ')
    .trim()
    .replace(condenceWhiteSpaceRE, ' ');

  return { sanitizedTitle, preservedContent };
}
