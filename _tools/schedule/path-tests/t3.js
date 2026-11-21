// T3: الصفحة الحقيقية (index.html وsync.js وapp.js من main) مع schedule.js المعدَّل في متصفح محاكى (jsdom):
// لصق الطريق من زر «لصق الجواب» القائم، ثم مهام اليوم، والتعليم والتراجع، وما يراه موقع المادة، والتقويم، والحفظ، والمسح
const fs=require('fs');const {JSDOM,VirtualConsole}=require('jsdom');const assert=require('assert');
const CODES=['law114','law117','law135','law136','law138'];
const FINAL={law117:'2026-12-13',law114:'2026-12-15',law135:'2026-12-19',law138:'2026-12-21',law136:'2026-12-23'};
const rd=f=>fs.readFileSync(__dirname+'/'+f,'utf8');
const NOW=process.argv[2]||'2026-11-21T14:30:00+03:00';const DAY=NOW.slice(0,10);
const html=rd('index.html').replace(/<script[^>]*src=[^>]*><\/script>/g,'').replace(/<link[^>]*>/g,'');
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push('jsdomError: '+(e.message||e)));vc.on('error',e=>errs.push('console.error: '+e));
const fixed=new Date(NOW).getTime();
// نسخة البيانات: بلا طريق، وبلا علامات مؤرخة بيوم التجربة أو بعده، لتبقى التجربة ثابتة مهما تقدّم صاحب الجدول
const exams=JSON.parse(rd('exams.json'));delete exams.path;
const passes=c=>{const r=JSON.parse(rd(c+'.passes.json'));Object.keys(r.marks||{}).forEach(k=>{if(k.split('|')[1]>=DAY)delete r.marks[k]});return JSON.stringify(r)};
const dom=new JSDOM(html,{url:'https://vua5l.github.io/term3/#today',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc,
  beforeParse(w){
    const R=w.Date;class D extends R{constructor(...a){if(a.length===0)super(fixed);else super(...a)}static now(){return fixed}}
    w.Date=D;w.fetch=()=>Promise.reject(new Error('offline'));w.scrollTo=()=>{};
    w.matchMedia=w.matchMedia||(()=>({matches:false,addEventListener(){},addListener(){},removeEventListener(){},removeListener(){}}));
    w.localStorage.setItem('term3_sched_cache__schedule/exams.json',JSON.stringify(exams));
    CODES.forEach(c=>{w.localStorage.setItem('term3_sched_lessons_'+c,rd(c+'.lessons.json'));w.localStorage.setItem('term3_sched_cache_'+c+'/_passes.json',passes(c))});
  }});
const w=dom.window,d=w.document;
w.addEventListener('error',e=>errs.push('window error: '+(e.error&&e.error.stack||e.message)));
['sync.js','schedule.js','app.js'].forEach(f=>{try{w.eval(rd(f))}catch(e){errs.push(f+': '+e.stack)}});
const tick=()=>new Promise(r=>setTimeout(r,30));
const click=el=>el.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
const go=async h=>{w.location.hash=h;await tick()};
const txt=el=>el?el.textContent.replace(/\s+/g,' ').trim():'';
const doneAll=s=>s.path.days.reduce((n,x)=>n+x.done,0);
(async()=>{
  await tick();const S=w.term3Schedule;let s=S.cached();
  assert.strictEqual(s.today,DAY);assert.notStrictEqual(s.source,'path');
  // 1) اللصق من الزر القائم في شاشة التعديل
  await go('#settings');click(d.querySelector('[data-act="pick-smart"]'));await tick();click(d.querySelector('[data-act="paste"]'));await tick();
  const ta=d.getElementById('paste-ta');assert.ok(ta,'لم يظهر صندوق اللصق');
  ta.value='هذا طريقك:\n'+rd('path.json')+'\nانتهى';click(d.querySelector('[data-act="apply"]'));await tick();
  s=S.cached();assert.strictEqual(s.source,'path','لم يُقبل الطريق من زر اللصق');
  s.exams.forEach(e=>{if(FINAL[e.code]){assert.strictEqual(e.date,FINAL[e.code]);assert.strictEqual(e.tentative,false)}});
  assert.strictEqual(d.querySelectorAll('#settings [data-act="confirm-date"]').length,0,'بقيت شريحة «مبدئي»');
  console.log('1) قُبل الطريق من زر اللصق، والمواعيد الخمسة صارت مواعيد النهائي. رسالة الصفحة: «'+txt(d.getElementById('toast'))+'»');
  // 2) شاشة اليوم تعرض مهام الحالة كلها، ودروس خانة اليوم في الطريق كلها بين مهام التعلّم
  await go('#today');const today=s.days[0];assert.strictEqual(today.date,DAY);
  const rows=()=>[...d.querySelectorAll('#groups [data-act="toggle"]')];
  assert.strictEqual(rows().length,today.tasks.filter(t=>t.kind!=='extra').length);
  assert.strictEqual(d.querySelectorAll('#groups .group:not(.extra) .task').length,today.tasks.length);
  const cell=s.path.days.find(x=>x.date===DAY);
  if(cell)cell.items.forEach(it=>it.lessons.forEach(l=>{if(!l.done)assert.ok(today.tasks.some(t=>t.kind==='learn'&&t.path&&t.code===it.code&&t.lesson===l.id),'درس من خانة اليوم ليس في مهامه: '+it.code+' '+l.id)}));
  console.log('2) مهام اليوم في الصفحة',d.querySelectorAll('#groups .group:not(.extra) .task').length,'=',JSON.stringify(today.tasks.reduce((a,t)=>{const k=t.code+' '+t.kind+(t.late?' متأخر':'');a[k]=(a[k]||0)+1;return a},{})));
  // 3) التعليم من الجدول يُحسب في الطريق، والتراجع يعيده
  const first=rows().find(r=>r.getAttribute('data-kind')==='learn'&&r.getAttribute('data-done')==='0');
  if(first){const code=first.getAttribute('data-code'),lesson=first.getAttribute('data-lesson'),before=doneAll(s);
    click(first);await tick();assert.strictEqual(doneAll(S.cached()),before+1,'العلامة لم تُحسب في الطريق');
    const again=rows().find(r=>r.getAttribute('data-code')===code&&r.getAttribute('data-lesson')===lesson);assert.strictEqual(again.getAttribute('data-done'),'1');
    click(again);await tick();assert.strictEqual(doneAll(S.cached()),before);
    console.log('3) تعليم',code,lesson,'حُسب في الطريق، والتراجع أعاده');
  }else console.log('3) لا مهمة تعلّم غير منجزة اليوم، فتُرك فحص التعليم');
  // 4) موقع المادة يرى مهام يومه نفسها
  s=S.cached();for(const c of CODES){const info=await S.load(c);const mine=((info.days||[]).find(x=>x.date===DAY)||{tasks:[]}).tasks.map(t=>t.lesson+':'+t.kind).sort().join(' ');
    const want=s.days[0].tasks.filter(t=>t.code===c).map(t=>t.lesson+':'+t.kind).sort().join(' ');assert.strictEqual(mine,want,'موقع '+c+' يرى غير ما في الجدول');}
  console.log('4) المواقع الخمسة ترى مهام يومها كما في الجدول');
  // 5) التقويم والتعديل يُرسمان، وتغيير السقف لا يمحو الطريق، والمحفوظ فيه الطريق
  await go('#calendar');assert.ok(d.getElementById('cal').innerHTML.length>0);
  await go('#settings');click(d.querySelector('[data-act="cap-plus"]'));await tick();click(d.querySelector('[data-act="cap-minus"]'));await tick();
  assert.strictEqual(S.cached().source,'path');
  const saved=Object.keys(w.localStorage).filter(k=>/exams\.json/.test(k)).map(k=>JSON.parse(w.localStorage.getItem(k))).sort((a,b)=>(b.savedAt||0)-(a.savedAt||0))[0];
  assert.ok(saved.path&&Object.keys(saved.path.subjects).length===5);
  console.log('5) التقويم والتعديل يُرسمان، والطريق محفوظ في ملف المواعيد بعد تغيير السقف');
  // 6) المسح يعيد الترتيب التلقائي والمواعيد باقية
  S.clearPath();await tick();s=S.cached();assert.notStrictEqual(s.source,'path');assert.strictEqual(s.path,null);
  s.exams.forEach(e=>{if(FINAL[e.code])assert.strictEqual(e.date,FINAL[e.code])});await go('#today');
  console.log('6) clearPath أعاد الترتيب التلقائي والمواعيد باقية');
  assert.strictEqual(errs.length,0,'أخطاء في الصفحة: '+errs.slice(0,3).join(' | '));
  console.log('T3 ok');w.close();
})().catch(e=>{console.error('T3 FAILED:',e.message,errs.slice(0,3));w.close();process.exit(1)});
