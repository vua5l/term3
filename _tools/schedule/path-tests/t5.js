// T5 (25 نوفمبر): قواعد قياس السرعة. السرعة أسهل من البطء، والاستراحة أكثر من ضعف التقدير، والحد الأدنى، والبداية من آخر نسبة،
// وإن أسرعتُ اليوم صغرت دقائق مهام اليوم ولم تتغير المهام نفسها
const {boot,J,CODES}=require('./t.js');const assert=require('assert');
const now='2026-11-25T20:20:00+03:00';
const data=()=>({lessons:Object.fromEntries(CODES.map(c=>[c,J(c+'.lessons.json')])),marks:Object.fromEntries(CODES.map(c=>[c,J(c+'.passes.json')])),exams:J('exams.json'),now});
const {S}=boot('schedule.js',data());
const T=(h,m)=>new Date('2026-11-20T'+String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':00+03:00').getTime();
const ix={X:{}};'abcdefg'.split('').forEach(id=>ix.X[id]={id,minutes:40});
const run=(evs,prior)=>{const marks={},passes={X:{}};evs.forEach(([id,h,m])=>{marks[id+'|2026-11-20']={on:1,t:T(h,m),k:'learn'};passes.X[id]=['2026-11-20']});
  return S.calibrate({X:{marks}},ix,passes,'2026-11-21',prior).X||null};
// عينتان أسرع: تكفيان
let r=run([['a',10,0],['b',10,12],['c',10,24]]);assert.deepStrictEqual([r.factor,r.basis],[0.3,'fast']);
// عينتان أبطأ: لا تكفيان
assert.strictEqual(run([['a',10,0],['b',11,0],['c',12,0]]),null);
// أبطأ من آخر نسبة بعينتين: تبقى آخر نسبة
r=run([['a',10,0],['b',11,0],['c',12,0]],{X:0.5});assert.deepStrictEqual([r.factor,r.basis],[0.5,'prior']);
// أربع أبطأ: تُعتمد
r=run([['a',10,0],['b',11,0],['c',12,0],['d',13,0],['e',14,0]]);assert.deepStrictEqual([r.factor,r.basis],[1.5,'slow']);
// فترة أكثر من ضعف التقدير استراحة لا تُحتسب: 81 دقيقة لدرس الأربعين
r=run([['a',10,0],['b',11,21],['c',11,33],['d',11,45]]);assert.deepStrictEqual([r.factor,r.samples],[0.3,2]);
r=run([['a',10,0],['b',11,20],['c',11,32],['d',11,44]]);assert.strictEqual(r.samples,3);
// الحد الأدنى 0.25
r=run([['a',10,0],['b',10,8],['c',10,16]]);assert.strictEqual(r.factor,0.25);
// بلا عينات: البداية المكتوبة للدستوري
assert.deepStrictEqual(S.cached().calib.law136.basis,'prior');
// الحالة الحقيقية: مهام اليوم هي نفسها بلا تصغير اليوم، ودقائقها لا تزيد
let src=require('fs').readFileSync(__dirname+'/schedule.js','utf8');const x='if (calibNow[c].factor < (factors[c] || 1))';assert.ok(src.split(x).length===2);
require('fs').writeFileSync(__dirname+'/schedule.t5.js',src.replace(x,'if (false)'));
const a=S.cached(),b=boot('schedule.t5.js',data()).S.cached();
const td=s=>JSON.parse(JSON.stringify(s.days.find(d=>d.date===s.today).tasks));const k=t=>t.code+'|'+t.lesson+'|'+t.kind;
assert.deepStrictEqual(td(a).map(k),td(b).map(k));
let smaller=0;td(a).forEach((t,i)=>{assert.ok(t.minutes<=td(b)[i].minutes);if(t.minutes<td(b)[i].minutes)smaller++});
assert.ok(smaller>0&&a.calib.law135.plan>a.calib.law135.factor);
console.log('T5 ok: قواعد السرعة، ومهام اليوم',td(a).length,'كما هي، صغرت دقائق',smaller,'منها، والدولي اليوم',a.calib.law135.factor,'وخطته',a.calib.law135.plan);
