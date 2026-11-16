import { App, TFile, getLinkpath, moment, normalizePath } from 'obsidian';
import {
  appHasDailyNotesPluginLoaded,
  getDailyNoteSettings,
  getDateFromFile,
} from 'obsidian-daily-notes-interface';

import { frontmatterKey } from './parsers/common';

export function gotoNextDailyNote(app: App, file: TFile) {
  const date = getDateFromFile(file as any, 'day');

  if (!date || !date.isValid()) {
    return;
  }

  const dailyNotePlugin = (app as any).internalPlugins.plugins['daily-notes'].instance;

  dailyNotePlugin.gotoNextExisting(date);
}

export function gotoPrevDailyNote(app: App, file: TFile) {
  const date = getDateFromFile(file as any, 'day');

  if (!date || !date.isValid()) {
    return;
  }

  const dailyNotePlugin = (app as any).internalPlugins.plugins['daily-notes'].instance;

  dailyNotePlugin.gotoPreviousExisting(date);
}

export function buildLinkToDailyNote(app: App, dateStr: string) {
  const dailyNoteSettings = getDailyNoteSettings();
  const shouldUseMarkdownLinks = !!(app.vault as any).getConfig('useMarkdownLinks');

  if (shouldUseMarkdownLinks) {
    // The folder and the date format can both hold folders, so the path is escaped per segment.
    const path = `${dailyNoteSettings.folder ?? ''}/${dateStr}`
      .split('/')
      .filter(Boolean)
      .map(encodeURIComponent)
      .join('/');

    return `[${dateStr}](${path}.md)`;
  }

  return `[[${dateStr}]]`;
}

// Whether a link names the note Daily Notes would create for a date. Only then is a missing note
// Daily Notes' to create, with its folder, name and template; any other link is an ordinary link.
export function isLinkToDailyNote(linktext: string, date: moment.Moment) {
  const settings = appHasDailyNotesPluginLoaded() && getDailyNoteSettings();
  if (!settings) return false;

  const withoutExtension = (path: string) => normalizePath(path).replace(/\.md$/, '');
  const dailyNote = withoutExtension(`${settings.folder}/${date.format(settings.format)}`);
  const target = withoutExtension(getLinkpath(linktext));

  // A link can name a note by the end of its path, down to its name alone.
  return dailyNote === target || dailyNote.endsWith(`/${target}`);
}

export function hasFrontmatterKeyRaw(data: string) {
  if (!data) return false;

  const match = data.match(/---\s+([\w\W]+?)\s+---/);

  if (!match) {
    return false;
  }

  if (!match[1].contains(frontmatterKey)) {
    return false;
  }

  return true;
}

export function hasFrontmatterKey(file: TFile) {
  if (!file) return false;
  const cache = app.metadataCache.getFileCache(file);
  return !!cache?.frontmatter?.[frontmatterKey];
}

export function laneTitleWithMaxItems(title: string, maxItems?: number) {
  if (!maxItems) return title;
  return `${title} (${maxItems})`;
}
