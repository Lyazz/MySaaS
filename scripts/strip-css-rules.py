"""Removes top-level CSS rules (by selector) from a .vue <style> block.

Used once to pull the per-form copies of the settings field/toast/toggle styles
out into assets/css/admin-settings.css. Kept in scripts/ so the extraction is
reproducible if more forms are folded into the shared sheet later.

    python scripts/strip-css-rules.py <file.vue> <selector> [<selector> ...]

A selector is matched against the rule's prelude with whitespace collapsed, so
".field-input, .field-textarea" matches regardless of how it is wrapped.
"""
import io
import re
import sys


def split_rules(css):
    """Yields (prelude, full_text) for each top-level rule."""
    rules = []
    depth = 0
    start = 0
    for i, ch in enumerate(css):
        if ch == '{':
            if depth == 0:
                prelude = css[start:i]
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                rules.append((prelude, css[start:i + 1], start, i + 1))
                start = i + 1
    return rules


def normalize(prelude):
    # A rule's prelude starts right after the previous rule, so it picks up any
    # comment sitting above it. Ignore comments when matching; they are removed
    # along with the rule they document.
    without_comments = re.sub(r'/\*.*?\*/', ' ', prelude, flags=re.S)
    return re.sub(r'\s+', ' ', without_comments).strip()


def strip(path, selectors):
    source = io.open(path, encoding='utf-8').read()
    match = re.search(r'(<style[^>]*>)(.*?)(</style>)', source, re.S)
    if not match:
        raise SystemExit(f'{path}: no <style> block')

    css = match.group(2)
    wanted = {normalize(s) for s in selectors}
    removed = []

    for prelude, text, start, end in reversed(split_rules(css)):
        if normalize(prelude) in wanted:
            css = css[:start] + css[end:]
            removed.append(normalize(prelude))

    css = re.sub(r'\n{3,}', '\n\n', css)
    source = source[:match.start(2)] + css + source[match.end(2):]
    io.open(path, 'w', encoding='utf-8', newline='').write(source)

    missing = wanted - set(removed)
    for sel in sorted(missing):
        print(f'  ! not found: {sel}')
    print(f'{path}: removed {len(removed)} rule(s)')


if __name__ == '__main__':
    strip(sys.argv[1], sys.argv[2:])
