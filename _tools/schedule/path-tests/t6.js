// T6: أجزاء الطريق الإضافية (more): صفحات خارج ترتيب الجزء الأصلي بأيام ثابتة، كدروس الفصلي الأول في الدولي (ص 7–97).
// بلا more يطابق الناتج النسخة السابقة حرفياً (schedule.prev.js)، والنسخة السابقة تتجاهل more بلا خطأ. ومع more: كل درس في
// يومه مهمةَ طريق ولا يضعه الترتيب التلقائي في غيره، ولا يزيد يوم على ثلاث مواد، والترحيل والإنجاز قبل اليوم كبقية الطريق
const {boot,base,withFinals,wipe,finalSites,J}=require('./t.js');const assert=require('assert');const fs=require('fs');
const P0=JSON.parse(fs.readFileSync(__dirname+'/path.json','utf8')).path,copy=x=>JSON.parse(JSON.stringify(x)),str=x=>JSON.stringify(x);
const MORE=[{from:7,days:[['2026-12-04',30],['2026-12-05',37]]},{from:83,days:[['2026-12-05',97]]},{from:38,days:[['2026-12-06',53],['2026-12-07',81]]}];
const withMore=(p,m)=>{const q=copy(p);q.subjects.law135.more=m||MORE;return q};
const iso=d=>d.toISOString().slice(0,10),T0=1795300000000;
const fresh=()=>{const o=base();o.marks.law135=wipe(o.marks.law135,T0);o.marks.law136=wipe(o.marks.law136,T0);finalSites(o);o.exams=withFinals(o.exams);return o};
// سير يوم بيوم من 21 نوفمبر إلى آخر اختبار: each تفحص حالة اليوم، ثم تُنجز مهام تعلّمه إلا في أيام skip
function walk(file,pth,skip,each){const o=fresh();o.exams.path=pth;
  for(let d=new Date('2026-11-21T00:00:00Z');iso(d)<'2026-12-23';d.setUTCDate(d.getUTCDate()+1)){
    const day=iso(d);o.now=day+'T14:00:00+03:00';const s=boot(file,o).S.cached();each(s,day,o);
    if(skip.indexOf(day)>=0)continue;
    (s.days[0]&&s.days[0].date===day?s.days[0].tasks:[]).filter(t=>t.kind==='learn').forEach(t=>{o.marks[t.code].marks[t.lesson+'|'+day]={on:1,t:Date.parse(day+'T15:00:00+03:00'),k:'learn'}});
  }}
const snap=(file,pth)=>{const out=[];walk(file,pth,['2026-11-24','2026-12-02'],s=>out.push(str(s)));return out};
const same=(a,b,msg)=>{assert.strictEqual(a.length,b.length);a.forEach((x,i)=>assert.ok(x===b[i],msg+' (اليوم '+i+')'))};

// أ) بلا more: الناتج كله يطابق النسخة السابقة، بطريق 21 نوفمبر وبالمحفوظ في ملف المواعيد بعد نزع more منه
const saved=J('exams.json').path,plain=[P0];
if(saved){const q=copy(saved);Object.keys(q.subjects).forEach(c=>{delete q.subjects[c].more});plain.push(q)}
plain.forEach((p,i)=>same(snap('schedule.js',p),snap('schedule.prev.js',p),'بلا more اختلف الناتج عن النسخة السابقة، الطريق '+i));
// ب) النسخة السابقة تتجاهل more: ناتجها به كناتجها بدونه (جهاز لم يصله التحديث بعد)
same(snap('schedule.prev.js',withMore(P0)),snap('schedule.prev.js',P0),'النسخة السابقة تأثرت بـ more');

// ج) مع more: دروس ص 7–97 في أيامها مهامَّ طريق، وأيامها لا تتغير من يوم إلى يوم، ولا يزيد يوم على ثلاث مواد.
//    وخانات المادة تُفحص حتى يوم اختبارها، فبعده تخرج من الطريق كله
const L=fresh().lessons.law135.lessons,endOf=id=>{const l=L.find(x=>x.id===id),g=l&&String(l.pages||'').match(/\d+/g);return g?+g[g.length-1]:0};
const early=L.map(l=>l.id).filter(id=>endOf(id)&&endOf(id)<98),want={};
early.forEach(id=>{const e=endOf(id);want[id]=e<=30?'2026-12-04':e<=37?'2026-12-05':e<=53?'2026-12-06':e<=81?'2026-12-07':'2026-12-05'});
assert.strictEqual(early.length,17);
const at=(pth,now)=>{const o=fresh();o.exams.path=pth;o.now=now;return boot('schedule.js',o).S.cached()};
const s0=at(P0,'2026-11-21T14:00:00+03:00'),s1=at(withMore(P0),'2026-11-21T14:00:00+03:00');
assert.strictEqual(s1.path.subjects.law135.total,s0.path.subjects.law135.total+17);
assert.strictEqual(s1.path.until,s0.path.until);assert.strictEqual(s1.path.subjects.law135.first,s0.path.subjects.law135.first);
assert.strictEqual(s1.path.subjects.law135.last,'2026-12-07');
const seen={};let worst=0;
walk('schedule.js',withMore(P0),[],(s,day)=>{
  assert.strictEqual(s.source,'path');
  s.days.forEach(x=>x.tasks.forEach(t=>{if(t.code!=='law135'||t.kind!=='learn'||early.indexOf(t.lesson)<0)return;
    assert.ok(t.path&&!t.late&&x.date===want[t.lesson],t.lesson+' في '+x.date+' لا في '+want[t.lesson]+'، يوم '+day);if(x.date===day)seen[t.lesson]=day}));
  if(day<'2026-12-19')early.forEach(id=>{const cell=s.path.days.find(x=>x.date===want[id]);assert.ok(cell&&cell.items.some(it=>it.code==='law135'&&it.lessons.some(l=>l.id===id)),id+' ليس في خانة يومه')});
  const codes={},cell=s.path.days.find(x=>x.date===day);
  (s.days[0]&&s.days[0].date===day?s.days[0].tasks:[]).forEach(t=>{codes[t.code]=1});if(cell)cell.items.forEach(it=>{if(it.pending)codes[it.code]=1});
  worst=Math.max(worst,Object.keys(codes).length);assert.ok(Object.keys(codes).length<=3,day+': أكثر من ثلاث مواد');
});
assert.strictEqual(str(early.map(id=>seen[id])),str(early.map(id=>want[id])));

// د) الترحيل: يوم 4 ديسمبر بلا إنجاز، فدروسه في 5 ديسمبر «متأخر»، ودروس 5 ديسمبر في يومها بلا وسم
const ids=(t,late)=>str(Array.from(t).filter(x=>!!x.late===late).map(x=>x.lesson).sort()),due=d=>str(early.filter(id=>want[id]===d).sort());
walk('schedule.js',withMore(P0),['2026-12-04'],(s,day)=>{if(day!=='2026-12-05')return;
  const t=s.days[0].tasks.filter(x=>x.code==='law135'&&early.indexOf(x.lesson)>=0);
  assert.strictEqual(ids(t,true),due('2026-12-04'));assert.strictEqual(ids(t,false),due('2026-12-05'))});

// هـ) درس أُنجز قبل يومه (القاعدة 9): لا يعود مهمة، ويبقى في خانة يومه منجزاً
walk('schedule.js',withMore(P0),[],(s,day,o)=>{const id=early[0];
  if(day==='2026-12-02')o.marks.law135.marks[id+'|'+day]={on:1,t:Date.parse(day+'T16:00:00+03:00'),k:'learn'};
  if(day!=='2026-12-03'&&day!=='2026-12-04')return;
  assert.ok(!s.days.some(x=>x.tasks.some(t=>t.code==='law135'&&t.lesson===id&&t.kind==='learn')),'درس أُنجز قبل يومه عاد مهمة');
  assert.ok(s.path.days.find(x=>x.date===want[id]).items.some(it=>it.lessons.some(l=>l.id===id&&l.done)),'درس أُنجز قبل يومه ليس منجزاً في خانته')});

// و) اللصق: يُقبل الطريق بأجزائه ويُحفظ more كما هو، وبلا more لا يتغير ما يُحفظ عن النسخة السابقة، ويُرفض المعيب
{const o=fresh();o.now='2026-11-25T14:00:00+03:00';const b=boot('schedule.js',o),p=boot('schedule.prev.js',o);
  let r=b.S.parsePath(str({path:withMore(P0)}),b.S.cached());assert.ok(r.ok,str(r.errors));assert.strictEqual(str(r.path.subjects.law135.more),str(MORE));
  const a=b.S.parsePath(str({path:P0}),b.S.cached()).path,c=p.S.parsePath(str({path:P0}),p.S.cached()).path;a.created=c.created=0;assert.strictEqual(str(a),str(c));
  b.S.applySmart(b.S.parseSmart('طريقك:\n'+str({path:withMore(P0)}),b.S.cached()).plan);
  assert.strictEqual(b.S.cached().source,'path');assert.strictEqual(b.S.cached().path.subjects.law135.last,'2026-12-07');
  const bad=[[[{from:90,days:[['2026-12-04',120]]}],'تتداخل'],[[{from:7,days:[['2026-12-04',40]]},{from:38,days:[['2026-12-05',81]]}],'تتداخل'],
    [[{from:7,days:[['2026-12-04',30],['2026-12-05',20]]}],'تتراجع'],[[{from:7,days:[['2026-12-19',30]]}],'يوم الاختبار'],[{from:7},'ليست قائمة'],[[{days:[['2026-12-04',30]]}],'صفحة البداية']];
  bad.forEach(x=>{r=b.S.parsePath(str({path:withMore(P0,x[0])}),b.S.cached());assert.ok(!r.ok&&r.errors.some(e=>e.indexOf(x[1])>=0),'لم يُرفض: '+str(x[0])+' '+str(r.errors))});}
console.log('T6 ok: بلا more مطابق للنسخة السابقة في '+plain.length+' طريق، ودروس ص 7–97 السبعة عشر في أيامها، وأكثر يوم '+worst+' مواد');
