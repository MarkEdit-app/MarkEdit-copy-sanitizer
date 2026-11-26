# MarkEdit-copy-sanitizer

Sanitize copied editor text using regex replacement rules, without changing the document, Cut, or dragging.

## Installation

Install this extension from the [MarkEdit Extension Registry](https://markedit-app.github.io/extensions/#markedit-copy-sanitizer).

## Settings

Add `extension.markeditCopySanitizer` to [settings.json](https://github.com/MarkEdit-app/MarkEdit/wiki/Customization#advanced-settings):

```json
{
  "extension.markeditCopySanitizer": {
    "rules": [
      {
        "pattern": "^mailto:([^?\\s]+)(?:\\?[^\\s]*)?$",
        "flags": "i",
        "replacement": "$1"
      }
    ]
  }
}
```

This example copies `mailto:hello@example.com?subject=Hello` as `hello@example.com`.

Rules run in order using JavaScript regex and replacement syntax (`$1`, `$&`, etc.).

Fields `pattern` and `replacement` are required; `flags` is optional. Use `g` for all matches and escape backslashes in JSON.

## Development

```sh
yarn test
yarn typecheck
yarn build
```

Tests require Node.js 22.18+. The build deploys to MarkEdit. For browser tests, run `yarn vite --host 127.0.0.1` and open `/test/copy.html`.
