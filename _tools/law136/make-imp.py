#!/usr/bin/env python3
"""يولّد law136/data/imp.js: وسم «المهم» ومجموعات خانته، من ترتيب الدروس وصفحات أسئلة بنك المقالي.
يقرأ ملفات البيانات نصاً ولا يشغّلها، ولا يغيّر منها شيئاً. الاستعمال من جذر المستودع:
    python3 _tools/law136/make-imp.py law136
القاعدة: يوسم البند إذا وقعت صفحته في صفحات سؤال من البنك يخص درسه. فإن كان الدرس مرتباً ولا سؤال له فالدرس كله.
والدرجة 1 «الأهم» للمجموعات الأربع عشرة الأولى، والدرجة 2 «مهم» لما بعدها، والدرجة 0 باقي التحديد."""
import json, os, re, sys

CHAPTERS = ['c1', 'c2', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10']
# ترتيب الدروس: المجموعات الأربع عشرة الأولى، ثم القائمة الثانية، ثم ما تناولته الأسئلة من غيرها، ثم المتأخرة
LV1 = [[41], [39], [20], [18], [19], [3], [2], [29, 30], [36, 37], [43], [44], [45], [48, 49], [40, 42]]
LV2 = [[50, 51], [52, 53], [22], [7, 8, 9, 10], [13, 15, 16], [38], [12], [14], [17], [21], [46],
       [24, 25, 26], [27, 28], [31, 33, 35]]
LATE = [23, 24, 25, 26, 27, 28, 31, 32, 33, 34, 35]   # تأتي آخر باقي التحديد
# الصفحات التي تناولتها أسئلة البنك الثمانون، لكل سؤال دروسه وصفحاته
BANK = """41:225-226|29:165-167|2:29-30|39:215-216|41:223-227|28,41:163-164,225|20:116-117|48:260-261|37:206-209
3,18:32-34,38-39,106-108|36:205-206|39:217|38:210,213-214|18,19:33-39,106-117|44:237-239
40:220-221|42:227-228|49:264-265|49:265-271|7,8,9:54-63|43:223,232-234|36:204-205|29:164-165|3:33-34|19:112-114
50:271-273|50:272-273|44:234-236|41:222-223|51:274-278
22:120-122|45:240-241|53:283-286|41:224-225|29:165,167-168|31:176-179|10:63-64|49:266-268|51:278-279|45:241-242
30:169-170|21,22:117-120|35:196-197|42:228-229|26:151-154
18,20:109,114-115|12:88-90|43:227,232-233|43:227,233-234|52:279-281|49:268-271|50:273-274|35:198-200
13,14,15:92-99|45:242|45:242|30:170-172|48:261-262|24:135-137|17:104-105
53:287-288|51:276-277|53:284-285|45:239-240|46:247-248|27:157-160|7:54-56|39:218-219|24:134-135|24:140-141
48:263-264|52:281-283|33:188|44:235-236|33:184
40:219-221|38:210-211|28:160-162|25:145-148|31:174-176"""
NOTES = [
    {'x': 'السعودية ليست مثالاً للدستور الجامد في الكتاب: «يعد النظام الأساسي للحكم من الدساتير المرنة».', 'pg': '208'},
    {'x': 'النيابة العامة في الكتاب نواة السلطة التنفيذية، لا جزء من السلطة القضائية.', 'pg': '193'},
    {'x': 'السمات العامة للنظام الأساسي أربعة مطالب بزيادة التحديث والتطوير.', 'pg': '206–209'},
    {'x': 'شروط الملك وولي العهد ثلاثة: الذكورية والنسب والأصلح.', 'pg': '220–221'},
    {'x': 'المجلس الأعلى للقضاء: رئيس وعشرة أعضاء.', 'pg': '271'},
    {'x': 'سؤال الدكتور المقالي الوحيد في الميد الأول: «عدّد مصادر الدستور التقليدية واشرح واحداً منها».'},
    {'x': 'نبّه الدكتور في محاضرة على الفرق بين الدستور والنظام الدستوري والقانون الدستوري.', 'pg': '29–30'},
    {'x': 'أجب عن السؤال كله بأمثلته لا عن أوله وحده، ولا تحذف من التعريف الكلمة التي تحمل القيد.'},
]


def tok_to_json(s):
    """كائن JS بمفاتيح بلا علامات تنصيص ← JSON"""
    out, i, n = [], 0, len(s)
    while i < n:
        c = s[i]
        if c == '"':
            j = i + 1
            while s[j] != '"':
                j += 2 if s[j] == '\\' else 1
            out.append(s[i:j + 1]); i = j + 1
        elif c == '/' and s[i + 1] == '*':
            i = s.index('*/', i) + 2
        elif c == '/' and s[i + 1] == '/':
            i = s.index('\n', i)
        elif c.isalpha() or c == '_':
            j = i
            while s[j].isalnum() or s[j] == '_':
                j += 1
            w, k = s[i:j], j
            while s[k] in ' \t\r\n':
                k += 1
            out.append(json.dumps(w) if s[k] == ':' and w not in ('true', 'false', 'null') else w)
            i = j
        else:
            out.append(c); i += 1
    return re.sub(r',(\s*[}\]])', r'\1', ''.join(out))


def load_chapter(path):
    t = open(path, encoding='utf8').read()
    return json.loads(tok_to_json(t[t.index('.push(') + 6:t.rindex(');')]))


def load_defs(path):
    t = open(path, encoding='utf8').read()
    m = 'window.LAW136_DEFS ='
    return json.loads(tok_to_json(t[t.index(m) + len(m):t.rindex(';')]))


def pages(s):
    s = str(s or '').translate(str.maketrans('٠١٢٣٤٥٦٧٨٩', '0123456789'))
    out = []
    for part in re.split(r'[،,]', s):
        m = re.findall(r'\d+', part)
        if m:
            a, b = int(m[0]), int(m[-1])
            out.append((min(a, b), max(a, b)))
    return out


def hit(a, b):
    return any(x[0] <= y[1] and y[0] <= x[1] for x in a for y in b)


def main(site):
    data = os.path.join(site, 'data')
    chs = {c: load_chapter(os.path.join(data, c + '.js')) for c in CHAPTERS}
    defs = load_defs(os.path.join(data, 'defs.js'))
    les = {}
    for c in chs.values():
        for l in c['lessons']:
            l['_ch'] = c
            les[int(l['id'][1:])] = l
    # صفحات كل درس في البنك
    bp = {}
    q = 0
    for rec in re.split(r'[|\n]', BANK):
        ls, pg = rec.split(':')
        q += 1
        rng = pages(pg.replace('-', '–'))
        for n in ls.split(','):
            bp.setdefault(int(n), []).extend(rng)
    assert q == 80, q
    groups, group_of = [], {}
    for lv, lst in ((1, LV1), (2, LV2)):
        for g in lst:
            ids = ['l%d' % n for n in g]
            x = {'lv': lv, 'les': ids, 'c': [], 'o': [], 't': [], 'n': [], 's': {}}
            groups.append(x)
            for n in g:
                assert n not in group_of, n
                group_of[n] = x
    # الدرس المرتب بلا سؤال يوسم كله
    for n in group_of:
        if n not in bp:
            bp[n] = pages(les[n]['pages'])
    rest = {}

    def rest_of(n):
        if n not in rest:
            rest[n] = {'lv': 0, 'les': ['l%d' % n], 'c': [], 'o': [], 't': [], 'n': [], 's': {}}
        return rest[n]

    def tagged(n, pg):
        return n in group_of and hit(pages(pg), bp.get(n, []))

    level = {}
    for n, l in sorted(les.items()):
        for k in l.get('cards', []):
            t = tagged(n, k.get('pg') or l['pages'])
            (group_of[n] if t else rest_of(n))['c'].append(k['id'])
            level[k['id']] = group_of[n]['lv'] if t else 0
        for o in l.get('objective', []):
            t = tagged(n, o.get('pg') or l['pages'])
            (group_of[n] if t else rest_of(n))['o'].append(o['id'])
        if n in group_of:
            s = [i for i, b in enumerate(l.get('summary', [])) if b.get('t') != 'h' and tagged(n, b.get('pg'))]
            if s:
                group_of[n]['s'][l['id']] = s
    # التعريفات: ما له بطاقة يتبعها، وما لا بطاقة له يدخل البطاقات بمعرّفه
    def_lv = {}
    for d in defs['items']:
        n = int(d['les'][1:])
        src = str(d.get('from'))
        if src in level:
            lv = level[src]
        else:
            t = tagged(n, d.get('pg'))
            lv = group_of[n]['lv'] if t else 0
            (group_of[n] if t else rest_of(n))['c'].append(d['id'])
        if lv:
            def_lv[d['id']] = lv

    # الجداول وأسطر الليلة: إلى أسبق مجموعة تخص صفحاتها، وإلا فإلى باقي الدرس
    order = {id(g): i for i, g in enumerate(groups)}

    def place(c, pg):
        ps = pages(pg)
        cand = []
        for l in c['lessons']:
            n = int(l['id'][1:])
            if hit(ps, pages(l['pages'])) and n in group_of and hit(ps, bp.get(n, [])):
                cand.append(group_of[n])
        if cand:
            return min(cand, key=lambda g: order[id(g)])
        for l in c['lessons']:
            if hit(ps, pages(l['pages'])):
                return rest_of(int(l['id'][1:]))
        return rest_of(int(c['lessons'][0]['id'][1:]))

    for c in chs.values():
        for t in c.get('tables', []):
            place(c, t.get('pg'))['t'].append(t['id'])
        for i, x in enumerate(c.get('night', [])):
            place(c, x.get('pg'))['n'].append('%s:%d' % (c['id'], i))

    late = [n for n in LATE if n in rest]
    first = sorted(n for n in rest if n not in LATE)
    allg = groups + [rest[n] for n in first + late]
    allg = [g for g in allg if g['c'] or g['o'] or g['t'] or g['n']]

    def js(v):
        return json.dumps(v, ensure_ascii=False, separators=(',', ':'))

    lines = ['/* القانون الدستوري (law136) — وسم «المهم» ومجموعات خانته. مولَّد بـ _tools/law136/make-imp.py فلا يُعدَّل باليد.',
             '   lv: 1 «الأهم»، 2 «مهم»، 0 باقي التحديد. وفي كل مجموعة: les دروسها، c البطاقات (ومعها تعريفات لا بطاقة لها بمعرّف dN)،',
             '   o الأسئلة الموضوعية، t جداول المقارنة، n أسطر ورقة الليلة <الفصل>:<الترتيب>، s كتل الملخص الموسومة <الدرس>: [ترتيب الكتلة].',
             '   defs درجة كل تعريف في خانة التعريفات، notes الفخاخ وما نبّه عليه الدكتور. والبند معرّفه ثابت، فالسجل S.imp لا يتأثر بإعادة التوليد. */',
             'window.LAW136_IMP = {', '  v: 1,', '  notes: ' + js(NOTES) + ',', '  defs: ' + js(def_lv) + ',', '  groups: [']
    lines += ['    ' + js(g) + (',' if i + 1 < len(allg) else '') for i, g in enumerate(allg)]
    lines += ['  ]', '};', '']
    open(os.path.join(data, 'imp.js'), 'w', encoding='utf8').write('\n'.join(lines))

    def size(f):
        return sum(len(g[f]) for g in allg)
    for lv in (1, 2, 0):
        gs = [g for g in allg if g['lv'] == lv]
        print('lv', lv, 'groups', len(gs), {f: sum(len(g[f]) for g in gs) for f in 'cotn'},
              'blocks', sum(len(v) for g in gs for v in g['s'].values()))
    print('total', {f: size(f) for f in 'cotn'}, 'defs tagged', len(def_lv))


if __name__ == '__main__':
    main(sys.argv[1])
