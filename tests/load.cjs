// 將 index.html 入面嘅 <script> 抽出嚟，喺 Node 執行，攞到 module.exports
const fs=require('fs'),path=require('path'),vm=require('vm');
module.exports=function load(){
 const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
 const code=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n;\n');
 const mod={exports:{}};
 const ctx={module:mod,console,Math,Date,JSON,Object,Array,String,Number,Set,Map,Symbol,Error,isNaN,parseFloat,parseInt,Intl,setTimeout,clearTimeout};
 vm.createContext(ctx);vm.runInContext(code,ctx,{filename:'index.html'});
 return mod.exports};
