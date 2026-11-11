#!/usr/bin/env node
/* بوابة الدفعة بأمر واحد: الفحوص كلها بالترتيب، ثم النشر إن طُلب. تطبع أسطراً قليلة، وتكتب التفاصيل في ملف يُقرأ عند الحاجة.
   الاستعمال: node _tools/common/gate.js <رمز المادة> [--lessons A-B] [--pages مجلد العمل] [--full] [--no-browser] [--check]
                                         [--publish "وصف عربي في سطر"] [--trailer "سطر يُلحق برسالة الرفع"]...
     --lessons A-B   دروس الدفعة التي يمرّ عليها فحص المتصفح (والأصل كل الدروس المبنية).
     --pages         مجلد العمل (ما كتبته pages.js): يُقابَل كل نص منقول بقراءات صفحته الآلية حيث جُهّزت صفحته، كشفاً أولياً لا حكماً.
     --full          فحص التشغيل الكامل: يزيد محاكاة الجهازين (لموقع جديد أو شيفرة تغيّرت).
     --no-browser    بلا فحص المتصفح (يُذكر في النتيجة أنه لم يُجرَ).
     --check         لا يكتب ملفي الدروس والتعريفات، بل يتحقق أنهما مطابقان.
     --publish       إن نجح كل شيء: يرفع ملفات مجلد الموقع ومجلد أدوات المادة المعدّلة وحدها إلى main، ثم ينتظر بناء الموقع.
   الفحوص: 1 ملفات الفصول · 2 التنبيهات الثلاثة · 3 النطاق والإعدادات · 4 خانة التعريفات · 5 ملف الدروس · 6 المتصفح · 7 النشر. */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const cp = require('child_process');
const lib = require('./lib');
const notes = require('./warnings');
const { validateFile } = require('./validate');
const { buildLessons } = require('./make-lessons');
const { buildDefs, body } = require('./make-defs');
const { checkDefs } = require('./defs-check');

const { rest, flags } = lib.args(process.argv.slice(2), { lessons: 1, pages: 1, full: 0, 'no-browser': 0, check: 0, publish: 1, trailer: 'many' });
if (!rest[0]) lib.die('usage: node gate.js <subject> [--lessons A-B] [--pages work-dir] [--full] [--no-browser] [--check] [--publish "msg"] [--trailer "line"]...');
const S = lib.loadSubject(rest[0]);
const rel = (f) => path.relative(S.repo, f);
const out = [], detail = [];
let failed = 0, unconfirmed = false;
const skipped = [];
function step(name, state, text) { if (state === 'FAIL') failed++; if (state === 'SKIP') skipped.push(name); out.push(' ' + name.padEnd(9) + ' ' + state.padEnd(4) + ' ' + text); }
function finish() {
  const file = path.join(os.tmpdir(), 'gate-' + S.code + '.txt');
  fs.writeFileSync(file, detail.join('\n') + '\n');
  console.log('GATE ' + S.code + ' ' + S.name);
  console.log(out.join('\n'));
  console.log('RESULT: ' + (failed ? 'FAILED (' + failed + ' step(s))' : 'PASSED' + (skipped.length ? ' — NOT RUN: ' + skipped.join(', ') : '') + (unconfirmed ? ' — PUSHED, BUT THE SITE BUILD IS NOT CONFIRMED YET' : '')) + ' · details: ' + file);
  process.exit(failed ? 1 : 0);
}
const sh = (cmd, args, opt) => cp.spawnSync(cmd, args, Object.assign({ cwd: S.repo, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }, opt || {}));

/* مجلد العمل: صور الصفحات وقراءاتها الآلية */
const workDir = flags.pages ? path.resolve(flags.pages) : null;
if (workDir && !fs.existsSync(workDir)) lib.die('--pages: not found: ' + flags.pages);

let site;
try { site = lib.loadSite(S, ['defs.js']); } catch (e) { step('load', 'FAIL', e.message); finish(); }

/* 1) ملفات الفصول */
{
  let nE = 0, nW = 0, pend = 0, built = 0;
  const per = [];
  site.cfg.chapters.forEach((id) => {
    const r = validateFile(S, path.join(S.siteDir, 'data', id + '.js'), { work: workDir, quiet: true, noNotes: true });
    detail.push('## validate ' + id, r.fatal || r.lines.join('\n'), '');
    if (r.fatal) { nE++; per.push(id + ' cannot load'); return; }
    nE += r.errors.length; nW += r.warns.length;
    if (r.errors.length || r.warns.length) per.push(id + (r.errors.length ? ' ' + r.errors.length + ' errors' : '') + (r.warns.length ? ' ' + r.warns.length + ' warnings' : ''));
  });
  site.chapters.forEach((c) => (c.lessons || []).forEach((l) => { if (l.pending === true) pend++; else built++; }));
  const extra = fs.readdirSync(path.join(S.siteDir, 'data')).filter((f) => /^c\d+[a-z]?\.js$/.test(f) && !site.cfg.chapters.includes(f.replace(/\.js$/, '')));
  step('validate', nE ? 'FAIL' : 'OK', site.cfg.chapters.length + ' chapter files · lessons built ' + built + ', pending ' + pend + ' · errors ' + nE + ', warnings ' + nW +
    (workDir ? ' · verbatim texts matched against the machine readings where their pages are prepared' : ' · no pages given (verbatim texts not matched)') + (per.length ? ' · ' + per.join('; ') : '') +
    (extra.length ? ' · data files not in config.js: ' + extra.join(', ') : ''));
}

/* 2) التنبيهات الثلاثة، على الموقع كله */
{
  const C = S.checks, parts = [];
  detail.push('## notes (site-wide)');
  if (C.similar) { const r = notes.similar(notes.questionsOf(site.chapters, true), C.similar, 80); parts.push('similar question pairs ' + r.pairs.length + (r.pairs.length ? ' (' + r.pairs.filter((p) => p.same).length + ' in the same lesson)' : '')); r.lines.forEach((l) => detail.push(l)); }
  if (C.longest) { const r = notes.longest(site.chapters, C.longest); parts.push('mcq correct-is-longest ' + r.any + '/' + r.n + (r.n ? ' (' + Math.round(100 * r.any / r.n) + '%)' : '') + ', clearly ' + r.clear.length); r.lines.forEach((l) => detail.push(l)); }
  if (C.dupDefs) {
    const list = C.defs === 'manual' ? ((site.defs && site.defs.items) || []).map((it) => ({ term: it.term, text: (it.parts || []).join(' '), where: it.id })) : notes.defsOf(S, site.chapters);
    const r = notes.dupDefs(list); parts.push('repeated definitions ' + r.lines.length + ' of ' + list.length); r.lines.forEach((l) => detail.push(l));
  }
  detail.push('');
  step('notes', parts.length ? 'OK' : 'SKIP', parts.length ? parts.join(' · ') + ' (to review, not errors)' : 'the three notes are switched off for this subject');
}

/* 3) النطاق والإعدادات */
{
  const errs = [];
  if (site.cfg.code !== S.code) errs.push('config.js code "' + site.cfg.code + '" != subject code "' + S.code + '"');
  if (site.cfg.pdfOffset !== undefined && site.cfg.pdfOffset !== S.book.pdfOffset) errs.push('pdfOffset differs: config.js ' + site.cfg.pdfOffset + ', subject file ' + S.book.pdfOffset);
  const sc = lib.span(site.cfg.scope);
  if (!sc) errs.push('config.js scope is not a page range');
  else site.chapters.forEach((c) => { const x = lib.span(c.pages); if (!x || x[0] < sc[0] || x[1] > sc[1]) errs.push('chapter ' + c.id + ' pages ' + c.pages + ' outside the site scope ' + site.cfg.scope); });
  const html = fs.readFileSync(path.join(S.siteDir, 'index.html'), 'utf8');
  if (fs.existsSync(path.join(S.siteDir, 'data', 'defs.js')) && html.indexOf('src="data/defs.js"') < 0) errs.push('index.html does not load data/defs.js');
  errs.forEach((e) => detail.push('scope: ' + e));
  step('scope', errs.length ? 'FAIL' : 'OK', errs.length ? errs.join('; ') : 'pages inside ' + site.cfg.scope + ' · config.js agrees with the subject file');
}

/* 4) خانة التعريفات */
{
  const hasDefs = fs.existsSync(path.join(S.siteDir, 'data', 'defs.js'));
  try {
    let note = 'kept by hand';
    if (S.checks.defs !== 'manual') {
      const r = buildDefs(S, site);
      const cur = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '');
      const same = body(cur(r.files.defs)) === body(r.defsText) && cur(r.files.ids) === r.idsText;
      if (!same && flags.check) throw new Error('defs.js or defs-ids.json is not up to date with the chapter files');
      if (!same) { fs.writeFileSync(r.files.ids, r.idsText); fs.writeFileSync(r.files.defs, r.defsText); }
      note = same ? 'up to date' : 'regenerated';
    }
    if (S.checks.defs === 'manual' && !hasDefs) step('defs', 'SKIP', 'no defs.js in this site');
    else {
      const c = checkDefs(S);
      detail.push('## defs-check', c.lines.join('\n'), '');
      step('defs', c.errors.length ? 'FAIL' : 'OK', c.items + ' definitions, ' + c.fams + ' families · ' + note + (c.errors.length ? ' · ' + c.errors.length + ' errors' : ''));
    }
  } catch (e) { detail.push('defs: ' + e.message); step('defs', 'FAIL', e.message); }
}

/* 5) ملف الدروس */
let firstBuilt = null, lastBuilt = null;
try {
  const r = buildLessons(S);
  const cur = fs.existsSync(r.target) ? fs.readFileSync(r.target, 'utf8') : '';
  if (cur !== r.text && flags.check) throw new Error('lessons.json is not up to date with the chapter files');
  if (cur !== r.text) fs.writeFileSync(r.target, r.text);
  site.chapters.forEach((c) => (c.lessons || []).forEach((l) => { if (l.pending === true) return; const n = +String(l.id).slice(1); if (firstBuilt === null || n < firstBuilt) firstBuilt = n; if (lastBuilt === null || n > lastBuilt) lastBuilt = n; }));
  step('lessons', 'OK', r.rows.length + ' lessons, ' + r.rows.reduce((s, x) => s + x.minutes, 0) + ' minutes · lessons.json ' + (cur === r.text ? 'up to date' : 'regenerated'));
} catch (e) { detail.push('lessons: ' + e.message); step('lessons', 'FAIL', e.message); }

/* 6) المتصفح: المرور على الشاشات، ثم فحص التشغيل، ثم محاكاة الجهازين إن طُلب الفحص الكامل */
if (flags['no-browser']) step('browser', 'SKIP', 'asked not to run (--no-browser)');
else if (firstBuilt === null) step('browser', 'SKIP', 'no built lesson yet');
else {
  let a = firstBuilt, b = lastBuilt;
  if (flags.lessons) { const m = /^(\d+)-(\d+)$/.exec(flags.lessons); if (!m) lib.die('--lessons A-B'); a = +m[1]; b = +m[2]; }
  const res = [];
  let bad = false;
  const sm = sh('node', [path.join(lib.TOOLS, 'smoke.js'), S.code, String(a), String(b)], { timeout: 600000 });
  detail.push('## smoke l' + a + '–l' + b, (sm.stdout || '') + (sm.stderr || ''), '');
  if (sm.status === 0) res.push('screens OK (l' + a + '–l' + b + ', light and dark)');
  else if (/Cannot find module 'playwright'|Executable doesn't exist|browserType\.launch/.test((sm.stderr || '') + (sm.stdout || ''))) res.push('screens NOT RUN (no browser here)');
  else { bad = true; res.push('screens FAILED'); }
  if (!bad && !/NOT RUN/.test(res[0])) {
    /* خادم محلي لفحص التشغيل */
    const port = 8100 + Math.floor(Math.random() * 800);
    const srv = cp.spawn('python3', ['-I', '-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: S.repo, stdio: 'ignore' });
    cp.spawnSync('sleep', ['1.5']);
    const rc = sh('python3', ['-I', path.join(lib.TOOLS, 'runcheck.py'), S.site, String(port), String(a)], { timeout: 300000, env: Object.assign({}, process.env, { TERM_ROOT: S.repo, PYTHONDONTWRITEBYTECODE: '1' }) });
    srv.kill();
    detail.push('## runcheck l' + a, (rc.stdout || '') + (rc.stderr || ''), '');
    if (/RUN-CHECK OK/.test(rc.stdout || '')) res.push('run check OK (l' + a + ': answers saved, kept after reload, schedule signals sent)');
    else if (/No module named 'playwright'|ModuleNotFoundError/.test(rc.stderr || '')) res.push('run check NOT RUN (python playwright missing)');
    else { bad = true; res.push('run check FAILED'); }
    if (flags.full) {
      const td = sh('node', [path.join(lib.TOOLS, 'two-devices.js'), S.code], { timeout: 120000 });
      detail.push('## two-devices', (td.stdout || '') + (td.stderr || ''), '');
      if (td.status === 0) res.push('two devices OK'); else { bad = true; res.push('two devices FAILED'); }
    }
  }
  step('browser', bad ? 'FAIL' : res.some((r) => /NOT RUN/.test(r)) ? 'SKIP' : 'OK', res.join(' · '));
}

/* 7) النشر */
if (flags.publish !== undefined) {
  const msg = String(flags.publish || '').trim();
  const git = (...a) => sh('git', a);
  const must = (r, what) => { if (r.status !== 0) throw new Error(what + ': ' + ((r.stderr || r.stdout || '').trim().split('\n').slice(-2).join(' | '))); return (r.stdout || '').trim(); };
  try {
    if (failed) throw new Error('not published: a check failed');
    if (!msg || /\n/.test(msg) || !/[ء-ي]/.test(msg)) throw new Error('--publish needs a one-line Arabic description');
    if (must(git('rev-parse', '--abbrev-ref', 'HEAD'), 'git') !== 'main') throw new Error('not on main');
    const roots = [S.site + '/', '_tools/' + S.code + '/'];
    const st = git('-c', 'core.quotepath=off', 'status', '--porcelain', '--untracked-files=all');
    must(st, 'git status');
    /* سطر الحال: حرفان ثم مسافة ثم المسار. لا يُقصّ أول السطر، فحرفه الأول قد يكون مسافة */
    const changed = (st.stdout || '').split('\n').filter((l) => l.length > 3).map((l) => l.slice(3).split(' -> ').pop().replace(/^"|"$/g, ''));
    const mine = changed.filter((f) => roots.some((r) => f.startsWith(r)));
    const others = changed.filter((f) => !mine.includes(f));
    if (!mine.length) throw new Error('nothing to publish: no changed file under ' + roots.join(' or '));
    must(git.apply(null, ['add', '--'].concat(mine)), 'git add');
    const full = msg + ((flags.trailer || []).length ? '\n\n' + flags.trailer.join('\n') : '');
    must(git('commit', '-q', '-m', full), 'git commit');
    must(git('fetch', '-q', 'origin', 'main'), 'git fetch');
    if (must(git('rev-list', '--count', 'HEAD..origin/main'), 'git') !== '0') must(git('rebase', '-q', 'origin/main'), 'git rebase');
    must(git('push', '-q', 'origin', 'HEAD:main'), 'git push');
    const sha = must(git('rev-parse', 'HEAD'), 'git');
    /* بناء الموقع ونشره: يُنتظر حتى ينتهي */
    let build = 'unknown (check the commit on GitHub)';
    const m = /github\.com[:/]([^/]+)\/([^/.]+)/.exec(must(git('remote', 'get-url', 'origin'), 'git'));
    if (m) {
      for (let i = 0; i < 30; i++) {
        const r = sh('gh', ['api', 'repos/' + m[1] + '/' + m[2] + '/actions/runs?head_sha=' + sha + '&per_page=10', '--jq', '.workflow_runs[] | select(.name | test("pages"; "i")) | .status + " " + (.conclusion // "")']);
        if (r.status !== 0) break;
        const line = (r.stdout || '').trim().split('\n')[0] || '';
        if (/^completed/.test(line)) { build = line.replace('completed ', ''); break; }
        cp.spawnSync('sleep', ['8']);
        build = line ? line.trim() + ' (still running after the wait)' : 'not started yet after the wait';
      }
    }
    detail.push('## publish', 'commit ' + sha, 'files:\n' + mine.join('\n'), others.length ? 'changed but NOT included (outside the subject folders):\n' + others.join('\n') : '', 'pages build: ' + build, '');
    if (m && !/^(success|failure|cancelled|timed_out)/.test(build)) unconfirmed = true;   /* رُفع، ولم يُعرف بعد هل بُني الموقع */
    step('publish', /^(failure|cancelled|timed_out)/.test(build) ? 'FAIL' : 'OK', 'pushed ' + mine.length + ' file(s) as ' + sha.slice(0, 7) + ' · site build: ' + build + (others.length ? ' · ' + others.length + ' other changed file(s) left out' : ''));
  } catch (e) { detail.push('publish: ' + e.message); step('publish', 'FAIL', e.message); }
}
finish();
