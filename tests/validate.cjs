// 自動驗證：大量隨機情境，檢查每題只有一個正解、冇重複選項、止蝕／目標方向正確、高級題真假突破成交量符合。
// 用法：node tests/validate.cjs
const X=require('./load.cjs')();
const {genScenario,buildQs,PATTERNS}=X;const PK=Object.keys(PATTERNS);
const iss={};const add=(k,m)=>{iss[k]=iss[k]||{n:0,ex:m};iss[k].n++};let N=0;
const isFbTxt=t=>/假突破|假跌破|未放量|縮量|未獲確認/.test(t);
for(const k of PK)for(const lv of[1,2,3])for(let s=1;s<=300;s++){N++;
 const sc=genScenario(k,lv,s*7919),qs=buildQs(sc,s*7919),d=sc.d,E=sc.entry;
 qs.forEach(q=>{const ok=q.o.filter(o=>o.ok).length;if(ok!==1)add(`q${q.it} ok=${ok} `+k,lv);const t=q.o.map(o=>o.t);if(new Set(t).size!==t.length)add(`q${q.it} dup option `+k+lv,t.join('|'));if(q.o.length<3)add('q<3 opts '+k,q.it)});
 if(d*(sc.target-E)<=0)add('target wrong side '+k,lv);
 if(d*(E-sc.stop)<=0)add('stop wrong side '+k,lv);
 const rr=sc.m/Math.abs(E-sc.stop);if(rr<1.2)add('R<1.2 '+k+lv,rr.toFixed(2));
 for(let i=0;i<sc.M+1;i++)if(sc.U(i)<=sc.L(i)){add('lines cross '+k,i);break}
 const rp=Math.abs(E-sc.stop)/E*100;if(rp<.8)add('stop <0.8% '+k+lv,rp.toFixed(2));if(rp>12)add('stop >12% '+k+lv,rp.toFixed(2));
 const vis=sc.bars;if(vis.some(b=>!(b.h>=Math.max(b.o,b.c)-1e-9&&b.l<=Math.min(b.o,b.c)+1e-9)))add('bad OHLC '+k,lv);
 if(!PATTERNS[k].nodraw||true){let out=0;for(let i=0;i<sc.M;i++){const b=vis[sc.preN+i];if(b.h>sc.U(i)+sc.atr*.6&&PATTERNS[k].labU!=='')out++;if(b.l<sc.L(i)-sc.atr*.6&&!sc.segL&&PATTERNS[k].labL!=='')out++}if(out>2)add('bars outside lines '+k+lv,out)}
 // 形態期間唔可以提早突破（收市）
 for(let i=0;i<sc.M;i++){const b=vis[sc.preN+i];if(d>0&&b.c>sc.U(i)+sc.atr*.3){add('early close above breakout line '+k+lv,i);break}if(d<0&&b.c<sc.L(i)-sc.atr*.3){add('early close below breakout line '+k+lv,i);break}}
 if(sc.hard){const b=vis[vis.length-1],line=d>0?sc.U(sc.M):sc.L(sc.M),a=vis.slice(-21,-1),va=a.reduce((x,y)=>x+y.v,0)/20,r=b.v/va;
  if(d*(b.c-line)<=0)add('hard bar not beyond line '+k,lv);
  if(sc.fake&&r>.9)add('fake vol too high '+k,r.toFixed(2));if(!sc.fake&&r<1.5)add('real vol too low '+k,r.toFixed(2));
  const f0=sc.fut;const endC=f0[f0.length-1].c;if(sc.fake&&d*(endC-E)>0)add('fake outcome not failing '+k,lv);if(!sc.fake&&d*(endC-E)<=0)add('real outcome not working '+k,lv)}
 const q6=qs.find(q=>q.it===6),fb=q6.o.filter(o=>isFbTxt(o.t));if(fb.length>1)add('fail item >1 breakout-type '+k+lv,fb.map(o=>o.t).join(' || '));
 const q3=qs.find(q=>q.it===3);if(sc.hard&&!q3.o.find(o=>o.ok).t.includes(sc.fake?'未':'已確認'))add('entry key mismatch '+k,lv);
}
// 其他模式
const {genVCPok,vcpSpec,genMETAok,DRILLS,QB}=X;
for(const v of['valid','down','wide','loose'])for(let s=1;s<=150;s++){const g=genVCPok(s*104729,v);if(!vcpSpec(g))add('vcp spec fail '+v,s)}
for(let s=1;s<=200;s++){const m=genMETAok(s*15485863);if(m.c>=3&&(m.entry-m.stop)/m.entry>.1)add('meta risk>10%',1)}
for(const k in DRILLS)for(let i=0;i<300;i++){const g=DRILLS[k].gen();const ok=g.o.filter(o=>o.ok).length;if(ok!==1)add('drill ok!=1 '+k,ok);const t=g.o.map(o=>o.t);if(new Set(t).size!==t.length)add('drill dup '+k,t.join('|'))}
for(const q of QB){const t=[q.a,...q.w];if(new Set(t).size!==t.length)add('QB dup',q.id)}
// 概念題 id 唔可以重複（間隔重複卡用 id 做 key）；每題嘅課號要存在；第 19 課（真實基準率）要有題目
{const ids=new Set(X.JL.map(l=>l.id));if(new Set(QB.map(q=>q.id)).size!==QB.length)add('QB id dup','');for(const q of QB)if(!ids.has(q.L))add('QB lesson missing',q.id+' L'+q.L);
 for(const l of X.JL)if(!l.pts.length||l.pts.some(p=>typeof p!=='string'||!p))add('lesson bad pts',l.id);const n19=QB.filter(q=>q.L===19).length;if(n19<5)add('lesson 19 QB <5',n19)}
if(X.genDecision)for(let s=1;s<=2000;s++){const D=X.genDecision(s*31337);const qs=X.buildDecQs(D);if(!(D.E>D.S))add('dec E<=S',D.key);if(D.shares<=0)add('dec shares<=0',D.key);if(D.rr<=0)add('dec rr<=0 '+D.f,D.rr);if((D.f==='ext')!==(D.ext>5))add('dec ext mismatch '+D.f,D.ext.toFixed(1));if(D.sc.fake!==(D.f==='fake'))add('dec fake mismatch',D.key);const e=D.ix.bars.length-1,c=D.ix.bars[e].c,m50=D.ix.m50[e],m200=D.ix.m200[e];const rg=c>m50&&m50>m200?'bull':c<m50&&c>m200?'corr':c<m200?'bear':'?';if(rg!==D.reg)add('dec regime mismatch '+D.reg,rg);qs.forEach((q,i)=>{const ok=q.o.filter(o=>o.ok).length;if(ok!==1)add('dec q'+i+' ok='+ok,D.why);const t=q.o.map(o=>o.t);if(new Set(t).size!==t.length)add('dec dup q'+i,t.join('|'))})}
console.log('情境數',N,'QB',QB.length);const ks=Object.keys(iss);for(const k of ks)console.log(iss[k].n,'\t',k,'\t',String(iss[k].ex).slice(0,220));
if(ks.length){console.log('❌ 有問題');process.exitCode=1}else console.log('✅ 全部通過');
