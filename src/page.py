"""Page assembly — splices rendered fragments into the static assets.

The page is plain-string token replacement, never an f-string, so CSS/JS
need no brace-doubling and no escape gymnastics (the class of bugs in
HANDOFF.md §7.2 cannot happen anymore). Assets:

  assets/head.html    doctype, meta, fonts        (static)
  assets/styles.css   all CSS                     (static)
  assets/body.html    views, dock, tour markup    (tokens: cards, key, toolbar)
  assets/domain.js    registry classes + accessors (static, loaded first)
  assets/app.js       all runtime JS              (tokens: ANS/QMETA/SETMETA data)
  assets/tail.html    closing tags                (static)
"""
from pathlib import Path

from . import content, models, render

ASSETS = Path(__file__).resolve().parent / 'assets'
OUT = Path(__file__).resolve().parent.parent / 'index.html'


def build():
    questions = models.load_questions(content.TIER, content.DEBATE, content.QLINKS)
    ctx = render.context(questions)

    body = (ASSETS / 'body.html').read_text()
    js = (ASSETS / 'domain.js').read_text() + '\n' + (ASSETS / 'app.js').read_text()
    for tok, val in ctx.items():
        body = body.replace(tok.value, val)
        js = js.replace(tok.value, val)
    for part in (body, js):
        assert not any(t.value in part for t in ctx), 'unreplaced token'

    page = (
        (ASSETS / 'head.html').read_text()
        + '<style>' + (ASSETS / 'styles.css').read_text() + '</style>'
        + body
        + '<script>' + js + '</script>'
        + (ASSETS / 'tail.html').read_text()
    )
    OUT.write_text(page)
    print('written', len(page))
