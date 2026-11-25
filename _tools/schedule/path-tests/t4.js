// T4: لا يزيد يوم على ثلاث مواد: مهامه كلها (ومنها مهام المواقع الإضافية) مع صفحاته المعلّقة في الطريق، كما تعرضها
// الرئيسية والتقويم. على بيانات المستودع كما هي (صفحات لم تُنشر)، ثم بعد نشر الدروس كلها، بالطريق المحفوظ في
// ملف المواعيد إن وُجد وبطريق 21 نوفمبر، يوماً يوماً من 21 نوفمبر إلى آخر اختبار، مرة بإنجاز تعلّم كل يوم ومرة بأيام فائتة
const {boot,base,withFinals,finalSites,J,NAME}=require('./t.js');const assert=require('assert');const fs=require('fs');
const paths={'21 نوفمبر':JSON.parse(fs.readFileSync(__dirname+'/path.json','utf8')).path};
const saved=J('exams.json').path;if(saved)paths['المحفوظ']=saved;
const iso=d=>d.toISOString().slice(0,10);let runs=0,days=0,worst=0;
for(const pn of Object.keys(paths))for(const pub of [false,true])for(const skip of [[],['2026-11-25','2026-11-26','2026-12-02','2026-12-08']]){
  const o=base();if(pub)finalSites(o);o.exams=withFinals(o.exams);o.exams.path=paths[pn];
  for(let d=new Date('2026-11-21T00:00:00Z');iso(d)<'2026-12-23';d.setUTCDate(d.getUTCDate()+1)){
    const day=iso(d);o.now=day+'T14:00:00+03:00';const s=boot('schedule.js',o).S.cached();
    const t=s.days[0]&&s.days[0].date===day?s.days[0].tasks:[],codes={};
    t.forEach(x=>{codes[x.code]=1});
    const cell=s.path&&s.path.days.find(x=>x.date===day);if(cell)cell.items.forEach(it=>{if(it.pending)codes[it.code]=1});
    const n=Object.keys(codes).length;if(n>worst)worst=n;days++;
    assert.ok(n<=3,'طريق '+pn+(pub?' بعد النشر':'')+(skip.length?' بأيام فائتة':'')+': '+day+' فيه '+n+' مواد: '+Object.keys(codes).map(c=>NAME[c]).join('، '));
    if(skip.indexOf(day)>=0)continue;
    t.filter(x=>x.kind==='learn').forEach(x=>{o.marks[x.code].marks[x.lesson+'|'+day]={on:1,t:Date.parse(day+'T15:00:00+03:00'),k:'learn'}});
  }
  runs++;
}
console.log('T4 ok: '+runs+' سيرات، '+days+' يوماً، وأكثر يوم '+worst+' مواد');
