#!/usr/bin/env python3
# يحوّل الملف 03 (ص138–166، صفحة «كويز النيابة وآثار العقد») إلى ثمانية أجزاء بالصيغة الجديدة، جزء لكل درس:
#   c7-1 (l37) إلى c7-3 (l39)، وc8-1 (l40) وc8-2 (l41)، وc9-1 (l42) إلى c9-3 (l44).
# المحتوى المراجَع باقٍ كما هو: تتغيّر المعرّفات وحدها (l1 ← l37 ...، وc1 ← c7 ...)، ويُوضع كل جدول في جزء الدرس
# الذي يضم أكثر صفحاته. والبطاقات وورقة الليلة فارغة، تُبنى بعد التحويل. وكل خانة غير متوقعة توقف البرنامج، فلا يسقط شيء بصمت.
# الاستعمال (من جذر المستودع): python3 _tools/law114/tools/convert03.py <الملف 03.json> <مجلد الإخراج خارج المستودع>
import json, os, re, sys

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
D = json.load(open(src, encoding='utf-8'))
PLAN = {l['id']: l for l in json.load(open('_tools/law114/plan.json', encoding='utf-8'))['lessons']}
OFF = 36                                   # l1 ← l37
CH = {'c1': 'c7', 'c2': 'c8', 'c3': 'c9'}
# الأسماء من عناوين الكتاب وفهرسه (251–252). «الفرع الثالث: النيابة في التعاقد» يأتي في الكتاب وفهرسه بعد المبحث الرابع
# بلا مطلب ولا مبحث يُنسب إليه ظاهراً، فسُمّي باسمه تحت الفصل الأول.
NAME = {
    'c7': 'الفصل الأول: العقد — الفرع الثالث: النيابة في التعاقد',
    'c8': 'الفصل الأول: العقد — المبحث الخامس: آثار العقد — الفرع الأول: آثار العقد من حيث المضمون',
    'c9': 'الفصل الأول: العقد — المبحث الخامس: آثار العقد — الفرع الثاني: آثار العقد من حيث الأشخاص',
}


def pages_of(pg):
    s = set()
    for seg in re.split(r'[،,]', str(pg)):
        seg = seg.strip()
        if not seg:
            continue
        m = re.match(r'^(\d+)\s*[–-]\s*(\d+)$', seg)
        if m:
            s.update(range(int(m[1]), int(m[2]) + 1))
        elif seg.isdigit():
            s.add(int(seg))
        else:
            raise ValueError('page: ' + str(pg))
    return s


def keys_ok(o, allowed, where):
    extra = set(o) - set(allowed)
    if extra:
        raise ValueError(f'{where}: unexpected keys {sorted(extra)}')


def nid(old):                                  # l3o7 ← l39o7، l5s1 ← l41s1
    m = re.match(r'^l(\d+)([a-z]\d+)?$', old)
    if not m:
        raise ValueError('id: ' + old)
    return f'l{int(m[1]) + OFF}{m[2] or ""}'


def block(b, where):
    t = b['t']
    if t == 'h':
        keys_ok(b, ['t', 'x'], where); return {'t': 'h', 'x': b['x']}
    if t in ('p', 'note'):
        keys_ok(b, ['t', 'x', 'pg'], where); return {'t': t, 'x': b['x'], 'pg': b['pg']}
    if t == 'q':
        keys_ok(b, ['t', 'label', 'x', 'pg'], where); return {'t': 'q', 'label': b['label'], 'x': b['x'], 'pg': b['pg']}
    if t == 'list':
        keys_ok(b, ['t', 'lead', 'items', 'ordered', 'pg'], where)
        o = {'t': 'list', 'lead': b['lead'], 'items': b['items'], 'pg': b['pg']}
        if b.get('ordered'):
            o['ordered'] = True
        return o
    raise ValueError(f'{where}: block type {t}')


def objective(o):
    keys_ok(o, ['id', 'k', 'q', 'a', 'opts', 'e', 'why', 'pg'], o['id'])
    r = {'id': nid(o['id']), 'k': o['k'], 'q': o['q']}
    if o['k'] == 'tf':
        r['a'] = o['a']
        if o['a'] is False:
            r['e'] = o['e']
    elif o['k'] == 'mcq':
        r['opts'] = o['opts']; r['a'] = o['a']; r['e'] = o['e']
    else:
        raise ValueError(o['id'] + ': kind ' + o['k'])
    r['why'] = o['why']; r['pg'] = o['pg']
    return r


def essay(e):
    keys_ok(e, ['id', 'q', 'pg', 'points'], e['id'])
    for p in e['points']:
        keys_ok(p, ['x', 'pg'], e['id'] + ' point')
    return {'id': nid(e['id']), 'q': e['q'], 'pg': e['pg'], 'points': [{'x': p['x'], 'pg': p['pg']} for p in e['points']]}


def main():
    idmap = {}
    for c in D['chapters']:
        keys_ok(c, ['id', 'title', 'name', 'pages', 'lessons', 'tables', 'night'], c['id'])
        if c.get('night'):
            raise ValueError(c['id'] + ': night not empty')
        ch = CH[c['id']]; idmap[c['id']] = ch
        les_new = []
        for i, les in enumerate(c['lessons']):
            keys_ok(les, ['id', 'title', 'pages', 'intro', 'summary', 'objective', 'essay', 'steps', 'cards', 'minutes'], les['id'])
            if les.get('cards'):
                raise ValueError(les['id'] + ': cards not empty')
            lid = nid(les['id']); P = PLAN[lid]; idmap[les['id']] = lid
            if P['title'] != les['title'] or P['ch'] != ch:
                raise ValueError(f"{lid}: plan says {P['ch']} «{P['title']}»")
            L = {'id': lid, 'title': les['title'], 'pages': les['pages'], 'minutes': min(int(les['minutes']), 75),
                 'intro': les['intro'],
                 'summary': [block(b, f'{lid}.s{k + 1}') for k, b in enumerate(les['summary'])],
                 'cards': [],
                 'objective': [objective(o) for o in les['objective']],
                 'essay': [essay(e) for e in les['essay']]}
            if les.get('steps'):
                st = []
                for s in les['steps']:
                    keys_ok(s, ['id', 'title', 'items', 'pg'], s['id'])
                    st.append({'id': nid(s['id']), 'title': s['title'], 'items': s['items'], 'pg': s['pg']})
                L['steps'] = st
            for o in les['objective'] + les['essay']:
                idmap[o['id']] = nid(o['id'])
            les_new.append((i + 1, les, L, set(range(P['p1'], P['p2'] + 1))))
        # الجداول: في جزء الدرس الذي يضم أكثر صفحاتها، وعند التساوي الأخير منها. وتُرقّم بترتيبها الأصلي.
        tabs = {k: [] for k, _, _, _ in les_new}
        for t in c['tables']:
            keys_ok(t, ['id', 'title', 'cols', 'rows', 'core', 'pg'], t['id'])
            pg = pages_of(t['pg'])
            best = max(les_new, key=lambda x: (len(pg & x[3]), x[0]))
            tabs[best[0]].append(t)
        order = [t['id'] for k, _, _, _ in les_new for t in tabs[k]]
        if order != [t['id'] for t in c['tables']]:
            raise ValueError(c['id'] + ': table order would change: ' + ' '.join(order))
        n = 0
        for part, les, L, _ in les_new:
            T = []
            for t in tabs[part]:
                n += 1; tid = f'{ch}t{n}'; idmap[t['id']] = tid
                T.append({'id': tid, 'title': t['title'], 'cols': t['cols'], 'rows': t['rows'], 'core': t['core'], 'pg': t['pg']})
            chapter = {'id': ch, 'title': PLAN[L['id']]['chTitle'], 'name': NAME[ch], 'pages': L['pages'],
                       'lessons': [L], 'tables': T, 'night': []}
            head = (f"/* law114 — الفصل {ch} «{chapter['title']}»، الجزء {part}: الدرس {L['id']} (ص{L['pages']}).\n"
                    f"   محوَّل ببرنامج من الملف 03 (الدرس {les['id']} «{les['title']}» في صفحة «كويز النيابة وآثار العقد»)، ومحتواه المراجَع باقٍ كما هو.\n"
                    f"   يُضاف بعد التحويل: التعريفات بنص الكتاب، وأسئلة التواريخ، والبطاقات، وورقة الليلة، وإعادة كتابة الخيارات الكاشفة. */\n")
            body = '(window.LAW114 = window.LAW114 || { chapters: [] }).chapters.push(' + json.dumps(chapter, ensure_ascii=False, indent=1) + ');\n'
            fn = os.path.join(out, f'{ch}-{part}.js')
            open(fn, 'w', encoding='utf-8').write(head + body)
            print(f"{ch}-{part}.js {L['id']} ({L['pages']}) summary {len(L['summary'])} obj {len(L['objective'])} essay {len(L['essay'])}"
                  f" steps {len(L.get('steps', []))} tables {' '.join(t['id'] for t in T) or '-'}")
    json.dump(idmap, open(os.path.join(out, 'idmap.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


main()
