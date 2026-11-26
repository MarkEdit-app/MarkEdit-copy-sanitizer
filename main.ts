import { MarkEdit } from 'markedit-api';
import { copySanitizer } from './src/copy.ts';
import { compileRules } from './src/settings.ts';

const rules = compileRules(MarkEdit.userSettings['extension.markeditCopySanitizer']);
if (rules.length > 0) {
  MarkEdit.addExtension(copySanitizer(rules));
}