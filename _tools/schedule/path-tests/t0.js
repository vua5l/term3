// T0: بلا طريق، ناتج النسخة المعدَّلة يطابق الأصل تماماً
const {boot,base,withFinals}=require('./t.js');const assert=require('assert');
let n=0,cut=0;
for(const now of ['2026-11-21T13:30:00+03:00','2026-11-22T03:10:00+03:00','2026-12-06T10:00:00+03:00','2026-12-14T20:00:00+03:00','2026-12-22T09:00:00+03:00'])
 for(const finals of [false,true]){
  const o=base();o.now=now;if(finals)o.exams=withFinals(o.exams);
  const a=boot('schedule.orig.js',o).S.cached(),b=boot('schedule.js',o).S.cached();
  const strip=s=>{const c=JSON.parse(JSON.stringify(s));delete c.path;return c};
  // الفرق المقصود الوحيد (25 نوفمبر): مهمة موقع إضافية لمادة ليست بين مواد اليوم لا تُلحق إن اكتملت الثلاث
  const A=strip(a),B=strip(b),ta=A.days[0],tb=B.days[0];
  if(ta&&tb&&ta.date===tb.date){const k=x=>x.code+'|'+x.lesson+'|'+x.kind,inB=new Set(tb.tasks.map(k)),codesB=new Set(tb.tasks.map(x=>x.code));
    ta.tasks=ta.tasks.filter(x=>{if(inB.has(k(x)))return true;assert.ok(x.kind==='extra'&&!codesB.has(x.code)&&codesB.size>=3,'فرق غير مقصود: '+k(x));cut++;return false})}
  assert.strictEqual(b.path,null);assert.deepStrictEqual(B,A);n++;
  // buildPlan المباشر أيضاً
  const pa=boot('schedule.orig.js',o).S.buildPlan(a.exams,a.lessons,a.passes,a.today,a.cap,{}),pb=boot('schedule.js',o).S.buildPlan(a.exams,a.lessons,a.passes,a.today,a.cap,{});
  assert.deepStrictEqual(JSON.parse(JSON.stringify(pb)),JSON.parse(JSON.stringify(pa)));
 }
console.log('T0 ok: مطابقة بلا طريق في',n,'حالة، سوى',cut,'مهمة إضافية لمادة رابعة لم تُلحق');
