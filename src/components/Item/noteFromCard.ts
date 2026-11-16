import { StateManager } from 'src/StateManager';
import { extractInlineFields } from 'src/parsers/helpers/inlineMetadata';
import { parseFragment } from 'src/parsers/parseMarkdown';
import { SKIP, visit } from 'unist-util-visit';

import { escapeRegExpStr } from '../helpers';

const illegalCharsRegEx = /[\\/:"*?<>|]+/g;
const embedRegEx = /!?\[\[([^\]]*)\.[^\]]+\]\]/g;
const wikilinkRegEx = /!?\[\[([^\]]*)\]\]/g;
const mdLinkRegEx = /!?\[([^\]]*)\]\([^)]*\)/g;
const tagRegEx = /#([^\u2000-\u206F\u2E00-\u2E7F'!"#$%&()*+,.:;<=>?@^`{|}~[\]\\\s\n\r]+)/g;
const condenceWhiteSpaceRE = /\s+/g;

export function getNoteFromCardTitle(firstLine: string, stateManager: StateManager) {
  const dateTrigger = escapeRegExpStr(stateManager.getSetting('date-trigger'));
  const timeTrigger = escapeRegExpStr(stateManager.getSetting('time-trigger'));
  const dateTimeRegEx = new RegExp(
    `(?:^|\\s)(?:${timeTrigger}\\{[^}]+\\}|${dateTrigger}(?:\\{[^}]+\\}|\\[\\[[^\\]]+\\]\\]|\\[[^\\]]+\\]\\([^)]+\\)))`,
    'g'
  );
  // Keep the existing filename rules independent of which tokens stay on the card.
  const sanitizedTitle = firstLine
    .replace(dateTimeRegEx, ' ')
    .replace(embedRegEx, '$1')
    .replace(wikilinkRegEx, '$1')
    .replace(mdLinkRegEx, '$1')
    .replace(tagRegEx, '$1')
    .replace(illegalCharsRegEx, ' ')
    .trim()
    .replace(condenceWhiteSpaceRE, ' ');

  const retained: { start: number; end: number }[] = extractInlineFields(firstLine) ?? [];
  const inlineCode: { start: number; end: number }[] = [];
  const dateLinkPrefix = new RegExp(`(?:^|\\s)${dateTrigger}$`);
  visit(parseFragment(stateManager, firstLine), (node) => {
    const start = node.position.start.offset;
    const end = node.position.end.offset;
    if (node.type === 'inlineCode') {
      inlineCode.push({ start, end });
      return SKIP;
    }
    if (
      [
        'date',
        'dateLink',
        'time',
        'wikilink',
        'embedWikilink',
        'hashtag',
        'link',
        'image',
        'embedLink',
      ].includes(node.type)
    ) {
      // Markdown daily-note dates are links preceded by the board's date trigger.
      const prefixLength =
        node.type === 'link' && dateLinkPrefix.test(firstLine.slice(0, start))
          ? stateManager.getSetting('date-trigger').length
          : 0;
      retained.push({ start: start - prefixLength, end });
      return SKIP;
    }
  });

  const urlRegEx = /https?:\/\/[^\s<>]+/g;
  let match: RegExpExecArray | null;
  while ((match = urlRegEx.exec(firstLine))) {
    const start = match.index;
    if (!inlineCode.some((code) => start >= code.start && start < code.end)) {
      retained.push({ start, end: start + match[0].length });
    }
  }

  // Keep the outer token intact when a field or link contains other markup.
  retained.sort((a, b) => a.start - b.start || b.end - a.end);
  let cursor = 0;
  const preservedContent: string[] = [];
  for (const part of retained) {
    if (part.start < cursor) continue;
    preservedContent.push(firstLine.slice(part.start, part.end));
    cursor = part.end;
  }

  return { sanitizedTitle, preservedContent };
}
