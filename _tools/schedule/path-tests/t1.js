// T1: مشاهد الطريق على بيانات المستودع: اللصق، واليوم، والترحيل، والعلامات، والمعلّق، وأيام الاختبارات، والموعد المخالف، والحفظ والمسح، ورفض المعيب
const {boot,base,withFinals,wipe,mark,dayLine,finalSites,J,CODES,NAME,FINAL}=require('./t.js');const assert=require('assert');const fs=require('fs');
const PATH=fs.readFileSync(__dirname+'/path.json','utf8');
function paste(S){const r=S.parseSmart('هذا طريقك:\n'+PATH+'\nانتهى',S.cached());assert.ok(r.ok,JSON.stringify(r.errors));S.applySmart(r.plan);return S.cached()}
function setup(now,mod){const o=base();o.now=now;if(mod)mod(o);const b=boot('schedule.js',o);return b}
const T=1795300000000; // وقت علامات التجربة (بعد كل العلامات الحقيقية)
const pathDays=s=>s.days.filter(d=>d.date<='2026-12-11');

// A) الحال الحقيقية اليوم: الدستوري ممسوح، والدولي لم يُمسح بعد
let b=setup('2026-11-21T13:30:00+03:00');let s=paste(b.S);
assert.strictEqual(s.source,'path');s.exams.forEach(e=>{assert.strictEqual(e.date,FINAL[e.code]);assert.strictEqual(e.tentative,false)});
console.log('A) اليوم (الدولي غير ممسوح):',dayLine(s.days[0]));
console.log('   مواد الطريق:',Object.keys(s.path.subjects).map(c=>NAME[c]+' '+(s.path.subjects[c].valid?'✓':'✗'+s.path.subjects[c].why)+' '+s.path.subjects[c].done+'/'+s.path.subjects[c].total).join(' | '),'| إن بقي وقت:',s.extra?NAME[s.extra.code]+' '+s.extra.lesson+' '+s.extra.kind:'-');

// B) بعد مسح الدولي أيضاً: يجب أن تطابق أيام الطريق التوزيع المحسوب
b=setup('2026-11-21T13:30:00+03:00',o=>{o.marks.law135=wipe(o.marks.law135,T)});s=paste(b.S);
console.log('B) بعد مسح الدولي، أيام الطريق كلها:');pathDays(s).forEach(d=>console.log('   '+dayLine(d)));
console.log('   معلّق (صفحات بلا دروس منشورة):',s.path.days.filter(d=>d.pending).map(d=>d.date.slice(5)+':'+d.items.filter(i=>i.pending).map(i=>NAME[i.code]+' ص'+i.pending.join('–')).join('،')).join(' | '));
console.log('   تنبيهات:',JSON.stringify(s.warnings.map(w=>w.type+(w.code?':'+NAME[w.code]:'')+(w.date?'@'+w.date.slice(5):''))));
const expB=s;

// C) فات يومان بلا علامات: الترحيل إلى اليوم
b=setup('2026-11-23T10:00:00+03:00',o=>{o.marks.law135=wipe(o.marks.law135,T);o.exams=withFinals(o.exams);o.exams.path=JSON.parse(PATH).path});s=b.S.cached();
console.log('C) 23 نوفمبر بلا علامات:',dayLine(s.days[0]),'| متأخر:',s.path.late,'| الغد:',dayLine(s.days[1]));
assert.strictEqual(s.days[1].tasks.filter(t=>t.late).length,0);

// D) علامات: دروس أُنجزت أمس، ودرس اليوم، ودرس سُبق إليه
b=setup('2026-11-22T16:00:00+03:00',o=>{let m=wipe(o.marks.law135,T);['l1','l2','l3','l4','l5'].forEach(id=>m=mark(m,id,'2026-11-21',Date.parse('2026-11-21T16:00:00+03:00')));m=mark(m,'l6','2026-11-22',Date.parse('2026-11-22T15:00:00+03:00'));m=mark(m,'l12','2026-11-22',Date.parse('2026-11-22T15:30:00+03:00'));o.marks.law135=m;o.exams=withFinals(o.exams);o.exams.path=JSON.parse(PATH).path});s=b.S.cached();
const dT=s.days[0].tasks.filter(t=>t.code==='law135'&&t.kind==='learn');
console.log('D) 22 نوفمبر:',dT.map(t=>t.lesson+(t.done?'✓':'')+(t.late?'(متأخر)':'')).join(' '),'| الدولي غداً:',s.days[1].tasks.filter(t=>t.code==='law135'&&t.kind==='learn').map(t=>t.lesson).join(' '));
assert.strictEqual(dT.map(t=>t.lesson).join(' '),'l6 l7 l8 l9');assert.ok(dT[0].done&&!dT[1].done);
assert.ok(!s.days[1].tasks.some(t=>t.lesson==='l12'&&t.code==='law135'));
const d21=s.path.days.find(d=>d.date==='2026-11-21');console.log('   خانة 21 نوفمبر في التقويم:',d21.items.map(i=>NAME[i.code]+' '+i.done+'/'+i.total).join('، '),'| تامّ:',d21.complete);

// E) نشر دروس جديد الدولي والإداري والأسرة وموقع نهائي الالتزام: يختفي المعلّق وتظهر المهام من نفسها
b=setup('2026-11-21T13:30:00+03:00',o=>{o.marks.law135=wipe(o.marks.law135,T);o.marks.law136=wipe(o.marks.law136,T);finalSites(o)});s=paste(b.S);
console.log('E) بعد نشر الدروس: معلّق =',s.path.days.filter(d=>d.pending).length,'| دروس كل مادة في الطريق:',Object.keys(s.path.subjects).map(c=>NAME[c]+' '+s.path.subjects[c].total).join('، '));
['2026-11-29','2026-12-05','2026-12-07','2026-12-09','2026-12-11'].forEach(x=>console.log('   '+dayLine(s.days.find(d=>d.date===x))));
assert.strictEqual(s.path.days.filter(d=>d.pending).length,0);
const un=s.warnings.filter(w=>w.type==='short').map(w=>NAME[w.code]+' بلا تعلّم '+w.unlearned);console.log('   دروس بلا تعلّم قبل اختبارها:',un.join('، '));
s.warnings.filter(w=>w.type==='short').forEach(w=>assert.strictEqual(w.unlearned,0));

// G) أيام الاختبارات: يعود التلقائي بمهامه
b=setup('2026-12-13T15:00:00+03:00',o=>{o.marks.law135=wipe(o.marks.law135,T);o.exams=withFinals(o.exams);o.exams.path=JSON.parse(PATH).path});s=b.S.cached();
console.log('G) 13 ديسمبر (بلا علامات):',s.source,'|',s.days[0].tasks.length,'مهمة، أنواعها:',JSON.stringify(s.days[0].tasks.reduce((a,t)=>{a[t.kind+(t.late?'-late':'')]=(a[t.kind+(t.late?'-late':'')]||0)+1;return a},{})));

// H) موعد مادة يخالف الطريق: تُترك للتلقائي وحدها
b=setup('2026-11-21T13:30:00+03:00',o=>{o.exams=withFinals(o.exams);o.exams.exams.find(e=>e.code==='law136').date='2026-12-24';o.exams.path=JSON.parse(PATH).path});s=b.S.cached();
console.log('H) موعد الدستوري مخالف:',s.source,'| الدستوري:',s.path.subjects.law136.valid,s.path.subjects.law136.why,'| مهامه اليوم بلا وسم طريق:',s.days[0].tasks.filter(t=>t.code==='law136').every(t=>!t.path));

// I/K) الحفظ يبقي الطريق، والمسح يعيد التلقائي
b=setup('2026-11-21T13:30:00+03:00');s=paste(b.S);b.S.saveExams(null,{cap:9});s=b.S.cached();assert.strictEqual(s.source,'path');assert.strictEqual(s.cap,9);
b.S.clearPath();s=b.S.cached();assert.strictEqual(s.source,'auto');assert.strictEqual(s.path,null);assert.strictEqual(s.exams.find(e=>e.code==='law135').date,'2026-12-19');
console.log('I/K) الطريق يبقى مع تغيير السقف، ويُمسح بـ clearPath فيعود التلقائي والمواعيد باقية: ok');

// J) رفض الطريق المعيب، وبقاء لصق الخطة الذكية القديمة
b=setup('2026-11-21T13:30:00+03:00');const bad=JSON.parse(PATH);bad.path.subjects.law135.days[1][1]=100;bad.path.subjects.lawX={from:1,days:[['2026-11-22',5]]};bad.path.exams.lawX='2026-12-01';bad.path.subjects.law117.days[0][0]='2026-12-13';
let r=b.S.parseSmart(JSON.stringify(bad),b.S.cached());console.log('J) أخطاء الطريق المعيب:',r.ok,JSON.stringify(r.errors));assert.ok(!r.ok&&r.errors.length===4);
r=b.S.parseSmart('لا شيء هنا',b.S.cached());assert.ok(!r.ok);r=b.S.parsePath('{"days":[]}',b.S.cached());assert.ok(!r.found);
console.log('كل التجارب نجحت');
