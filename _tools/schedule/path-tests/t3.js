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
const exams=JSON.parse(rd('exams.json'));delete exams.path;exams.savedAt=0; // وقت الحفظ الحقيقي قد يسبق ساعة التجربة فيغلب حفظها
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
  assert.strictEqual(txt(d.getElementById('toast')),'حُفظ الطريق','رسالة اللصق ليست «حُفظ الطريق»');
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
  // 7) المرحلة الثانية: نصوص الطريق، ووسم «متأخر»، والصفحات المعلّقة، ونقاط التقويم، ونافذة اليوم
  s=S.cached();
  assert.ok(/الخطة الحالية: الطريق المحفوظ/.test(txt(d.getElementById('settings'))),'سطر «الخطة الحالية: الطريق المحفوظ» غائب');
  assert.ok(d.querySelector('#settings [data-act="clear-path"]'),'زر «مسح الطريق» غائب');
  const listedTo=c=>{let n=0,hi=0;(s.lessons[c]||[]).forEach(l=>{const m=String(l.pages||'').match(/\d+/g);if(m){n++;hi=Math.max(hi,+m[m.length-1])}});return n?hi:0};
  const pendOf=it=>it.pending&&!(listedTo(it.code)&&it.pending[1]<=listedTo(it.code));
  const cellOf=x=>s.path.days.find(y=>y.date===x);
  const want=x=>{const set=new Set(((s.days.find(y=>y.date===x)||{tasks:[]}).tasks).map(t=>t.code));const c=cellOf(x);
    if(c)c.items.forEach(it=>{if(pendOf(it))set.add(it.code);if(x!==DAY&&it.lessons.some(l=>l.done))set.add(it.code)});return set};
  await go('#today');const td=s.days[0];
  assert.strictEqual([...d.querySelectorAll('#groups .chip')].filter(c=>txt(c)==='متأخر').length,td.tasks.filter(t=>t.late).length,'وسم «متأخر» لا يطابق المرحّل');
  const pc=cellOf(DAY);assert.strictEqual(d.querySelectorAll('#groups .pend').length,pc?pc.items.filter(pendOf).length:0,'سطر الصفحات المعلّقة لا يطابق اليوم');
  const homeTitles=[...d.querySelectorAll('#groups .group:not(.extra) .task .t-title')].map(txt);
  await go('#calendar');const last=Object.values(FINAL).sort().pop();
  const btn=x=>d.querySelector('#cal button[data-act="day"][data-date="'+x+'"]');
  const dotsN=x=>{const b=btn(x);return b?b.parentNode.querySelectorAll('.dots i').length:-1};
  let checked=0;
  for(let x=DAY;x<=last;x=new Date(Date.parse(x+'T12:00:00Z')+864e5).toISOString().slice(0,10)){
    if(!btn(x))continue;checked++;assert.strictEqual(dotsN(x),want(x).size,'نقاط '+x+' لا تطابق مواد يومه');}
  assert.ok(checked>0&&btn(DAY)&&btn(last),'أيام التقويم القادمة لا تُفتح');
  Object.values(FINAL).forEach(x=>{if(x>=DAY)assert.ok(btn(x),'يوم الاختبار '+x+' لا يُفتح')});
  assert.ok([...d.querySelectorAll('#cal button[data-act="day"]')].every(b=>b.getAttribute('data-date')>=DAY&&b.getAttribute('data-date')<=last),'يوم ماضٍ أو بعد آخر اختبار يُفتح');
  assert.ok([...d.querySelectorAll('#cal .cell.past')].every(c=>!c.parentNode.querySelector('.dots i')),'يوم ماضٍ تحته نقاط');
  const top=s.days.find(x=>x.date>DAY&&!cellOf(x.date)&&x.tasks.length);
  if(top){const cnt={};top.tasks.forEach(t=>cnt[t.code]=(cnt[t.code]||0)+1);const best=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0];
    const key=s.exams.find(e=>e.code===best).key;const firstDot=btn(top.date).parentNode.querySelector('.dots i');
    if(Object.values(cnt).filter(v=>v===cnt[best]).length===1)assert.ok(firstDot.getAttribute('style').indexOf('--dot-'+key)>=0,'أول نقطة ليست الأكثر مهاماً في '+top.date);}
  const sheet=d.getElementById('sheet'),rowsIn=()=>[...sheet.querySelectorAll('.group .task')];
  // اليوم: النافذة تعرض مهام الرئيسية نفسها بترتيبها
  click(btn(DAY));await tick();assert.strictEqual(sheet.hidden,false,'لم تُفتح النافذة');
  assert.ok(/اليوم ·/.test(txt(sheet.querySelector('.ss'))));
  assert.deepStrictEqual([...sheet.querySelectorAll('.group:not(.extra) .task .t-title')].map(txt),homeTitles,'نافذة اليوم غير مهام الرئيسية');
  click(d.getElementById('scrim'));await tick();assert.strictEqual(sheet.hidden,true,'لم تُغلق النافذة بالضغط خارجها');
  // يوم آتٍ: خانة الإنجاز للتعلّم وحده، ولا «التالي»، والتعليم قبل اليوم يبقى في يومه منجزاً
  const fut=s.days.find(x=>x.date>DAY&&x.tasks.some(t=>t.path));
  if(fut){click(btn(fut.date));await tick();const n0=rowsIn().length;assert.strictEqual(n0,fut.tasks.length,'مهام النافذة لا تطابق مهام '+fut.date);
    const withBox=rowsIn().filter(r=>r.querySelector('button.check'));
    assert.strictEqual(withBox.length,fut.tasks.filter(t=>t.kind==='learn').length,'خانة الإنجاز في الأيام الآتية لغير التعلّم');
    assert.ok(withBox.every(r=>r.querySelector('button.check').getAttribute('data-kind')==='learn'));
    assert.strictEqual(rowsIn().filter(r=>r.querySelector('.task-gap')).length,fut.tasks.filter(t=>t.kind!=='learn').length);
    assert.strictEqual(sheet.querySelectorAll('.next-chip').length,0);
    // دروس الطريق في اليوم ثابتة، أما التسميع فيرتّبه الجدول بما اتسع له اليوم، فقد يزيد إن خفّ اليوم بتعليم درس قبله
    const pathRows=()=>sheet.querySelectorAll('button.check[data-path="1"]').length,p0=pathRows();
    const b=sheet.querySelector('button.check[data-path="1"]'),code=b.getAttribute('data-code'),lesson=b.getAttribute('data-lesson'),todayN=S.cached().days[0].tasks.length,before=doneAll(S.cached());
    click(b);await tick();const r1=sheet.querySelector('button.check[data-lesson="'+lesson+'"][data-code="'+code+'"]');
    assert.strictEqual(pathRows(),p0,'تغيّر عدد دروس الطريق في اليوم الآتي بعد التعليم');assert.strictEqual(r1.getAttribute('data-done'),'1');assert.strictEqual(r1.getAttribute('data-date'),DAY);
    assert.strictEqual(doneAll(S.cached()),before+1);assert.strictEqual(S.cached().days[0].tasks.length,todayN,'تغيّرت مهام اليوم بتعليم درس آتٍ');
    assert.strictEqual(dotsN(fut.date),want(fut.date).size);
    click(r1);await tick();assert.strictEqual(doneAll(S.cached()),before,'التراجع لم يُعِد الدرس');assert.strictEqual(pathRows(),p0);
    click(sheet.querySelector('[data-act="sheet-close"]'));await tick();assert.strictEqual(sheet.hidden,true);
    console.log('7) يوم آتٍ ('+fut.date+'): '+n0+' مهمة، التعليم قبل يومه بقي فيه منجزاً والتراجع أعاده');}
  // يوم اختبار: يُفتح بمهام يومه
  const ex=Object.values(FINAL).sort().find(x=>x>=DAY);if(ex){click(btn(ex));await tick();
  assert.strictEqual(rowsIn().length,(s.days.find(x=>x.date===ex)||{tasks:[]}).tasks.length,'نافذة يوم الاختبار');}
  await go('#today');assert.strictEqual(sheet.hidden,true,'بقيت النافذة بعد ترك التقويم');
  console.log('7) نقاط '+checked+' يوماً تطابق مواد أيامها، ووسم «متأخر» '+td.tasks.filter(t=>t.late).length+'، والمعلّق اليوم '+(pc?pc.items.filter(pendOf).length:0)+'، ونافذة اليوم مطابقة للرئيسية');
  // مادة يخالف موعدها موعد الطريق: تُبيَّن في التعديل بسببها
  const ex0=S.cached().exams.map(e=>Object.assign({},e)),moved=ex0.find(e=>e.code==='law138');moved.date='2026-12-22';S.saveExams(ex0);await go('#settings');
  assert.ok(/القانون الإداري: خارج الطريق، لأن موعدها/.test(txt(d.getElementById('settings'))),'لم تُبيَّن المادة الخارجة من الطريق');
  moved.date=FINAL.law138;S.saveExams(ex0);await tick();assert.ok(S.cached().path.subjects.law138.valid);
  console.log('7) المادة التي خالف موعدها الطريق بُيّنت في التعديل، وعادت بعودة موعدها');
  // 6) المسح بضغطتين من التعديل يعيد الترتيب التلقائي والمواعيد باقية
  await go('#settings');click(d.querySelector('[data-act="clear-path"]'));await tick();assert.strictEqual(S.cached().source,'path','مُسح الطريق بضغطة واحدة');
  click(d.querySelector('[data-act="clear-path"]'));await tick();s=S.cached();assert.notStrictEqual(s.source,'path');assert.strictEqual(s.path,null);
  assert.ok(/^مُسح الطريق/.test(txt(d.getElementById('toast'))));
  s.exams.forEach(e=>{if(FINAL[e.code])assert.strictEqual(e.date,FINAL[e.code])});await go('#today');
  console.log('6) «مسح الطريق» بضغطتين أعاد الترتيب التلقائي والمواعيد باقية');
  assert.strictEqual(errs.length,0,'أخطاء في الصفحة: '+errs.slice(0,3).join(' | '));
  console.log('T3 ok');w.close();
})().catch(e=>{console.error('T3 FAILED:',e.message,errs.slice(0,3));w.close();process.exit(1)});
