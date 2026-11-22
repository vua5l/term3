// حزام تجربة: يحمّل نسخة من schedule.js في سياق معزول بساعة مثبّتة وتخزين محلي مُعدّ، ثم يقرأ الحالة بـ cached()
const fs=require('fs'),vm=require('vm'),path=require('path');
const DIR=__dirname;const J=f=>JSON.parse(fs.readFileSync(path.join(DIR,f),'utf8'));
const CODES=['law114','law117','law135','law136','law138'];
const NAME={law117:'الأسرة',law114:'الالتزام',law135:'الدولي',law138:'الإداري',law136:'الدستوري'};
function boot(file,o){
  const fixed=new Date(o.now).getTime();const R=Date;
  class D extends R{constructor(...a){if(a.length===0)super(fixed);else super(...a)}static now(){return fixed}}
  const mem={};
  mem['term3_sched_cache__schedule/exams.json']=JSON.stringify(o.exams);
  CODES.forEach(c=>{mem['term3_sched_lessons_'+c]=JSON.stringify(o.lessons[c]);mem['term3_sched_cache_'+c+'/_passes.json']=JSON.stringify(o.marks[c])});
  const ctx={console,Date:D,Math,JSON,Promise,URL,TextEncoder,TextDecoder,
    location:{hostname:'vua5l.github.io',pathname:'/term3/',href:'https://vua5l.github.io/term3/'},
    document:{currentScript:null,addEventListener(){},visibilityState:'visible'},
    localStorage:{getItem:k=>k in mem?mem[k]:null,setItem:(k,v)=>{mem[k]=String(v)},removeItem:k=>{delete mem[k]}},
    fetch:()=>Promise.reject(new Error('offline')),setTimeout:()=>0,clearTimeout(){},navigator:{onLine:false},
    btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary')};
  ctx.window=ctx;ctx.addEventListener=()=>{};
  vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(DIR,file),'utf8'),ctx);
  return {S:ctx.term3Schedule,mem};
}
// البداية دائماً بلا طريق: تُحذف خانة path من نسخة ملف المواعيد، وتضيفها التجربة التي تحتاجها
const base=()=>{const e=J('exams.json');delete e.path;e.savedAt=0;/* وقت الحفظ الحقيقي قد يسبق ساعة التجربة فيغلب حفظها */return {lessons:Object.fromEntries(CODES.map(c=>[c,J(c+'.lessons.json')])),marks:Object.fromEntries(CODES.map(c=>[c,J(c+'.passes.json')])),exams:e}};
function listedTo(ls){let m=0;ls.forEach(l=>{const g=String(l.pages||'').match(/\d+/g);if(g&&+g[g.length-1]>m)m=+g[g.length-1]});return m}
// يكمل قائمة دروس المادة بدروس وهمية (معرّفاتها z1، z2…) لما لم يُنشر من الصفحات حتى upto، ستّ صفحات للدرس. ولا يضيف شيئاً إن كانت منشورة
function pad(o,code,upto,mins){const ls=o.lessons[code].lessons;let n=1;for(let p=listedTo(ls)+1;p<=upto;p+=6)ls.push({id:'z'+(n++),title:'درس لم يُنشر',minutes:mins,pages:p+'–'+Math.min(upto,p+5),link:'#x'})}
// حال المواقع بعد نشر جديدها كله: موقع نهائي الالتزام من فرعه المؤقت (إن بقي الفرع)، وإكمال الباقي بدروس وهمية
function finalSites(o){if(fs.existsSync(path.join(DIR,'law114temp.lessons.json'))&&listedTo(o.lessons.law114.lessons)<244){o.lessons.law114={lessons:J('law114temp.lessons.json').lessons};o.marks.law114={v:1,marks:{}}}
  pad(o,'law114',244,50);pad(o,'law135',484,40);pad(o,'law136',387,45);pad(o,'law138',204,30);pad(o,'law117',288,55)}
const FINAL={law117:'2026-12-13',law114:'2026-12-15',law135:'2026-12-19',law138:'2026-12-21',law136:'2026-12-23'};
function withFinals(ex){const e=JSON.parse(JSON.stringify(ex));e.exams.forEach(x=>{x.date=FINAL[x.code];x.tentative=false});return e}
function wipe(rec,t){const r=JSON.parse(JSON.stringify(rec));Object.keys(r.marks).forEach(k=>{if(r.marks[k].on)r.marks[k]={on:0,t:t,k:''}});return r}
function mark(rec,id,day,t){const r=JSON.parse(JSON.stringify(rec));r.marks[id+'|'+day]={on:1,t:t,k:'learn'};return r}
function dayLine(d){const by={};d.tasks.forEach(t=>{const g=by[t.code]=by[t.code]||{learn:[],late:0,recall:0,sp:0,done:0,x:0};if(t.kind==='learn'){g.learn.push(t.lesson);if(t.late)g.late++}else if(t.kind==='recall')g.recall++;else if(t.kind==='extra')g.x++;else g.sp++;if(t.done)g.done++});
  return d.date.slice(5)+' '+d.minutes+'د | '+Object.keys(by).map(c=>NAME[c]+': '+(by[c].learn.length?'تعلّم '+by[c].learn[0]+(by[c].learn.length>1?'–'+by[c].learn[by[c].learn.length-1]:'')+' ('+by[c].learn.length+(by[c].late?'، متأخر '+by[c].late:'')+')':'')+(by[c].recall?' تسميع '+by[c].recall:'')+(by[c].sp?' خاص':'')+(by[c].done?' ✓'+by[c].done:'')).join(' ؛ ')}
module.exports={boot,base,withFinals,wipe,mark,dayLine,pad,finalSites,J,CODES,NAME,FINAL};
