const X=require('./load.cjs')();const {genScenario,PATTERNS}=X;const PK=Object.keys(PATTERNS);
const fs=require('fs');const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const SCHEM=eval('('+html.match(/const SCHEM=(\{[\s\S]*?\}\});/)[1]+')');
const slope=(a,h)=>{const s=-(a[3]-a[1])/(a[2]-a[0]);return Math.abs(s)<.05?'水平':s>0?'上傾':'下傾'};
const tb={};const bad=[];
for(const k of PK){const P=PATTERNS[k];const row=tb[P.name]={偏向:P.bias>0?'升':P.bias<0?'跌':'中性',L1L2順方向:0,L1L2反方向:0,L3真突破順方向:0,L3假突破反方向:0,錯:0};
 // 示意圖箭咀方向＝偏向；兩線斜率＝文字描述
 const s=SCHEM[k];if(s.u&&!s.path&&slope(s.u)!==P.up)bad.push(k+' 示意圖上軌 '+slope(s.u)+' vs '+P.up);if(s.l&&!s.path&&slope(s.l)!==P.lo)bad.push(k+' 示意圖下軌 '+slope(s.l)+' vs '+P.lo);
 if(s.path){const a=s.path,last=a[a.length-1][1],prev=a[a.length-2][1],dirS=last<prev?1:-1;if(P.bias&&dirS!==P.bias)bad.push(k+' 示意圖路徑方向錯')}
 for(const lv of[1,2,3])for(let i=1;i<=500;i++){const sc=genScenario(k,lv,i*7919+lv);
  if(P.bias!==0&&sc.d!==P.bias){row.錯++;bad.push(k+' 突破方向≠偏向');continue}
  // 實際圖線斜率＝文字
  if(!s.path&&k!=='rect'){const M=sc.M,su=(sc.U(M-1)-sc.U(0))/sc.U(0),sl=(sc.L(M-1)-sc.L(0))/sc.L(0),t=x=>Math.abs(x)<.003?'水平':x>0?'上傾':'下傾';if(t(su)!==P.up||t(sl)!==P.lo){row.錯++;bad.push(k+' 圖線斜率 '+t(su)+'/'+t(sl))}}
  const end=sc.fut[sc.fut.length-1].c,mv=Math.sign(end-sc.entry);
  if(lv<3){mv===sc.d?row.L1L2順方向++:(row.L1L2反方向++,bad.push(k+' L'+lv+' 結果反方向'))}
  else if(!sc.fake){mv===sc.d?row.L3真突破順方向++:(row.錯++,bad.push(k+' 真突破結果反方向'))}
  else{mv===-sc.d?row.L3假突破反方向++:(row.錯++,bad.push(k+' 假突破結果冇反轉'))}}}
console.table(tb);console.log(bad.length?[...new Set(bad)].slice(0,20):'✅ 全部一致');
