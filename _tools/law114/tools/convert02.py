#!/usr/bin/env python3
"""يحوّل الملف 02 (ص75–138) إلى أجزاء بصيغة الموقع الجديد (BUILDER.md وsample.js).
الاستعمال: convert02.py <الملف 02> <plan.json> <مجلد الإخراج>
يكتب: جزءاً لكل درس، وidmap.json (المعرّف القديم ← الجديد)، وtodo.json (ما يتركه للبناة).
ما يحتاج حكماً يُترك علامةً «?»: نوع الخطأ e، والفرق الجوهري core."""
import json, re, sys, os, random

src, planf, out = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(out, exist_ok=True)
D = json.load(open(src))
plan = {l['id']: l for l in json.load(open(planf))['lessons']}

OLD_MIN = [87, 60, 91, 23, 44, 38, 79, 15, 49, 43, 50, 53]  # دقائق الموقع القديم
CH = {
  'c4': ('صحة الرضا', 'الفصل الأول: العقد — المبحث الثالث: أركان العقد — المطلب الأول: الرضا — الفرع الثاني: صحة الرضى'),
  'c5': ('المحل والسبب', 'TODO-NAME-c5'),
  'c6': ('إبطال العقد وبطلانه', 'TODO-NAME-c6'),
}
# الدرس القديم k ← (الدرس الجديد، الفصل، رقم الجزء)
PART = {1: ('c4', 2), 2: ('c4', 3), 3: ('c4', 4), 4: ('c4', 5), 5: ('c4', 6), 6: ('c4', 7),
        7: ('c5', 1), 8: ('c5', 2), 9: ('c6', 1), 10: ('c6', 2), 11: ('c6', 3), 12: ('c6', 4)}
TABLE_START = {'c4': 3, 'c5': 1, 'c6': 1}   # c4t1 وc4t2 في الجزء c4-1 (l24)

def norm(s):
    return re.sub(r'\s+', ' ', (s or '').replace('«', '').replace('»', '')).strip()

def pgnums(pg):
    return [int(n) for n in re.findall(r'\d+', pg or '')]

def pgrange(pgs):
    ns = [n for p in pgs for n in pgnums(p)]
    if not ns: return None
    a, b = min(ns), max(ns)
    return str(a) if a == b else f'{a}–{b}'

STOP = {'في', 'من', 'أو', 'على', 'إلى', 'عن', 'مع', 'التي', 'الذي', 'ما', 'لا', 'أن', 'إن', 'هو', 'هي', 'وهو', 'وهي'}

def split_parts(text):
    """نص الكتاب مقطّعاً على عباراته: إذا ضُمّت القطع بمسافة رجع النص كما هو."""
    words = text.split(' ')
    words = [w for w in words if w != '']
    if len(words) <= 3:
        return words if len(words) >= 2 else [text]
    pieces, cur = [], []
    breakers = ('و', 'ف')
    preps = ('في', 'على', 'من', 'إلى', 'عن', 'بين', 'دون', 'إذا', 'إلا', 'أو', 'لا', 'كما', 'حتى', 'لأن', 'ثم')
    for w in words:
        if cur and (len(cur) >= 5 or (len(cur) >= 3 and (w in preps or (w.startswith(breakers) and len(w) > 3)))):
            pieces.append(cur); cur = []
        cur.append(w)
        if re.search(r'[،؛:.]$', w):
            pieces.append(cur); cur = []
    if cur: pieces.append(cur)
    # دمج القطع المفردة الصغيرة بما قبلها
    merged = []
    for p in pieces:
        if merged and len(p) == 1 and len(merged[-1]) < 4 and not re.search(r'[،؛:.]$', merged[-1][-1]):
            merged[-1] += p
        else:
            merged.append(p)
    pieces = merged
    while len(pieces) > 14:
        i = min(range(len(pieces) - 1), key=lambda k: len(pieces[k]) + len(pieces[k + 1]))
        pieces[i:i + 2] = [pieces[i] + pieces[i + 1]]
    if len(pieces) < 2:
        h = len(words) // 2
        pieces = [words[:h], words[h:]]
    res = [' '.join(p) for p in pieces]
    assert ' '.join(res) == ' '.join(words), text
    return res

def hide_words(term, text):
    tw = [w for w in re.split(r'[\s()،]+', term) if len(w) >= 3 and w not in STOP and not w.isdigit()]
    out = []
    for w in text.split(' '):
        ww = re.sub(r'[،؛:.«»()]', '', w)
        for t in tw:
            base = t[2:] if t.startswith('ال') else t
            if len(base) >= 3 and (ww == t or ww.endswith(base) and len(ww) - len(base) <= 3):
                if ww and ww not in out: out.append(ww)
    return out

def clean_term(h):
    return re.sub(r'^\s*\d+\.\s*', '', h).strip()

def lead_of(h, n):
    h = h.strip()
    h = h[:-1] if h.endswith(':') else h
    return h if h.endswith('؟') else f'{h}:'

EFF = {'void': 'باطل', 'able': 'قابل للإبطال', 'ok': 'صحيح', 'stop': None}

def count_lead(front, word):
    if word in ('اثنان', 'اثنتان'):
        return front + ':'
    return f'{front} {word}:'

def main():
    idmap, todo = {}, {'defs_from_cards': [], 'art_defs': [], 'list_inside': [], 'notes': []}
    lessons_by_part = {}
    tables_by_lesson = {}
    for t in D['tables']:
        tables_by_lesson.setdefault(max(t['l']), []).append(t)
    tcount = dict(TABLE_START)
    for les in D['lessons']:
        k = les['id']; nid = f'l{24 + k}'; ch, part = PART[k]
        P = plan[nid]
        # البطاقات: أي نص يُشتق منه التعريف
        defcards = [c for c in les['c'] if not c.get('t')]
        used = set()
        def card_for(text):
            nt = norm(text)
            for c in defcards:
                if c['id'] not in used and norm(c['b']) == nt:
                    used.add(c['id']); return c
            return None
        def card_inside(text):
            nt = norm(text); res = []
            for c in defcards:
                if c['id'] not in used and len(norm(c['b'])) > 8 and norm(c['b']) in nt:
                    res.append(c)
            return res
        def qdef(term, text, pg, label=None, fam=None, front=None, card=None, pre=None, post=None):
            b = {'t': 'q', 'label': label or f'تعريف {term}', 'pg': pg,
                 'def': {'term': term, 'fam': fam or P['title'], 'hide': hide_words(term, text)}}
            if front and front != term: b['def']['front'] = front
            if pre: b['pre'] = pre
            b['parts'] = split_parts(text)
            if post: b['post'] = post
            if card: idmap[card['id']] = f'{nid}:def:{term}'
            return b
        summary = []
        lastpg = les['pages'].split('–')[0]
        def addp(x, pg):
            summary.append({'t': 'p', 'x': x, 'pg': pg})
        def after_inside(text, pg):
            """بطاقات تعريف نصها داخل هذه الكتلة: تُضاف بعدها كتلة تعريف."""
            for c in card_inside(text):
                used.add(c['id'])
                summary.append(qdef(c['f'], c['b'], c.get('pg') or pg, card=c))
                todo['defs_from_cards'].append({'card': c['id'], 'lesson': nid, 'term': c['f'], 'why': 'نص البطاقة داخل كتلة من الملخص، فأُضيف تعريفاً بعدها'})
        for sec in les['sections']:
            summary.append({'t': 'h', 'x': sec['h']})
            for b in sec['b']:
                t = b['t']; pg = b.get('pg') or lastpg; lastpg = pg
                if t == 'p':
                    addp(b['x'], pg); after_inside(b['x'], pg)
                elif t == 'h3':
                    summary.append({'t': 'h', 'x': b['x']})
                elif t == 'def':
                    c = card_for(b['x'])
                    lab = f"تعريف {b['h']}" + (' (من الحاشية)' if b.get('hs') else '')
                    summary.append(qdef(b['h'], b['x'], pg, label=lab, front=c['f'] if c else None, card=c))
                elif t == 'quote':
                    c = card_for(b['x'])
                    if c:
                        summary.append(qdef(c['f'], b['x'], pg, label=b.get('h') or f"تعريف {c['f']}", card=c))
                    else:
                        summary.append({'t': 'q', 'label': b.get('h') or 'من نص الكتاب', 'x': b['x'], 'pg': pg})
                elif t == 'art':
                    lab = f"نص المادة {b['no']} من نظام المعاملات المدنية"
                    c = card_for(b['x'])
                    if c:
                        summary.append(qdef(c['f'], b['x'], pg, label=lab, fam='نصوص النظام', card=c))
                        todo['art_defs'].append({'lesson': nid, 'card': c['id'], 'front': c['f'], 'no': b['no']})
                    else:
                        ins = card_inside(b['x'])
                        if ins:
                            c = ins[0]; used.add(c['id'])
                            x = norm(b['x']); cb = norm(c['b']); i = x.index(cb)
                            pre, post = x[:i].strip() or None, x[i + len(cb):].strip() or None
                            summary.append(qdef(c['f'], cb, pg, label=lab, fam='نصوص النظام', card=c, pre=pre, post=post))
                            todo['art_defs'].append({'lesson': nid, 'card': c['id'], 'front': c['f'], 'no': b['no']})
                        else:
                            summary.append({'t': 'q', 'label': lab, 'x': b['x'], 'pg': pg})
                elif t == 'list':
                    items = []; pgs = []
                    for it in b['items']:
                        hx, xx = it.get('h', ''), it.get('x', '')
                        c = card_for(xx) if xx else None
                        if c:  # تعريف البند بنص الكتاب: يبقى اسم البند في القائمة، ويُعرَّف بعدها
                            items.append(hx); it['_def'] = c
                        else:
                            items.append(f'{hx}: {xx}' if xx and hx else (hx or xx))
                        if it.get('pg'): pgs.append(it['pg'])
                    lp = pgrange(pgs) or pg
                    if len(items) == 1:   # قائمة ببند واحد: فقرة
                        addp(lead_of(b.get('h', ''), 1).rstrip(':').rstrip('،').rstrip() + ': ' + items[0] + ('' if items[0].endswith('.') else '.'), lp)
                    else:
                        blk = {'t': 'list', 'lead': lead_of(b.get('h', 'وهي'), len(items)), 'items': items, 'pg': lp}
                        if b.get('num'): blk['ordered'] = True
                        summary.append(blk)
                    for it in b['items']:
                        if it.get('_def'):
                            c = it['_def']
                            summary.append(qdef(clean_term(it.get('h')) or c['f'], c['b'], it.get('pg') or lp, front=c['f'], card=c))
                        else:
                            after_inside((it.get('h', '') + ' ' + it.get('x', '')), it.get('pg') or lp)
                elif t == 'kinds':
                    for it in b['items']:
                        ipg = it.get('pg') or pg
                        name = clean_term(it['h'])
                        summary.append({'t': 'h', 'x': it['h']})
                        if it.get('d'):
                            c = card_for(it['d'])
                            if not c:
                                # بطاقة نصها التعريف ومعه الحكم
                                for cc in defcards:
                                    if cc['id'] not in used and norm(it['d']) in norm(cc['b']):
                                        c = cc; used.add(cc['id']); break
                            if c and norm(c['b']) != norm(it['d']):
                                todo['notes'].append({'card': c['id'], 'lesson': nid, 'msg': 'نص البطاقة = التعريف ومعه الحكم؛ التعريف وحده كتلة تعريف، والحكم كتلة بعده'})
                            summary.append(qdef(name, it['d'], ipg, front=c['f'] if c and c['f'] != name else None, card=c))
                        if it.get('et'):
                            addp(f"أثره في العقد: {it['et']}.", ipg)
                        if it.get('x'):
                            addp(it['x'], ipg); after_inside(it['x'], ipg)
                        if it.get('hk'):
                            summary.append({'t': 'q', 'label': f'حكم {name}', 'x': it['hk'], 'pg': ipg})
                        egs = it.get('egs') or []
                        if len(egs) == 1:
                            addp(f'ومثاله: {egs[0]}', ipg)
                        elif egs:
                            summary.append({'t': 'list', 'lead': 'ومن أمثلته في الكتاب:', 'items': egs, 'pg': ipg})
                elif t == 'hashia':
                    addp(f"وفي الحاشية: {b['x']}", pg); after_inside(b['x'], pg)
                elif t == 'eg':
                    addp(f"ومن أمثلته: {b['x']}", pg)
                elif t in ('warn', 'tip'):
                    x = re.sub(r'^\s*تنبيه\s*[:：]\s*', '', b['x'])
                    summary.append({'t': 'note', 'x': x, 'pg': pg})
                else:
                    raise SystemExit(f'نوع كتلة غير معروف: {t}')
        # ما بقي من بطاقات التعريف بلا موضع: يُضاف بعد أقرب كتلة تحمل كلماته
        for c in defcards:
            if c['id'] in used: continue
            words = set(norm(c['b']).split()); best, bi = 0, None
            for i, blk in enumerate(summary):
                s = set(norm(blk.get('x', '') + ' ' + ' '.join(blk.get('parts', [])) + ' ' + ' '.join(blk.get('items', []))).split())
                sc = len(words & s)
                if sc > best: best, bi = sc, i
            summary.insert(bi + 1, qdef(c['f'], c['b'], c.get('pg') or lastpg, card=c))
            used.add(c['id'])
            todo['defs_from_cards'].append({'card': c['id'], 'lesson': nid, 'term': c['f'], 'why': 'لم يُعثر على نصه حرفياً في الملخص (يخالفه في لفظ)، فأُضيف بعد أقرب كتلة: يُقابل بالصورة'})
        # المادة 73: فقرتاها كتلتان، وبطاقتها القديمة تجمعهما، فتصيران كتلة تعريف واحدة
        i1 = next((i for i, x in enumerate(summary) if x.get('label', '').startswith('نص المادة 73، الفقرة الأولى')), None)
        idf = next((i for i, x in enumerate(summary) if x.get('def', {}).get('term') == 'المادة 73 (الفقرتان الأولى والثانية)'), None)
        if i1 is not None and idf is not None and summary[i1 + 1].get('label', '').startswith('نص المادة 73، الفقرة الثانية'):
            blk = summary.pop(idf); blk['label'] = 'نص المادة 73 (الفقرتان الأولى والثانية) من نظام المعاملات المدنية'
            blk['def']['fam'] = 'نصوص النظام'
            summary[i1:i1 + 2] = [blk]
            todo['defs_from_cards'] = [x for x in todo['defs_from_cards'] if x['card'] != 'ب7-07']
            todo['art_defs'].append({'lesson': nid, 'card': 'ب7-07', 'front': 'المادة 73 (الفقرتان الأولى والثانية)', 'no': '73/1–2'})
        # البطاقات المكتوبة
        cards = []; kn = 0
        for c in les['c']:
            t = c.get('t')
            if not t: continue
            kn += 1; cid = f'{nid}k{kn}'; idmap[c['id']] = cid
            m = re.match(r'^(.*?)\s*\(([^()]+)\)\s*$', c['f'])
            if t == 'list':
                front, word = (m.group(1), m.group(2)) if m else (c['f'], str(len(c['items'])))
                cards.append({'id': cid, 'type': 'count', 'front': front, 'n': len(c['items']), 'lead': count_lead(front, word), 'items': c['items'], 'pg': c['pg']})
            else:
                ps = c['parts']
                if ps[0]['l'] == 'القاعدة' and len(ps) == 2:
                    exc = ps[1]['x'] if ps[1]['l'] == 'الاستثناء' else f"{ps[1]['l']}: {ps[1]['x']}"
                    cards.append({'id': cid, 'type': 'rule', 'front': c['f'], 'rule': ps[0]['x'], 'exc': exc, 'pg': c['pg']})
                else:
                    cards.append({'id': cid, 'type': 'count', 'front': c['f'], 'n': len(ps), 'lead': c['f'].rstrip('؟?') + ':', 'items': [f"{p['l']}: {p['x']}" for p in ps], 'pg': c['pg']})
        # الأسئلة
        obj, ess = [], []; on = en = 0
        for q in les['q']:
            k2 = q['k']
            if k2 == 'essay':
                en += 1; qid = f'{nid}e{en}'; idmap[q['id']] = qid
                pts = [{'x': p['x'], 'pg': p['pg']} for p in q['pts']]
                ess.append({'id': qid, 'q': q['q'], 'pg': pgrange([p['pg'] for p in pts]) or q.get('pg'), 'points': pts})
                continue
            on += 1; qid = f'{nid}o{on}'; idmap[q['id']] = qid
            if k2 == 'tf':
                o = {'id': qid, 'k': 'tf', 'q': q['q'], 'a': bool(q['a'])}
                if not q['a']: o['e'] = '?'
                o['why'] = q['w']; o['pg'] = q['pg']
            else:
                opts = list(q['o']); a = q['a']
                rnd = random.Random(qid); order = list(range(len(opts))); rnd.shuffle(order)
                opts2 = [opts[i] for i in order]; a2 = order.index(a)
                e = [None if i == a2 else '?' for i in range(len(opts2))]
                if k2 == 'mcq':
                    o = {'id': qid, 'k': 'mcq', 'q': q['q'], 'opts': opts2, 'a': a2, 'e': e, 'why': q['w'], 'pg': q['pg']}
                else:
                    assert '____' in q['q'], q['id']
                    o = {'id': qid, 'k': 'fill', 'q': q['q'], 'a': opts[a], 'opts': opts2, 'e': e, 'why': q['w'], 'pg': q['pg']}
            obj.append(o)
        intro = [s.strip() + ('' if s.strip().endswith(('.', '؟')) else '.') for s in re.split(r'(?<=[.؟])\s+', les['intro']) if s.strip()]
        lesson = {'id': nid, 'title': P['title'], 'pages': les['pages'], 'minutes': min(OLD_MIN[k - 1], 75),
                  'intro': intro, 'summary': summary, 'cards': cards, 'objective': obj, 'essay': ess}
        # الجداول: في جزء آخر دروسها
        tabs = []
        for t in tables_by_lesson.get(k, []):
            tid = f'{ch}t{tcount[ch]}'; tcount[ch] += 1; idmap[t['id']] = tid
            tabs.append({'id': tid, 'title': t['t'], 'cols': ['وجه المقارنة'] + t['cols'],
                         'rows': [[r['h']] + r['c'] for r in t['rows']], 'core': '?',
                         'pg': pgrange([r.get('pg', '') for r in t['rows']]) or les['pages']})
        night = []
        for n in les['n']:
            night.append({'x': n['x'], 'pg': n['pg']}); idmap[n['id']] = f'{ch}:night'
        title, name = CH[ch]
        chapter = {'id': ch, 'title': title, 'name': name, 'pages': les['pages'], 'lessons': [lesson], 'tables': tabs, 'night': night}
        head = (f"/* law114 — الفصل {ch} «{title}»، الجزء {part}: الدرس {nid} (ص{les['pages']}).\n"
                f"   محوَّل ببرنامج من الملف 02 (الدرس {k} «{les['title']}» في الموقع القديم، ومعرّفه القديم l{k})، ومحتواه المراجَع باقٍ كما هو.\n"
                f"   أُضيف بعد التحويل: نوع الخطأ، وإعادة كتابة الخيارات الكاشفة، وتحويل أسئلة أرقام المواد، والفرق الجوهري للجداول. */\n")
        body = '(window.LAW114 = window.LAW114 || { chapters: [] }).chapters.push(' + json.dumps(chapter, ensure_ascii=False, indent=1) + ');\n'
        fn = os.path.join(out, f'{ch}-{part}.js')
        open(fn, 'w').write(head + body)
        print(fn, nid, 'summary', len(summary), 'cards', len(cards), 'obj', len(obj), 'essay', len(ess), 'tables', len(tabs), 'night', len(night))
    json.dump(idmap, open(os.path.join(out, 'idmap.json'), 'w'), ensure_ascii=False, indent=1)
    json.dump(todo, open(os.path.join(out, 'todo.json'), 'w'), ensure_ascii=False, indent=1)

main()
