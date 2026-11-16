import { EditorView } from '@codemirror/view';
import { Dispatch, StateUpdater, useContext, useEffect, useRef } from 'preact/hooks';
import useOnclickOutside from 'react-cool-onclickoutside';
import { t } from 'src/lang/helpers';

import { MarkdownEditor, allowNewLine } from '../Editor/MarkdownEditor';
import { getDropAction } from '../Editor/helpers';
import { KanbanContext } from '../context';
import { c } from '../helpers';
import { EditState, EditingState, Item, isEditing } from '../types';

interface ItemFormProps {
  addItems: (items: Item[]) => void;
  editState: EditState;
  setEditState: Dispatch<StateUpdater<EditState>>;
  hideButton?: boolean;
}

export function ItemForm({ addItems, editState, setEditState, hideButton }: ItemFormProps) {
  const { stateManager, view } = useContext(KanbanContext);
  const editorRef = useRef<EditorView>();

  const createItem = (title: string) => {
    if (!title.trim()) return;

    addItems([stateManager.getNewItem(title, ' ')]);
    const cm = editorRef.current;
    if (cm) {
      cm.dispatch({
        changes: {
          from: 0,
          to: cm.state.doc.length,
          insert: '',
        },
      });
    }
  };

  const clear = () => setEditState(EditingState.cancel);

  const handleClickOutside = () => {
    const cm = editorRef.current;
    if (cm) {
      const content = cm.state.doc.toString().trim();
      if (content) {
        // If there is content, we save the card
        createItem(content);
      } else {
        // If there is no content, we cancel
        clear();
      }
    } else {
      clear();
    }
  };

  // Listen for global save event (triggered when view closes, tab changes, etc)
  useEffect(() => {
    const handleSaveAll = () => {
      const cm = editorRef.current;
      if (cm) {
        const content = cm.state.doc.toString().trim();
        if (content) {
          // If there is content, save the card
          createItem(content);
        }
      }
    };

    view?.containerEl?.addEventListener('save-all-editing-items', handleSaveAll);
    return () => {
      view?.containerEl?.removeEventListener('save-all-editing-items', handleSaveAll);
    };
  }, [view]);

  const clickOutsideRef = useOnclickOutside(handleClickOutside, {
    // Only while editing: once the editor unmounts the hook has no element left, and it then
    // treats every click anywhere as outside.
    disabled: !isEditing(editState),
    ignoreClass: [
      c('ignore-click-outside'),
      'mobile-toolbar',
      'suggestion-container',
      'menu',
      'menu-item',
    ],
  });

  if (isEditing(editState)) {
    return (
      <div className={c('item-form')} ref={clickOutsideRef}>
        <div className={c('item-input-wrapper')}>
          <MarkdownEditor
            editorRef={editorRef}
            editState={{ x: 0, y: 0 }}
            className={c('item-input')}
            placeholder={t('Card title...')}
            onEnter={(cm, mod, shift) => {
              if (!allowNewLine(stateManager, mod, shift)) {
                createItem(cm.state.doc.toString());
                return true;
              }
            }}
            onSubmit={(cm) => {
              createItem(cm.state.doc.toString());
            }}
            onEscape={clear}
          />
        </div>
      </div>
    );
  }

  if (hideButton) return null;

  return (
    <div className={c('item-button-wrapper')}>
      <button
        className={c('new-item-button')}
        // Don't move focus on press: a blur closes the mobile keyboard and shifts the layout
        // before the tap lands, so the first tap would miss. (mousedown, not pointerdown:
        // suppressing pointerdown also cancels mousedown, which click-outside handlers need.)
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setEditState({ x: 0, y: 0 })}
        onDragOver={(e) => {
          if (getDropAction(stateManager, e.dataTransfer)) {
            setEditState({ x: 0, y: 0 });
          }
        }}
      >
        <span className={c('item-button-plus')}>+</span> {t('Add a card')}
      </button>
    </div>
  );
}
