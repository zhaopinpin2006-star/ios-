import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs/promises';
import {createServer} from 'node:http';

const root=path.resolve('docs');
const server=createServer(async(req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const filename=path.resolve(root,pathname==='/'?'index.html':'.'+pathname);
    if(!filename.startsWith(root+path.sep))throw new Error('outside public directory');
    const bytes=await fs.readFile(filename);
    const ext=path.extname(filename);
    const mime=ext==='.js'?'application/javascript':ext==='.jpg'?'image/jpeg':ext==='.html'?'text/html':'application/octet-stream';
    res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-cache'});res.end(bytes);
  }catch(err){res.writeHead(404);res.end('Not found')}
});
await new Promise(resolve=>server.listen(8765,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--disable-dev-shm-usage']});
try{
  const context=await browser.newContext({acceptDownloads:true,viewport:{width:1280,height:900}});
  const page=await context.newPage();
  page.on('console',msg=>{const t=msg.text();if(/progress|webgl|error|target/i.test(t))console.log('BROWSER:',t.slice(0,500))});
  page.on('pageerror',error=>console.error('PAGE ERROR:',error.message));
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'domcontentloaded',timeout:120000});
  await page.evaluate(async()=>{
    const {Compiler}=await import('./vendor/mindar-image.prod.js');
    if(typeof Compiler!=='function')throw new Error('MindAR Compiler export missing');
    const img=new Image();img.src='./mudgugu-target.jpg';await img.decode();
    console.log('target loaded',img.width,img.height);
    const compiler=new Compiler();
    await compiler.compileImageTargets([img],p=>{if(Math.round(p)%20===0)console.log('compiler progress',p)});
    const buffer=await compiler.exportData();
    window.__targetUrl=URL.createObjectURL(new Blob([buffer],{type:'application/octet-stream'}));
  });
  await page.evaluate(()=>{
    const a=document.createElement('a');
    a.href=window.__targetUrl;a.download='targets.mind';a.id='downloadTarget';a.textContent='Save';document.body.appendChild(a);
  });
  const [download]=await Promise.all([page.waitForEvent('download',{timeout:20000}),page.locator('#downloadTarget').click()]);
  await download.saveAs(path.resolve('docs/targets.mind'));
  const stat=await fs.stat('docs/targets.mind');
  if(stat.size<200)throw new Error('Compiled target unexpectedly small: '+stat.size);
  console.log('Compiled docs/targets.mind',stat.size,'bytes');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
