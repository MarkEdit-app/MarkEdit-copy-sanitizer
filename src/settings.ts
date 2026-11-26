export type Rule = {
  pattern: RegExp;
  replacement: string;
};

const settingsKey = 'extension.markeditCopySanitizer';

export function compileRules(settings: unknown): Rule[] {
  if (settings === undefined) {
    return [];
  }

  if (!isObject(settings)) {
    console.error(`[${settingsKey}] Expected a settings object.`);
    return [];
  }

  if (settings.rules === undefined) {
    return [];
  }

  if (!Array.isArray(settings.rules)) {
    console.error(`[${settingsKey}] Expected "rules" to be an array.`);
    return [];
  }

  return settings.rules.flatMap((rule: unknown, index): Rule[] => {
    const prefix = `[${settingsKey}] Rule ${index + 1}:`;
    if (!isObject(rule)
      || typeof rule.pattern !== 'string'
      || typeof rule.replacement !== 'string'
      || (rule.flags !== undefined && typeof rule.flags !== 'string')) {
      console.error(`${prefix} Expected string "pattern", "replacement", and optional "flags".`);
      return [];
    }

    try {
      return [{ pattern: new RegExp(rule.pattern, rule.flags), replacement: rule.replacement }];
    } catch (error) {
      if (!(error instanceof SyntaxError)) {
        throw error;
      }

      console.error(`${prefix} Invalid regular expression.`, error);
      return [];
    }
  });
}

export function sanitize(text: string, rules: readonly Rule[]): string {
  return rules.reduce((result, { pattern, replacement }) => {
    pattern.lastIndex = 0;
    return result.replace(pattern, replacement);
  }, text);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
