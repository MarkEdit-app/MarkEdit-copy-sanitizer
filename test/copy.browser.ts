import { EditorState, EditorSelection, StateEffect } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { copySanitizer } from '../src/copy.ts';
import { compileRules } from '../src/settings.ts';

const results: string[] = [];
const rules = compileRules({ rules: [{ pattern: 'mailto:', flags: 'g', replacement: '' }] });

function equal(actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function clipboard(view: EditorView, type: 'copy' | 'cut' | 'paste', data = new DataTransfer()) {
  view.focus();
  const event = new ClipboardEvent(type, { bubbles: true, cancelable: true, clipboardData: data });
  view.contentDOM.dispatchEvent(event);
  return { event, data };
}

function check(name: string, run: (view: EditorView) => void) {
  const view = new EditorView({
    parent: document.body,
    state: EditorState.create({
      doc: 'mailto:a@example.com\nmailto:b@example.com',
      extensions: [EditorState.allowMultipleSelections.of(true), copySanitizer(rules)],
    }),
  });
  try {
    run(view);
    results.push(`PASS ${name}`);
  } catch (error) {
    results.push(`FAIL ${name}: ${error}`);
  } finally {
    view.destroy();
  }
}

check('Copy sanitizes without changing the document or selection', view => {
  const doc = view.state.doc.toString();
  view.dispatch({ selection: { anchor: 0, head: 20 } });
  const { event, data } = clipboard(view, 'copy');
  equal(event.defaultPrevented, true);
  equal(data.getData('text/plain'), 'a@example.com');
  equal(view.state.doc.toString(), doc);
  equal(view.state.selection.main.to, 20);
});

check('Multiple selections retain their line separator', view => {
  view.dispatch({
    selection: EditorSelection.create([
      EditorSelection.range(0, 20),
      EditorSelection.range(21, view.state.doc.length),
    ]),
  });
  equal(clipboard(view, 'copy').data.getData('text/plain'), 'a@example.com\nb@example.com');
});

check('Line-copy keeps CodeMirror linewise paste behavior', view => {
  view.dispatch({ selection: { anchor: 5 } });
  const { data } = clipboard(view, 'copy');
  equal(data.getData('text/plain'), 'a@example.com');
  view.dispatch({ selection: { anchor: 26 } });
  clipboard(view, 'paste', data);
  equal(view.state.doc.toString(), 'mailto:a@example.com\na@example.com\nmailto:b@example.com');
});

check('Cut immediately after Copy is not sanitized', view => {
  view.dispatch({ selection: { anchor: 0, head: 20 } });
  clipboard(view, 'copy');
  equal(clipboard(view, 'cut').data.getData('text/plain'), 'mailto:a@example.com');
  equal(view.state.doc.toString(), '\nmailto:b@example.com');
});

check('Dragging immediately after Copy is not sanitized', view => {
  view.dispatch({ selection: { anchor: 0, head: 20 } });
  clipboard(view, 'copy');
  const data = new DataTransfer();
  view.contentDOM.dispatchEvent(new DragEvent('dragstart', {
    bubbles: true,
    cancelable: true,
    dataTransfer: data,
  }));
  equal(data.getData('text/plain'), 'mailto:a@example.com');
});

check('An empty replacement does not fall back to unsanitized native Copy', view => {
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: 'mailto:' } });
  view.dispatch({ selection: { anchor: 0, head: 7 } });
  const { event, data } = clipboard(view, 'copy');
  equal(event.defaultPrevented, true);
  equal(data.getData('text/plain'), '');
  equal(data.types.includes('text/plain'), true);
  equal(view.state.doc.toString(), 'mailto:');
});

check('Non-matching text copies unchanged', view => {
  view.dispatch({ selection: { anchor: 7, head: 20 } });
  equal(clipboard(view, 'copy').data.getData('text/plain'), 'a@example.com');
});

check('Existing output filters still run', view => {
  view.dispatch({
    effects: StateEffect.appendConfig.of(EditorView.clipboardOutputFilter.of(text => `[${text}]`)),
    selection: { anchor: 0, head: 20 },
  });
  equal(clipboard(view, 'copy').data.getData('text/plain'), '[a@example.com]');
});

document.querySelector('#results')!.textContent = results.join('\n');
