import { EditorView } from '@codemirror/view';
import type { EditorState, Extension } from '@codemirror/state';
import { sanitize, type Rule } from './settings.ts';

export function copySanitizer(rules: readonly Rule[]): Extension {
  const copies = new WeakMap<EditorState, ClipboardEvent>();

  return [
    EditorView.domEventObservers({
      copy(event, view) {
        const state = view.state;
        copies.set(state, event);
        queueMicrotask(() => {
          if (copies.get(state) === event) {
            copies.delete(state);
          }
        });
      },
    }),
    EditorView.clipboardOutputFilter.of((text, state) => {
      const event = copies.get(state);
      // The facet also runs for Cut and dragging; only transform during Copy dispatch.
      if (event === undefined || event.eventPhase === Event.NONE) {
        return text;
      }

      const result = sanitize(text, rules);
      // CodeMirror falls back to native copying for an empty filtered selection.
      if (text !== '' && result === '') {
        if (event.clipboardData === null) {
          console.error('[extension.markeditCopySanitizer] Cannot copy an empty replacement without clipboard data.');
          return text;
        }

        event.clipboardData.clearData();
        event.clipboardData.setData('text/plain', '');
        event.preventDefault();
      }

      return result;
    }),
  ];
}
