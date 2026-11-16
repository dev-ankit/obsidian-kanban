import { App, FuzzySuggestModal, Setting, TFile, TFolder, Vault } from 'obsidian';

import { KanbanSettings, SettingsManager } from './Settings';
import { getTemplatePlugins } from './components/helpers';
import { t } from './lang/helpers';

interface PathChoice {
  value: string;
  label: string;
}

export const defaultDateTrigger = '@';
export const defaultTimeTrigger = '@@';
export const defaultMetadataPosition = 'body';

export function getFolderChoices(app: App) {
  const folderList: PathChoice[] = [];

  Vault.recurseChildren(app.vault.getRoot(), (f) => {
    if (f instanceof TFolder) {
      folderList.push({
        value: f.path,
        label: f.path,
      });
    }
  });

  return folderList;
}

export function getTemplateChoices(app: App, folderStr?: string) {
  const fileList: PathChoice[] = [];

  const configuredFolder = folderStr ? app.vault.getAbstractFileByPath(folderStr) : null;
  const folder = configuredFolder instanceof TFolder ? configuredFolder : app.vault.getRoot();

  Vault.recurseChildren(folder, (f) => {
    if (f instanceof TFile) {
      fileList.push({
        value: f.path,
        label: f.path,
      });
    }
  });

  return fileList;
}

export function getListOptions(app: App) {
  const { templateFolder, templatesEnabled, templaterPlugin } = getTemplatePlugins(app);

  const templateFiles = getTemplateChoices(app, templateFolder);
  const vaultFolders = getFolderChoices(app);

  let templateWarning = '';

  if (!templatesEnabled && !templaterPlugin) {
    templateWarning = t('Note: No template plugins are currently enabled.');
  }

  return {
    templateFiles,
    vaultFolders,
    templateWarning,
  };
}

interface CreateSearchSelectParams {
  choices: PathChoice[];
  key: keyof KanbanSettings;
  warningText?: string;
  local: boolean;
  placeHolderStr: string;
  manager: SettingsManager;
}

class PathSuggestModal extends FuzzySuggestModal<PathChoice> {
  constructor(
    app: App,
    private choices: PathChoice[],
    private onSelect: (choice: PathChoice) => void
  ) {
    super(app);
    this.setPlaceholder(t('Search...'));
  }

  getItems() {
    return this.choices;
  }

  getItemText(choice: PathChoice) {
    return choice.label;
  }

  onChooseItem(choice: PathChoice) {
    this.onSelect(choice);
  }
}

export function createSearchSelect({
  choices,
  key,
  warningText,
  local,
  placeHolderStr,
  manager,
}: CreateSearchSelectParams) {
  return (setting: Setting) => {
    const [value, globalValue] = manager.getSetting(key, local);
    const inheritedChoice = choices.find((choice) => choice.value === globalValue);
    const defaultChoice: PathChoice = {
      value: '',
      label: inheritedChoice ? `${inheritedChoice.label} (${t('default')})` : placeHolderStr,
    };
    const list = [
      defaultChoice,
      ...choices
        .filter((choice) => choice !== inheritedChoice)
        .sort((a, b) => a.label.localeCompare(b.label)),
    ];

    setting.addButton((button) => {
      button.setButtonText(
        list.find((choice) => choice.value === value)?.label ?? defaultChoice.label
      );

      // The native picker searches the full list without constructing a DOM node for every path.
      const modal = new PathSuggestModal(manager.app, list, (choice) => {
        button.setButtonText(choice.label);
        if (choice.value) {
          manager.applySettingsUpdate({
            [key]: { $set: choice.value },
          });
        } else {
          manager.applySettingsUpdate({ $unset: [key] });
        }
      });
      button.onClick(() => modal.open());
      manager.cleanupFns.push(() => modal.close());
    });

    if (warningText) {
      setting.descEl.createDiv({}, (div) => {
        div.createEl('strong', { text: warningText });
      });
    }
  };
}
