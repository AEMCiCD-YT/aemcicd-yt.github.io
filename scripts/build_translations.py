#!/usr/bin/env python3
"""Generate complete, static English pages using only Python's standard library.

Run from any directory: python3 scripts/build_translations.py
Spanish HTML is the source of truth; unknown text fails the build rather than
silently leaving part of an English page in Spanish.
"""
from pathlib import Path
from html.parser import HTMLParser
from html import escape
from urllib.parse import urljoin, urlsplit, urlunsplit
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://aemcicd.org'
ROUTES = {
    'index.html': '/en/',
    '404.html': '/en/404.html',
    'nosotros/index.html': '/en/about/',
    'directiva/index.html': '/en/board/',
    'actividades/index.html': '/en/activities/',
    'proyectos/index.html': '/en/projects/',
    'proyectos/conecta/index.html': '/en/projects/conecta/',
    'proyectos/braillelab/index.html': '/en/projects/braillelab/',
    'transparencia/index.html': '/en/transparency/',
    'colabora/index.html': '/en/support/',
    'contacto/index.html': '/en/contact/',
    'reconocimientos/index.html': '/en/recognition/',
    'privacidad/index.html': '/en/privacy/',
}

def spanish_url(path):
    return '/' if path == 'index.html' else '/' + path.removesuffix('index.html')

PATHS = {spanish_url(p): en for p, en in ROUTES.items()}

# braillelab.org publica su versión en inglés bajo /en con rutas traducidas.
BRAILLELAB_PATHS = {
    '/': '/en/',
    '/reto/': '/en/challenge/',
    '/participar/': '/en/participate/',
    '/cronograma/': '/en/schedule/',
    '/recursos/': '/en/resources/',
    '/braillelab/': '/en/braillelab/',
    '/alianzas/': '/en/support/',
    '/transparencia/': '/en/transparency/',
    '/privacidad/': '/en/privacy/',
}

class Translator(HTMLParser):
    def __init__(self, path, translations, inventory=False):
        super().__init__(convert_charrefs=False)
        self.path = path
        self.translations = translations
        self.inventory = inventory
        self.strings = []
        self.out = []
        self.raw = False
        self.missing = set()

    def translate(self, value):
        text = value.strip()
        if not re.search(r'[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]', text):
            return value
        if text not in self.strings:
            self.strings.append(text)
        if self.inventory:
            return value
        if text not in self.translations:
            self.missing.add(text)
            return value
        return value[:len(value)-len(value.lstrip())] + self.translations[text] + value[len(value.rstrip()):]

    def local_url(self, value, tag, attrs):
        # Language alternatives retain their intended destination.
        if attrs.get('rel') == 'alternate':
            return value
        if attrs.get('class') == 'language-switch':
            return spanish_url(self.path)
        if value.startswith('#') or value.startswith(('mailto:', 'tel:', 'data:')):
            return value
        parsed = urlsplit(urljoin(ORIGIN + spanish_url(self.path), value))
        if parsed.hostname == 'braillelab.org' and parsed.path in BRAILLELAB_PATHS:
            return urlunsplit(('https', 'braillelab.org', BRAILLELAB_PATHS[parsed.path], parsed.query, parsed.fragment))
        if parsed.hostname != 'aemcicd.org':
            # Google's linked data-use policy has its own English version.
            if parsed.hostname == 'policies.google.com':
                return value.replace('hl=es', 'hl=en')
            return value
        if parsed.path.startswith('/en/'):
            return value
        target = PATHS.get(parsed.path, parsed.path)
        if attrs.get('rel') == 'canonical' or (tag == 'meta' and attrs.get('property') == 'og:url'):
            return urlunsplit(('https', 'aemcicd.org', target, parsed.query, parsed.fragment))
        return urlunsplit(('', '', target, parsed.query, parsed.fragment))

    def start(self, tag, items, closed=False):
        attrs = dict(items)
        updated = []
        for name, value in items:
            if value is None:
                updated.append(name)
                continue
            if tag == 'html' and name == 'lang':
                value = 'en'
            elif name in ('href', 'src'):
                value = self.local_url(value, tag, attrs)
            elif tag == 'meta' and name == 'content':
                if attrs.get('property') == 'og:locale':
                    value = 'en_US'
                elif attrs.get('property') == 'og:url':
                    value = self.local_url(value, tag, attrs)
                elif attrs.get('name') == 'description' or attrs.get('property') in ('og:title','og:description'):
                    value = self.translate(value)
            elif name in ('alt', 'aria-label', 'placeholder', 'title'):
                value = 'Cambiar a español' if attrs.get('class') == 'language-switch' and name == 'aria-label' else self.translate(value)
            elif attrs.get('class') == 'language-switch' and name in ('lang', 'hreflang'):
                value = 'es'
            updated.append(f'{name}="{escape(value, quote=True)}"')
        self.out.append('<' + tag + (' ' if updated else '') + ' '.join(updated) + (' />' if closed else '>'))
        if tag in ('script', 'style') and not closed:
            self.raw = True

    def handle_starttag(self, tag, attrs):
        self.start(tag, attrs)

    def handle_startendtag(self, tag, attrs):
        self.start(tag, attrs, True)

    def handle_endtag(self, tag):
        self.out.append(f'</{tag}>')
        if tag in ('script', 'style'):
            self.raw = False

    def handle_data(self, data):
        if self.raw:
            self.out.append(data)
        elif data.strip() == 'EN':
            self.out.append(data.replace('EN', 'ES'))
        else:
            self.out.append(escape(self.translate(data), quote=False))

    def handle_entityref(self, name):
        self.out.append(f'&{name};')

    def handle_charref(self, name):
        self.out.append(f'&#{name};')

    def handle_decl(self, decl):
        self.out.append(f'<!{decl}>')

    def handle_comment(self, data):
        self.out.append(f'<!--{data}-->')

def inventory():
    strings = []
    grouped = {}
    for path in ROUTES:
        parser = Translator(path, {}, inventory=True)
        parser.feed((ROOT / path).read_text())
        grouped[path] = []
        for text in parser.strings:
            if text not in strings:
                grouped[path].append((len(strings),text))
                strings.append(text)
    return strings, grouped

def build(check=False):
    translations = json.loads((ROOT / 'translations/en.json').read_text())
    outputs = []
    missing = set()
    for path, url in ROUTES.items():
        parser = Translator(path, translations)
        parser.feed((ROOT / path).read_text())
        missing.update(parser.missing)
        target = ROOT / (url.lstrip('/') + 'index.html' if url.endswith('/') else url.lstrip('/'))
        outputs.append((target, ''.join(parser.out)))
    if missing:
        raise SystemExit('Missing English translations:\n' + '\n'.join(sorted(missing)))
    stale = []
    for target, content in outputs:
        if check:
            if not target.exists() or target.read_text() != content:
                stale.append(str(target.relative_to(ROOT)))
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(content)
    if stale:
        raise SystemExit('Regenerate English pages:\n' + '\n'.join(stale))
    print(f'{"Verified" if check else "Generated"} {len(outputs)} complete English pages.')

if __name__ == '__main__':
    if '--inventory' in sys.argv:
        strings, grouped = inventory()
        print(json.dumps(grouped, ensure_ascii=False, indent=2))
    else:
        build('--check' in sys.argv)
