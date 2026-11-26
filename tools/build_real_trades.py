"""將 2026 真實交易覆盤數據轉成細 JSON，嵌入 index.html（真實交易重播／止蝕位／移動止蝕練習用）。

用法（Windows）：
    C:\\Python314\\python.exe tools\\build_real_trades.py "C:\\Users\\SIN\\Downloads\\交易復盤_2026"
讀：
    <覆盤資料夾>\\data\\ohlcv.csv      日K（Yahoo，已按拆股／合股調整）
    <覆盤資料夾>\\data\\splits.csv     拆合股（DLLL 1 拆 8、OKLL 5 合 1）
    <覆盤資料夾>\\data\\index.csv      QQQ／IWM 收市（大市狀態）
    <覆盤資料夾>\\out\\trade_review.csv 每筆入場日、買入、止損、R、分類（02_trade_review.py 產生）
寫：
    index.html 入面 /*RT_BEGIN*/ … /*RT_END*/ 之間嘅 const RT=…;

規則：
- 價格全部用調整後尺度（同日K一致）：成交價 ÷ f，f＝之後所有拆合股比率相乘（拆股前嘅日子）。
- ATR(14) 用 Wilder 法，計到入場前一日（同 02_trade_review.py 一樣）。
- 唔放任何金額（股數、帳戶、回報 %），唔放原文備註（只放分類），只放 R 同價格。
- 每隻股票只存一段日K：第一筆入場前 60 日 → 最後一筆入場後 45 日。
"""
import sys, json, math, re
from pathlib import Path
import numpy as np
import pandas as pd

src = Path(sys.argv[1] if len(sys.argv) > 1 else r"C:\Users\SIN\Downloads\交易復盤_2026")
html_path = Path(__file__).resolve().parent.parent / "index.html"
PRE, POST = 60, 45

O = pd.read_csv(src / "data" / "ohlcv.csv", parse_dates=["date"], encoding="utf-8-sig")
SP = pd.read_csv(src / "data" / "splits.csv", parse_dates=["date"], encoding="utf-8-sig")
IX = pd.read_csv(src / "data" / "index.csv", parse_dates=["date"], encoding="utf-8-sig")
T = pd.read_csv(src / "out" / "trade_review.csv", parse_dates=["entry_bar", "exit_bar"], encoding="utf-8-sig")

cal = sorted(set(O.date) | set(IX.date))
cpos = {d: i for i, d in enumerate(cal)}

bars = {}
for tk, g in O.groupby("ticker"):
    g = g.sort_values("date").reset_index(drop=True)
    f = pd.Series(1.0, index=g.index)
    for _, s in SP[SP.ticker == tk].iterrows():
        f[g.date < s.date] *= s.ratio
    g["f"] = f
    pc = g.Close.shift(1)
    tr = pd.concat([g.High - g.Low, (g.High - pc).abs(), (g.Low - pc).abs()], axis=1).max(axis=1)
    g["ATR"] = tr.ewm(alpha=1 / 14, adjust=False, min_periods=14).mean()
    g["MA50"] = g.Close.rolling(50).mean()
    g["V20"] = g.Volume.rolling(20).mean()
    # 日K要喺總日曆入面連續（唔連續就唔可以用起始位置＋長度表示）
    ci = [cpos[d] for d in g.date]
    if ci != list(range(ci[0], ci[0] + len(ci))):
        raise SystemExit(f"{tk} 日K唔連續")
    g["ci"] = ci
    bars[tk] = g

LEVS = {"DLLL", "MUD", "MUZ", "NVDX", "OKLL", "RKLX", "SNDG"}
RG = lambda s: "升勢" if s.startswith("升勢") else "分化" if s.startswith("分化") else "弱勢"
EXT = {"止損出場": "止損", "提早出場": "提早走", "達止盈": "目標價"}

def chg(rm):
    rm = rm if isinstance(rm, str) else ""
    if any(k in rm for k in ("降底", "降低", "跌破止損", "較左")):
        return -1
    return 1 if "提高了止損" in rm else 0

def nz(v, nd=3):
    return None if v is None or (isinstance(v, float) and math.isnan(v)) else round(float(v), nd)

rng = {}
trades = []
for _, r in T.sort_values("row").iterrows():
    g = bars[r.ticker]
    ie = int(g.index[g.date == r.entry_bar][0])
    ix = int(g.index[g.date == r.exit_bar][0])
    fe, fx = g.f.iloc[ie], g.f.iloc[ix]
    atr = g.ATR.iloc[ie - 1] if ie >= 1 else np.nan
    lo = lambda n: g.Low.iloc[max(0, ie - n):ie].min() if ie >= n else np.nan
    trades.append(dict(
        id=int(r.row), t=r.ticker, ie=ie, ix=ix,
        P=r.P / fe, S=r.S / fe, S0=r.S0 / fe, T=r.target / fe, X=r.X / fx, R=nz(r.R, 2),
        et=EXT.get(r.exit_type, r.exit_type), cls=r.cls if isinstance(r.cls, str) else "",
        rc=r.remark_cat, el=r.entry_logic, sl=r.stop_logic, nt=r.notes if isinstance(r.notes, str) else "",
        rg=RG(r.regime), lev=1 if r.ticker in LEVS else 0, chg=chg(r.remark),
        atr=atr, low5=lo(5), low10=lo(10),
        volr=nz(r.volr, 2), ma50=nz(r.vs_ma50, 3), chase=nz(r.chase, 3), ret5=nz(r.ret5, 3),
        hb=int(r.hist_bars), mae=nz(r.MAE_R, 2), mfe=nz(r.MFE_R, 2), rr=nz(r.rr_plan, 1),
        d=r.entry_bar.strftime("%Y-%m-%d"), dx=r.exit_bar.strftime("%Y-%m-%d"),
    ))
    a, b = rng.get(r.ticker, (10**9, -1))
    rng[r.ticker] = (min(a, ie - PRE), max(b, ie + POST))

# 每隻股票嘅日K段＋價格精度
S = {}
for tk, (a, b) in rng.items():
    g = bars[tk]
    a, b = max(0, a), min(len(g) - 1, b)
    seg = g.iloc[a:b + 1]
    mx = seg.High.max()
    dp = max(0, 4 - int(math.floor(math.log10(mx))))           # 約 5 位有效數字
    vk = max(0, int(math.floor(math.log10(max(1, seg.Volume.median())))) - 2)  # 量化到約 3 位
    q = lambda col: [int(round(x * 10 ** dp)) for x in seg[col]]
    S[tk] = dict(s=int(seg.ci.iloc[0]), dp=dp, vk=vk, o=q("Open"), h=q("High"), l=q("Low"), c=q("Close"),
                 v=[int(round(x / 10 ** vk)) for x in seg.Volume],
                 m50=[None if math.isnan(x) else int(round(x * 10 ** dp)) for x in seg.MA50])
    S[tk]["a"] = a

for t in trades:
    s = S[t["t"]]
    dp = s["dp"]
    t["ie"] -= s["a"]
    t["ix"] -= s["a"]
    for k in ("P", "S", "S0", "T", "X", "atr", "low5", "low10"):
        v = t[k]
        t[k] = None if v is None or (isinstance(v, float) and math.isnan(v)) else round(float(v), dp + 1)
for s in S.values():
    del s["a"]

ixd = IX.pivot(index="date", columns="symbol", values="Close").reindex(cal)
IXJ = {"s": 0, **{k: [None if math.isnan(x) else round(float(x), 2) for x in ixd[k]] for k in ("QQQ", "IWM")}}
RT = {"cal0": cal[0].strftime("%Y-%m-%d"), "cal": [(d - cal[0]).days for d in cal], "S": S, "ix": IXJ, "tr": trades}

js = "const RT=" + json.dumps(RT, ensure_ascii=False, separators=(",", ":")) + ";"
html = html_path.read_text(encoding="utf-8")
new, n = re.subn(r"/\*RT_BEGIN\*/.*?/\*RT_END\*/", lambda m: "/*RT_BEGIN*/" + js + "/*RT_END*/", html, flags=re.S)
if n != 1:
    raise SystemExit("index.html 搵唔到 /*RT_BEGIN*/…/*RT_END*/ 標記")
html_path.write_text(new, encoding="utf-8", newline="\n")
print(f"寫入 {len(trades)} 筆交易、{len(S)} 隻股票、{len(cal)} 個交易日；RT 大小 {len(js)/1024:.0f} KB → {html_path}")
