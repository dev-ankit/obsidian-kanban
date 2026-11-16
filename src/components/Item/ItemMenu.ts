import update from 'immutability-helper';
import { Menu, Notice, Platform, TFile, TFolder } from 'obsidian';
import { Dispatch, StateUpdater, useCallback } from 'preact/hooks';
import { StateManager } from 'src/StateManager';
import { Path } from 'src/dnd/types';
import { moveEntity } from 'src/dnd/util/data';
import { t } from 'src/lang/helpers';

import { BoardModifiers } from '../../helpers/boardModifiers';
import {
  applyTemplate,
  escapeRegExpStr,
  generateInstanceId,
  markdownLinkDestination,
  maybeCompleteForMove,
} from '../helpers';
import { EditState, Item } from '../types';
import {
  constructDatePicker,
  constructMenuDatePickerOnChange,
  constructMenuTimePickerOnChange,
  constructTimePicker,
} from './helpers';
import { getNoteFromCardTitle } from './noteFromCard';

interface UseItemMenuParams {
  setEditState: Dispatch<StateUpdater<EditState>>;
  item: Item;
  path: Path;
  boardModifiers: BoardModifiers;
  stateManager: StateManager;
}

export function useItemMenu({
  setEditState,
  item,
  path,
  boardModifiers,
  stateManager,
}: UseItemMenuParams) {
  return useCallback(
    (e: MouseEvent) => {
      const coordinates = { x: e.clientX, y: e.clientY };
      const hasDate = !!item.data.metadata.date;
      const hasTime = !!item.data.metadata.time;

      const menu = new Menu().addItem((i) => {
        i.setIcon('lucide-edit')
          .setTitle(t('Edit card'))
          .onClick(() => setEditState(coordinates));
      });

      menu
        .addItem((i) => {
          i.setIcon('lucide-file-plus-2')
            .setTitle(t('New note from card'))
            .onClick(async () => {
              // Legacy cards use <br> for line breaks; retain the original separator and body.
              const [firstLine] = item.data.titleRaw.split(/\n|<br>/, 1);
              const rest = item.data.titleRaw.slice(firstLine.length);
              const { sanitizedTitle, preservedContent } = getNoteFromCardTitle(
                firstLine,
                stateManager
              );

              const newNoteTemplatePath = stateManager.getSetting('new-note-template');

              const getNoteFolder = (path?: string | null) => {
                const file = path ? stateManager.app.vault.getAbstractFileByPath(path) : null;

                return file instanceof TFolder ? file : null;
              };
              const boardFolder = stateManager.getSetting('new-note-folder') as string | null;
              const globalFolder = stateManager.getGlobalSetting('new-note-folder') as
                | string
                | null;
              const targetFolder =
                getNoteFolder(boardFolder) ??
                getNoteFolder(globalFolder) ??
                stateManager.app.fileManager.getNewFileParent(stateManager.file.path);
              const missingFolder = [boardFolder, globalFolder].find((f) => f && !getNoteFolder(f));

              let newFile: TFile;

              try {
                newFile = (await (stateManager.app.fileManager as any).createNewMarkdownFile(
                  targetFolder,
                  sanitizedTitle
                )) as TFile;
              } catch (e) {
                console.error('Kanban: could not create a note from the card', e);
                new Notice(
                  e?.code === 'ENAMETOOLONG'
                    ? t(
                        'The note could not be created. Try reducing the length of the text before creating a note.'
                      )
                    : `${t('The note could not be created.')} ${e?.message ?? e}`,
                  8000
                );

                return;
              }

              if (missingFolder) {
                new Notice(
                  t(
                    'Note folder "{{folder}}" was not found, so the note was created in "{{used}}".'
                  )
                    .replace('{{folder}}', missingFolder)
                    .replace('{{used}}', targetFolder.path === '/' ? '/' : targetFolder.path),
                  8000
                );
              }

              const newLeaf = stateManager.app.workspace.splitActiveLeaf();

              await newLeaf.openFile(newFile);

              stateManager.app.workspace.setActiveLeaf(newLeaf, false, true);

              await applyTemplate(stateManager, newNoteTemplatePath as string | undefined);

              const link = stateManager.app.fileManager.generateMarkdownLink(
                newFile,
                stateManager.file.path
              );
              const newTitleRaw = [link, ...preservedContent].join(' ') + rest;

              boardModifiers.updateItem(path, stateManager.updateItemContent(item, newTitleRaw));
            });
        })
        .addItem((i) => {
          i.setIcon('lucide-link')
            .setTitle(t('Copy link to card'))
            .onClick(() => {
              if (item.data.blockId) {
                navigator.clipboard.writeText(
                  `${this.app.fileManager.generateMarkdownLink(
                    stateManager.file,
                    '',
                    '#^' + item.data.blockId
                  )}`
                );
              } else {
                const id = generateInstanceId(6);

                navigator.clipboard.writeText(
                  `${this.app.fileManager.generateMarkdownLink(stateManager.file, '', '#^' + id)}`
                );

                boardModifiers.updateItem(
                  path,
                  stateManager.updateItemContent(
                    update(item, { data: { blockId: { $set: id } } }),
                    item.data.titleRaw
                  )
                );
              }
            });
        })
        .addSeparator();

      if (/\n/.test(item.data.titleRaw)) {
        menu.addItem((i) => {
          i.setIcon('lucide-wrap-text')
            .setTitle(t('Split card'))
            .onClick(async () => {
              const titles = item.data.titleRaw.split(/[\r\n]+/g).map((t) => t.trim());
              const newItems = await Promise.all(
                titles.map((title) => {
                  return stateManager.getNewItem(title, ' ');
                })
              );

              boardModifiers.splitItem(path, newItems);
            });
        });
      }

      menu
        .addItem((i) => {
          i.setIcon('lucide-copy')
            .setTitle(t('Duplicate card'))
            .onClick(() => boardModifiers.duplicateEntity(path));
        })
        .addItem((i) => {
          i.setIcon('lucide-list-start')
            .setTitle(t('Insert card before'))
            .onClick(() =>
              boardModifiers.insertItems(path, [stateManager.getNewItem('', ' ', true)])
            );
        })
        .addItem((i) => {
          i.setIcon('lucide-list-end')
            .setTitle(t('Insert card after'))
            .onClick(() => {
              const newPath = [...path];

              newPath[newPath.length - 1] = newPath[newPath.length - 1] + 1;

              boardModifiers.insertItems(newPath, [stateManager.getNewItem('', ' ', true)]);
            });
        })
        .addItem((i) => {
          i.setIcon('lucide-arrow-up')
            .setTitle(t('Move to top'))
            .onClick(() => boardModifiers.moveItemToTop(path));
        })
        .addItem((i) => {
          i.setIcon('lucide-arrow-down')
            .setTitle(t('Move to bottom'))
            .onClick(() => boardModifiers.moveItemToBottom(path));
        })
        .addItem((i) => {
          i.setIcon('lucide-archive')
            .setTitle(t('Archive card'))
            .onClick(() => boardModifiers.archiveItem(path));
        })
        .addItem((i) => {
          i.setIcon('lucide-trash-2')
            .setTitle(t('Delete card'))
            .onClick(() => boardModifiers.deleteEntity(path));
        })
        .addSeparator()
        .addItem((i) => {
          i.setIcon('lucide-calendar-check')
            .setTitle(hasDate ? t('Edit date') : t('Add date'))
            .onClick(() => {
              constructDatePicker(
                e.view,
                stateManager,
                coordinates,
                constructMenuDatePickerOnChange({
                  stateManager,
                  boardModifiers,
                  item,
                  hasDate,
                  path,
                }),
                item.data.metadata.date?.toDate()
              );
            });
        });

      if (hasDate) {
        menu.addItem((i) => {
          i.setIcon('lucide-x')
            .setTitle(t('Remove date'))
            .onClick(() => {
              const shouldLinkDates = stateManager.getSetting('link-date-to-daily-note');
              const dateTrigger = stateManager.getSetting('date-trigger');
              const contentMatch = shouldLinkDates
                ? `(?:\\[[^\\]]+\\]${markdownLinkDestination}|\\[\\[[^\\]]+\\]\\])`
                : '{[^}]+}';
              const dateRegEx = new RegExp(
                `(^|\\s)${escapeRegExpStr(dateTrigger as string)}${contentMatch}`
              );

              const titleRaw = item.data.titleRaw.replace(dateRegEx, '').trim();

              boardModifiers.updateItem(path, stateManager.updateItemContent(item, titleRaw));
            });
        });

        menu.addItem((i) => {
          i.setIcon('lucide-clock')
            .setTitle(hasTime ? t('Edit time') : t('Add time'))
            .onClick(() => {
              constructTimePicker(
                e.view,
                stateManager,
                coordinates,
                constructMenuTimePickerOnChange({
                  stateManager,
                  boardModifiers,
                  item,
                  hasTime,
                  path,
                }),
                item.data.metadata.time
              );
            });
        });

        if (hasTime) {
          menu.addItem((i) => {
            i.setIcon('lucide-x')
              .setTitle(t('Remove time'))
              .onClick(() => {
                const timeTrigger = stateManager.getSetting('time-trigger');
                const timeRegEx = new RegExp(
                  `(^|\\s)${escapeRegExpStr(timeTrigger as string)}{([^}]+)}`
                );

                const titleRaw = item.data.titleRaw.replace(timeRegEx, '').trim();
                boardModifiers.updateItem(path, stateManager.updateItemContent(item, titleRaw));
              });
          });
        }
      }

      menu.addSeparator();

      const addMoveToOptions = (menu: Menu) => {
        const lanes = stateManager.state.children;
        if (lanes.length <= 1) return;
        for (let i = 0, len = lanes.length; i < len; i++) {
          menu.addItem((item) =>
            item
              .setIcon('lucide-square-kanban')
              .setChecked(path[0] === i)
              .setTitle(lanes[i].data.title)
              .onClick(() => {
                if (path[0] === i) return;
                stateManager.setState((boardData) => {
                  const destination = [i, 0];
                  const { next, replacement } = maybeCompleteForMove(
                    stateManager,
                    boardData,
                    path,
                    stateManager,
                    boardData,
                    destination,
                    boardData.children[path[0]].children[path[1]]
                  );
                  return moveEntity(
                    boardData,
                    path,
                    destination,
                    () => next,
                    () => replacement
                  );
                });
              })
          );
        }
      };

      if (Platform.isPhone) {
        addMoveToOptions(menu);
      } else {
        menu.addItem((item) => {
          const submenu = (item as any)
            .setTitle(t('Move to list'))
            .setIcon('lucide-square-kanban')
            .setSubmenu();

          addMoveToOptions(submenu);
        });
      }

      menu.showAtPosition(coordinates);
    },
    [setEditState, item, path, boardModifiers, stateManager]
  );
}
