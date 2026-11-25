// T2: سير يوم بيوم مع الطريق والدروس كلها منشورة: كل يوم تُنجز مهام تعلّمه (ويُترك يومان بلا إنجاز)، حتى 11 ديسمبر
const {boot,base,withFinals,wipe,finalSites,J,CODES,NAME}=require('./t.js');const assert=require('assert');const fs=require('fs');
const P=JSON.parse(fs.readFileSync(__dirname+'/path.json','utf8')).path;
const o=base();o.marks.law135=wipe(o.marks.law135,1795300000000);o.marks.law136=wipe(o.marks.law136,1795300000000);finalSites(o);
o.exams=withFinals(o.exams);o.exams.path=P;
const iso=d=>d.toISOString().slice(0,10);
// درس ينتهي قبل صفحة بداية مادته في الطريق خارجه بقصد (مثل دروس الفصلي الأول في الدولي ص 7–97، نُشرت في 23 نوفمبر)، فتعلّمه للترتيب التلقائي
const before=t=>{const sub=P.subjects[t.code],l=o.lessons[t.code].lessons.find(x=>x.id===t.lesson),g=l&&String(l.pages||'').match(/\d+/g);return !!(sub&&g&&+g[g.length-1]<sub.from)};const SKIP=['2026-11-24','2026-12-02'];let totals0=null,lateSeen=0,log=[];
for(let d=new Date('2026-11-21T00:00:00Z');iso(d)<='2026-12-11';d.setUTCDate(d.getUTCDate()+1)){
  const day=iso(d);o.now=day+'T14:00:00+03:00';const s=boot('schedule.js',o).S.cached();
  assert.strictEqual(s.source,'path');assert.strictEqual(s.today,day);
  const tot=JSON.stringify(s.path.days.map(x=>[x.date,x.total]));if(!totals0)totals0=tot;assert.strictEqual(tot,totals0,'أعداد خانات التقويم تغيّرت يوم '+day);
  s.path.days.forEach(x=>x.items.forEach(it=>{assert.strictEqual(it.lessons.length,it.total);assert.strictEqual(it.lessons.filter(y=>y.done).length,it.done)}));
  const learn=s.days[0].tasks.filter(t=>t.kind==='learn');lateSeen+=learn.filter(t=>t.late).length;
  assert.ok(learn.every(t=>t.path||before(t)),'تعلّم خارج الطريق يوم '+day);
  log.push(day.slice(5)+':'+learn.length+(learn.some(t=>t.late)?'(م'+learn.filter(t=>t.late).length+')':''));
  if(SKIP.indexOf(day)>=0)continue;
  learn.forEach(t=>{o.marks[t.code].marks[t.lesson+'|'+day]={on:1,t:Date.parse(day+'T15:00:00+03:00'),k:'learn'}});
}
o.now='2026-12-12T10:00:00+03:00';const s=boot('schedule.js',o).S.cached();
console.log('مهام التعلّم كل يوم:',log.join(' '));
console.log('12 ديسمبر: أيام الطريق التامة',s.path.days.filter(x=>x.complete).length,'من',s.path.days.length,'| متأخر',s.path.late,'| دروس كل مادة:',Object.keys(s.path.subjects).map(c=>NAME[c]+' '+s.path.subjects[c].done+'/'+s.path.subjects[c].total).join('، '));
assert.strictEqual(s.path.late,0);assert.ok(s.path.days.every(x=>x.complete));assert.ok(lateSeen>0);
console.log('مهام 12 ديسمبر:',JSON.stringify(s.days[0].tasks.reduce((a,t)=>{a[NAME[t.code]+' '+t.kind]=(a[NAME[t.code]+' '+t.kind]||0)+1;return a},{})));
console.log('T2 ok');
