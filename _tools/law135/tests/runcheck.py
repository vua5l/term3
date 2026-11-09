"""فحص التشغيل: تسجيل درس، وتسميع خروجه، وإشارات الجدول الأربع، وبقاء التقدم بعد إغلاق الصفحة."""
import asyncio, json, os, sys
from playwright.async_api import async_playwright
PORT=int(sys.argv[1]) if len(sys.argv)>1 else 8141
LES=int(sys.argv[2]) if len(sys.argv)>2 else 1
INIT = """
(() => {
  window.__calls = [];
  let v;
  Object.defineProperty(window, 'term3Schedule', { configurable: true,
    get() { return v; },
    set(x) { ['done','undo','level','extra'].forEach(k => { const f = x[k]; x[k] = function () { window.__calls.push([k].concat([].slice.call(arguments).map(a => typeof a === 'object' ? JSON.stringify(a) : a))); try { return f.apply(this, arguments); } catch (e) { return Promise.resolve(); } }; }); v = x; } });
})();
"""
async def main():
    async with async_playwright() as p:
        kw={'executable_path':'/usr/bin/google-chrome','args':['--no-sandbox']}
        b=await p.chromium.launch(**kw)
        ctx=await b.new_context(viewport={'width':390,'height':844},locale='ar-SA',timezone_id='Asia/Riyadh')
        async def router(r):
            u=r.request.url
            if '127.0.0.1' not in u: await r.abort()
            else: await r.continue_()
        await ctx.route('**/*',router)
        await ctx.add_init_script(INIT)
        pg=await ctx.new_page(); errs=[]
        pg.on('pageerror',lambda e: errs.append(str(e)))
        base=f'http://127.0.0.1:{PORT}/law135/'
        await pg.goto(base+f'#l-{LES}',wait_until='load'); await pg.wait_for_timeout(1200)
        # تسميع الخروج: أجب عن كل الأسئلة بأول خيار
        await pg.locator('[data-act="exit-quiz"]').first.click(); await pg.wait_for_timeout(300)
        answered=0
        for _ in range(40):
            if await pg.locator('[data-act="tf-pick"]').count():
                await pg.locator('[data-act="tf-pick"]').first.click(); await pg.wait_for_timeout(80)
                await pg.locator('[data-act="tf-reveal"]').first.click(); await pg.wait_for_timeout(120)
                if await pg.locator('[data-act="why-self"]').count(): await pg.locator('[data-act="why-self"]').first.click(); await pg.wait_for_timeout(80)
            elif await pg.locator('[data-act="answer"]:not([disabled])').count():
                await pg.locator('[data-act="answer"]:not([disabled])').first.click(); await pg.wait_for_timeout(120)
            else: break
            answered+=1
            nx=pg.locator('[data-act="next"]')
            if await nx.count(): await nx.first.click(); await pg.wait_for_timeout(150)
            else: break
        await pg.wait_for_timeout(1500)
        await pg.evaluate("location.hash='#l-%d'" % LES); await pg.wait_for_timeout(500)
        if await pg.locator('[data-act="learn-skip"]').count():
            await pg.locator('[data-act="learn-skip"]').first.click(); await pg.wait_for_timeout(500)
        calls1=await pg.evaluate("window.__calls")
        st1=await pg.evaluate("JSON.parse(localStorage.getItem('law135-v1')||'{}')")
        # إغلاق الصفحة وفتحها من جديد
        await pg.close(); pg=await ctx.new_page(); pg.on('pageerror',lambda e: errs.append(str(e)))
        await pg.goto(base+f'#l-{LES}',wait_until='load'); await pg.wait_for_timeout(1200)
        st2=await pg.evaluate("JSON.parse(localStorage.getItem('law135-v1')||'{}')")
        txt=await pg.evaluate("(document.querySelector('main')||document.body).innerText")
        if await pg.locator('[data-act="learn-undo"]').count():
            await pg.locator('[data-act="learn-undo"]').first.click(); await pg.wait_for_timeout(500)
        calls2=await pg.evaluate("window.__calls")
        kinds=sorted(set(c[0] for c in calls1+calls2))
        print('answered', answered, '| q saved', len(st1.get('q',{})), '| learn', list(st1.get('learn',{}).keys()), '| exit', json.dumps(st1.get('exit',{}),ensure_ascii=False)[:120])
        print('after reload: q', len(st2.get('q',{})), '| learn', list(st2.get('learn',{}).keys()), '| same state:', json.dumps(st1,sort_keys=True)==json.dumps(st2,sort_keys=True))
        print('schedule calls:', kinds); [print('  ',c[:4]) for c in (calls1+calls2)[:8]]
        print('page shows learned:', 'متعلَّم' in txt or 'تعلّمت' in txt)
        print('errors:', errs[:5])
        ok = answered>0 and len(st2.get('q',{}))>0 and json.dumps(st1,sort_keys=True)==json.dumps(st2,sort_keys=True) and {'done','level','extra'}<=set(kinds) and not errs
        print('RUN-CHECK OK' if ok else 'RUN-CHECK FAILED')
        await b.close()
asyncio.run(main())
