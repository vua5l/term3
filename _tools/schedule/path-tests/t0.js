// T0: بلا طريق، ناتج النسخة المعدَّلة يطابق الأصل تماماً
const {boot,base,withFinals}=require('./t.js');const assert=require('assert');
let n=0;
for(const now of ['2026-11-21T13:30:00+03:00','2026-11-22T03:10:00+03:00','2026-12-06T10:00:00+03:00','2026-12-14T20:00:00+03:00','2026-12-22T09:00:00+03:00'])
 for(const finals of [false,true]){
  const o=base();o.now=now;if(finals)o.exams=withFinals(o.exams);
  const a=boot('schedule.orig.js',o).S.cached(),b=boot('schedule.js',o).S.cached();
  const strip=s=>{const c=JSON.parse(JSON.stringify(s));delete c.path;return c};
  assert.strictEqual(b.path,null);assert.deepStrictEqual(strip(b),strip(a));n++;
  // buildPlan المباشر أيضاً
  const pa=boot('schedule.orig.js',o).S.buildPlan(a.exams,a.lessons,a.passes,a.today,a.cap,{}),pb=boot('schedule.js',o).S.buildPlan(a.exams,a.lessons,a.passes,a.today,a.cap,{});
  assert.deepStrictEqual(JSON.parse(JSON.stringify(pb)),JSON.parse(JSON.stringify(pa)));
 }
console.log('T0 ok: مطابقة تامة بلا طريق في',n,'حالة');
