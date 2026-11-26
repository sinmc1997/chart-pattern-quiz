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
// 第 5 版：2026 真實交易（重播／止蝕位／移動止蝕）＋交易日誌
const rtInfo={};
if(X.RT){const RT=X.RT,dec={A:0,B:0,C:0};let use=0;
 if(RT.tr.length!==69)add('RT 交易數 !=69',RT.tr.length);if(new Set(RT.tr.map(t=>t.id)).size!==RT.tr.length)add('RT id dup','');
 for(const tk in RT.S){const b=X.rtSer(tk).bars;if(b.some(x=>!(x.h>=Math.max(x.o,x.c)-1e-9&&x.l<=Math.min(x.o,x.c)+1e-9&&x.l>0)))add('RT bad OHLC',tk);
  // 拆合股調整後應該連續：未調整嘅 1 拆 8／5 合 1 會令收市一日跳 ≥5 倍；真實財報跳空最多約 1.7 倍
  for(let i=1;i<b.length;i++){const r=b[i].c/b[i-1].c;if(r>3||r<1/3){add('RT 價格一日跳 >3 倍（拆合股未調整？）',tk+' '+i+' '+r.toFixed(2));break}}}
 for(const t of RT.tr){const b=X.rtSer(t.t).bars;
  if(!(t.ie>=0&&t.ie<=t.ix&&t.ix<b.length))add('RT bad idx',t.id);
  for(const k of['pos','acct','acct_ret','remark','risk'])if(k in t)add('RT 有金額／原文備註欄',k);
  for(const k of['P','S','S0','T','X'])if(!(t[k]>0))add('RT price <=0 '+k,t.id);
  // 成交價同當日日K同一尺度（拆合股換算啱）：容許盤前盤後 ±30%
  if(t.P>b[t.ie].h*1.3||t.P<b[t.ie].l*.7)add('RT 買入價唔喺入場日尺度',t.t+' '+t.d);if(t.X>b[t.ix].h*1.3||t.X<b[t.ix].l*.7)add('RT 賣出價唔喺賣出日尺度',t.t+' '+t.dx);
  if(!X.rtUsable(t))continue;use++;
  const r=X.rtRules(t),st=X.rtStop(t);dec[r.dec]++;
  if((r.dec==='C')!==(r.h.length>0))add('RT dec mismatch',t.id);if(t.volr!=null&&t.volr<1&&r.dec!=='C')add('RT 低量但唔係唔入',t.id);if(t.lev&&r.dec!=='C')add('RT 槓桿但唔係唔入',t.id);if(t.ma50!=null&&t.ma50<0&&r.dec!=='C')add('RT 50MA 下但唔係唔入',t.id);
  if(!(st.best>0&&st.best<=t.P-.6*st.a+1e-9))add('RT 規則止蝕 <0.6 ATR 或 <=0',t.id);if(!(st.lo<=st.best+1e-12))add('RT zone',t.id);
  if(!X.rtStopGrade(t,st.best).pass)add('RT 規則止蝕唔合格',t.id);if(X.rtStopGrade(t,t.P-.3*st.a).pass)add('RT 0.3 ATR 止蝕竟然合格',t.id);
  for(let s=0;s<8;s++){const qs=X.rtBuildQs(t);if(qs.length!==4)add('RT qs!=4',t.id);
   qs.forEach((q,i)=>{const ok=q.o.filter(o=>o.ok).length;if(ok!==1)add('RT q'+i+' ok='+ok,t.id);const tx=q.o.map(o=>o.t);if(new Set(tx).size!==tx.length)add('RT dup q'+i,t.id+' '+tx.join('|'));if(q.o.length<3)add('RT q'+i+' <3 opts',t.id)});
   const q0=qs[0].o.find(o=>o.ok);if(q0.k!==r.dec)add('RT q0 答案唔係清單',t.id);
   if(qs[1].o.find(o=>o.ok).k!==r.first||(r.first==='none')!==(r.dec!=='C'))add('RT 第一個唔過唔一致',t.id);
   qs[2].o.forEach(o=>{const g=X.rtStopGrade(t,o.px);if(o.ok!==g.pass)add('RT 止蝕題選項同評分唔一致',t.id+' '+o.t)});
   if(!/^[\d,]+ 股$/.test(qs[3].o.find(o=>o.ok).t)||qs[3].o.find(o=>o.ok).t==='0 股')add('RT 股數 <=0',t.id)}}
 if(use<60)add('RT 可用交易 <60',use);if(dec.C<10||dec.A+dec.B<5)add('RT 答案分佈太偏',JSON.stringify(dec));rtInfo.dec=dec;rtInfo.use=use;
 // 移動止蝕：止蝕只可以向上；出場價合理；捕獲 ≤100%
 const el=RT.tr.filter(X.rtTrailOK);rtInfo.trail=el.length;if(el.length<8)add('移動止蝕可用交易 <8',el.length);
 for(const t of el){const B=X.rtTrailBench(t);if(!B.done||B.exit.k>B.end)add('trail bench 未完',t.id);
  for(let s=0;s<40;s++){const T=X.rtTrailInit(t);let g=0;while(!T.done&&g++<100){const u=Math.random(),os=X.rtTrailOpts(T).filter(o=>o.ok);
    if(u<.03){X.rtTrailSell(T);break}if(u<.1&&X.rtTrailSet(T,T.stop-.5*T.a)!=='low')add('trail 移低止蝕冇被拒絕',t.id);if(u<.4&&os.length)X.rtTrailSet(T,os[Math.floor(Math.random()*os.length)].p);X.rtTrailNext(T)}
   if(!T.done)add('trail 冇完',t.id);for(let i=1;i<T.hist.length;i++)if(T.hist[i].s<T.hist[i-1].s-1e-9){add('trail 止蝕向下',t.id);break}
   const res=X.rtTrailRes(T),bx=T.Z.bars[T.exit.k];if(res.cap>1+1e-9)add('trail 捕獲 >100%',t.id);if(T.exit.p>bx.h+1e-9||T.exit.p<Math.min(bx.l,bx.o)-1e-9)add('trail 出場價唔喺當日範圍',t.id+' '+T.exit.how);if(T.exit.k<=t.ie&&T.exit.how!=='收市賣出')add('trail 入場日觸發止蝕',t.id)}}}
// 交易日誌：公式同 Excel 日誌頁一樣
{const C=X.jnCalc([{B:'2026-03-12',I:'25',J:'24.5',L:'2.127',N:'28',P:'10000',Q:'1',U:'26',T:'2026-03-13'},{B:'2026-03-17',I:'44.2',J:'43.2',U:'43.2'},{B:'2026-03-20',I:'10',J:'9'},{B:'2026-03-24',I:'10',J:'9',U:'8.5'}]),c=C[0],nr=(a,b)=>Math.abs(a-b)<1e-6;
 if(!(nr(c.M,.5/2.127)&&nr(c.O,6)&&c.R===200&&nr(c.S,.5)&&nr(c.X,2)&&c.Y===1&&c.AE==='2026-03'))add('journal 公式（第 1 行）',JSON.stringify(c));
 if(!(nr(C[1].X,-1)&&nr(C[1].AF,1)&&nr(C[1].AG,2)&&nr(C[1].AH,-1)&&C[1].AI===1))add('journal 累積／回撤／連敗',JSON.stringify(C[1]));
 if(C[2].X!=null||C[2].AF!=null||C[2].AI!=null)add('journal 未平倉應該空白',JSON.stringify(C[2]));if(!(nr(C[3].X,-1.5)&&C[3].AI===1&&nr(C[3].AF,-.5)&&nr(C[3].AG,2)))add('journal 空白行之後連敗重計',JSON.stringify(C[3]));
 if(X.JN_COLS.length!==35||X.JN_L.length!==35)add('journal 欄數 !=35',X.JN_COLS.length);if(X.JN_COLS[0]!=='編號'||X.JN_COLS[34]!=='連敗'||X.JN_COLS[27]!=='錯誤類別')add('journal 欄名次序','');
 for(const[k]of X.JN_IN)if(!X.JN_L.includes(k)||['A','M','O','R','S','X','Y','AE','AF','AG','AH','AI','H'].includes(k))add('journal 輸入欄唔啱',k);
 if(X.JN_OPT.AB.length!==11||X.JN_OPT.V.length!==6||X.JN_OPT.D.length!==8)add('journal 下拉選項同 Excel 唔一樣','');if(X.JN_CK.length<9)add('journal 檢查清單 <9','');
 X._setS({journal:[{id:1,B:'2026-03-12',C:'PL',F:'前低, 20MA "Flip"',I:'25',J:'24.5',Q:'1',P:'10000',U:'26',H:'是'}]});const csv=X.jnCSV().replace(/^﻿/,'').split('\r\n');
 if(csv.length!==2||csv[0].split(',').length!==35)add('journal CSV 表頭',csv[0]);if(!csv[1].includes('"前低, 20MA ""Flip"""')||!csv[1].includes(',0.01,'))add('journal CSV 內容',csv[1])}
console.log('真實交易',JSON.stringify(rtInfo));
console.log('情境數',N,'QB',QB.length);const ks=Object.keys(iss);for(const k of ks)console.log(iss[k].n,'\t',k,'\t',String(iss[k].ex).slice(0,220));
if(ks.length){console.log('❌ 有問題');process.exitCode=1}else console.log('✅ 全部通過');
