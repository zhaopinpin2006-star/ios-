import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs/promises';
const ROOT='https://zhaopinpin2006-star.github.io/ios-/docs/';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--disable-dev-shm-usage']});
try{
  const context=await browser.newContext({acceptDownloads:true,viewport:{width:1280,height:900}});
  const page=await context.newPage();
  page.on('console',msg=>{if(/compiler|progress|webgl|error/i.test(msg.text()))console.log('BROWSER:',msg.text().slice(0,800));});
  page.on('pageerror',error=>console.error('BROWSER ERROR:',error.message));
  await page.goto(ROOT,{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>document.readyState!=='loading');
  console.log('Loaded GitHub Pages:',page.url());
  await page.evaluate(async ()=>{
    const {Compiler}=await import('https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image.prod.js');
    if(typeof Compiler!=='function')throw new Error('MindAR ESM Compiler was not exported.');
    const img=new Image();
    img.src='./mudgugu-target.jpg';
    await img.decode();
    console.log('target loaded',img.width,img.height);
    const compiler=new Compiler();
    await compiler.compileImageTargets([img],progress=>{if(Math.round(progress)%20===0)console.log('compiler progress',progress)});
    const buffer=await compiler.exportData();
    window.__targetUrl=URL.createObjectURL(new Blob([buffer],{type:'application/octet-stream'}));
  });
  await page.evaluate(()=>{
    const a=document.createElement('a');a.href=window.__targetUrl;a.download='targets.mind';a.id='downloadTarget';a.textContent='save compiled target';document.body.appendChild(a);
  });
  const [download]=await Promise.all([page.waitForEvent('download',{timeout:20000}),page.locator('#downloadTarget').click()]);
  await download.saveAs(path.resolve('docs/targets.mind'));
  const stats=await fs.stat('docs/targets.mind');
  if(stats.size<200)throw new Error('Compiled target was unexpectedly small: '+stats.size);
  console.log('Saved docs/targets.mind:',stats.size,'bytes');
}finally{await browser.close()}
