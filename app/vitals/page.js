"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Nav from "../components/Nav";
import UploadBar from "../components/UploadBar";
import { useData } from "../context/DataContext";
import "../components/chartSetup";
import styles from "./vitals.module.css";
import dynamic from "next/dynamic";

const Bar      = dynamic(()=>import("react-chartjs-2").then(m=>({default:m.Bar})),      {ssr:false});
const Line     = dynamic(()=>import("react-chartjs-2").then(m=>({default:m.Line})),     {ssr:false});
const Scatter  = dynamic(()=>import("react-chartjs-2").then(m=>({default:m.Scatter})),  {ssr:false});
const Doughnut = dynamic(()=>import("react-chartjs-2").then(m=>({default:m.Doughnut})), {ssr:false});
const Pie      = dynamic(()=>import("react-chartjs-2").then(m=>({default:m.Pie})),      {ssr:false});

// ── helpers ───────────────────────────────────────────────────────────────────
function numArr(rows, hdr, idx) {
  if (idx === undefined || idx === -1 || !hdr[idx]) return [];
  return rows.map(r => parseFloat(r[hdr[idx]])).filter(x => !isNaN(x));
}
function numArrAll(rows, hdr, idx) {
  if (idx === undefined || idx === -1 || !hdr[idx]) return [];
  return rows.map(r => parseFloat(r[hdr[idx]]));
}
function stats(arr) {
  const v = arr.filter(x => !isNaN(x) && isFinite(x));
  if (!v.length) return { min:0, max:0, mean:0, std:0, median:0, count:0 };
  const s = [...v].sort((a,b)=>a-b); const n = s.length;
  const mean = v.reduce((a,b)=>a+b,0)/n;
  const std  = Math.sqrt(v.reduce((a,b)=>a+(b-mean)**2,0)/n);
  return { min:s[0], max:s[n-1], mean:+mean.toFixed(2), std:+std.toFixed(2),
    median: n%2===0?(s[n/2-1]+s[n/2])/2:s[Math.floor(n/2)], count:n };
}
function makeBins(arr, n=15) {
  const v = arr.filter(x => !isNaN(x) && isFinite(x));
  if (!v.length) return { labels:[], counts:[], kdeY:[] };
  const mn=Math.min(...v), mx=Math.max(...v), sz=(mx-mn||1)/n;
  const labels = Array.from({length:n}, (_,i) => `${(mn+i*sz).toFixed(0)}`);
  const counts = Array(n).fill(0);
  v.forEach(x => { const i=Math.min(Math.floor((x-mn)/sz),n-1); counts[i]++; });
  const bw = 1.06*(stats(v).std||1)*Math.pow(v.length,-0.2);
  const kdeX = Array.from({length:n}, (_,i) => mn+i*sz+sz/2);
  const kdeY = kdeX.map(xi => {
    const sum = v.reduce((s,x2) => s+Math.exp(-0.5*((xi-x2)/bw)**2), 0);
    return +((sum/(v.length*bw*Math.sqrt(2*Math.PI)))*(v.length*sz)).toFixed(2);
  });
  return { labels, counts, kdeY };
}
function corrCoeff(x, y) {
  const n = Math.min(x.length,y.length); if(n<2) return 0;
  const vx=x.slice(0,n), vy=y.slice(0,n);
  const mx=vx.reduce((a,b)=>a+b,0)/n, my=vy.reduce((a,b)=>a+b,0)/n;
  const num=vx.reduce((s,v,i)=>s+(v-mx)*(vy[i]-my),0);
  const den=Math.sqrt(vx.reduce((s,v)=>s+(v-mx)**2,0)*vy.reduce((s,v)=>s+(v-my)**2,0));
  return den===0?0:+(num/den).toFixed(3);
}
function linReg(x, y) {
  const n=x.length; if(n<2) return {m:0,b:0};
  const mx=x.reduce((a,b)=>a+b,0)/n, my=y.reduce((a,b)=>a+b,0)/n;
  const num=x.reduce((s,v,i)=>s+(v-mx)*(y[i]-my),0);
  const den=x.reduce((s,v)=>s+(v-mx)**2,0);
  const m=den===0?0:num/den;
  return { m:+m.toFixed(4), b:+(my-m*mx).toFixed(4) };
}
function countByVal(rows, hdr, idx) {
  if (idx===-1||!hdr[idx]) return {};
  const map={};
  rows.forEach(r=>{ const v=String(r[hdr[idx]]||"?"); map[v]=(map[v]||0)+1; });
  return map;
}
function violinPoints(rows, hdr, groupIdx, valIdx, groupVal) {
  return rows
    .filter(r => String(r[hdr[groupIdx]]) === String(groupVal))
    .map(r => parseFloat(r[hdr[valIdx]]))
    .filter(x => !isNaN(x));
}
function violinStats(arr) {
  if (!arr.length) return null;
  const s=[...arr].sort((a,b)=>a-b); const n=s.length;
  const q1=s[Math.floor(n*0.25)], q3=s[Math.floor(n*0.75)];
  const med=n%2===0?(s[n/2-1]+s[n/2])/2:s[Math.floor(n/2)];
  const mean=arr.reduce((a,b)=>a+b,0)/n;
  const iqr=q3-q1;
  return { q1, q3, med:+med.toFixed(1), mean:+mean.toFixed(1), iqr:+iqr.toFixed(1), n,
    lo:+(Math.max(s[0],q1-1.5*iqr)).toFixed(1), hi:+(Math.min(s[n-1],q3+1.5*iqr)).toFixed(1) };
}

// Label maps
const CP_LBL  = {"0":"Typical Angina","1":"Atypical Angina","2":"Non-Anginal","3":"Asymptomatic"};
const SEX_LBL = {"0":"Female","1":"Male"};
const OUT_LBL = {"0":"No Disease","1":"Disease"};
const ECG_LBL = {"0":"Normal","1":"ST Abnormality","2":"LV Hypertrophy"};
const SLP_LBL = {"0":"Up-sloping","1":"Flat","2":"Down-sloping"};

const PAL = ["#6366f1","#e05252","#22c55e","#f97316","#a855f7","#14b8a6","#f59e0b","#ec4899","#3b82f6","#84cc16"];
const GC  = "rgba(0,0,0,0.055)";
const TF  = { size:11 };

const NUM_FEATURES = ["age","trtbps","chol","thalachh","oldpeak"];
const NUM_LABELS   = ["Age","Resting BP","Cholesterol","Max HR","ST Dep"];

function corrColor(v) {
  if (isNaN(v)) return "#e5e7eb";
  const a = (Math.abs(v)*0.85+0.1).toFixed(2);
  return v>0 ? `rgba(224,82,82,${a})` : `rgba(59,130,246,${a})`;
}

export default function VitalsPage() {
  const { rows, hdr, cols, loaded, fname } = useData();
  const [mounted,  setMounted]  = useState(false);
  const [binCount, setBinCount] = useState(15);
  const [showKDE,  setShowKDE]  = useState(true);
  const [showRug,  setShowRug]  = useState(false);
  const [jpX,      setJpX]      = useState("age");
  const [jpY,      setJpY]      = useState("thalachh");
  const [jpKind,   setJpKind]   = useState("scatter");

  useEffect(() => { setMounted(true); }, []);

  // ── Core data arrays ────────────────────────────────────────────────────────
  const age      = useMemo(()=>numArr(rows,hdr,cols.age),      [rows,hdr,cols]);
  const trtbps   = useMemo(()=>numArr(rows,hdr,cols.trtbps),   [rows,hdr,cols]);
  const chol     = useMemo(()=>numArr(rows,hdr,cols.chol),     [rows,hdr,cols]);
  const thalachh = useMemo(()=>numArr(rows,hdr,cols.thalachh), [rows,hdr,cols]);
  const oldpeak  = useMemo(()=>numArr(rows,hdr,cols.oldpeak),  [rows,hdr,cols]);

  const ageSt    = useMemo(()=>stats(age),      [age]);
  const bpSt     = useMemo(()=>stats(trtbps),   [trtbps]);
  const cholSt   = useMemo(()=>stats(chol),     [chol]);
  const hrSt     = useMemo(()=>stats(thalachh), [thalachh]);

  const diseaseRows   = useMemo(()=>rows.filter(r=>String(r[hdr[cols.output]])==="1"), [rows,hdr,cols]);
  const noDiseaseRows = useMemo(()=>rows.filter(r=>String(r[hdr[cols.output]])==="0"), [rows,hdr,cols]);
  const maleRows      = useMemo(()=>rows.filter(r=>String(r[hdr[cols.sex]])==="1"),    [rows,hdr,cols]);
  const femaleRows    = useMemo(()=>rows.filter(r=>String(r[hdr[cols.sex]])==="0"),    [rows,hdr,cols]);

  const diseasePct = rows.length ? ((diseaseRows.length/rows.length)*100).toFixed(1) : 0;

  // ── CHART 1: Distplot ──────────────────────────────────────────────────────
  const distData = useMemo(()=>makeBins(age,binCount), [age,binCount]);
  const c1 = useMemo(()=>({
    labels: distData.labels,
    datasets: [
      { type:"bar",  label:"Frequency", data:distData.counts, backgroundColor:"rgba(99,102,241,0.55)", borderColor:"#6366f1", borderWidth:1, borderRadius:3, order:2 },
      ...(showKDE?[{ type:"line", label:"KDE", data:distData.kdeY, borderColor:"#e05252", backgroundColor:"rgba(224,82,82,0.06)", borderWidth:2.5, pointRadius:0, tension:0.4, fill:true, order:1 }]:[]),
    ]
  }),[distData,showKDE]);
  const o1 = { responsive:true, maintainAspectRatio:false,
    plugins:{legend:{position:"top",labels:{font:TF,boxWidth:12,boxHeight:12}}},
    scales:{ x:{title:{display:true,text:"Age",font:TF},ticks:{font:{size:10}},grid:{display:false}},
             y:{title:{display:true,text:"Count",font:TF},ticks:{font:TF},grid:{color:GC}} }};

  // ── CHART 2: Pie charts ────────────────────────────────────────────────────
  const pieConfigs = useMemo(()=>{
    if (!loaded) return [];
    const make=(idx,lblMap,title)=>{
      if (idx===-1||!hdr[idx]) return null;
      const map=countByVal(rows,hdr,idx);
      const entries=Object.entries(map).sort((a,b)=>b[1]-a[1]);
      return { title, labels:entries.map(([k])=>lblMap[k]||k), data:entries.map(([,v])=>v) };
    };
    return [
      make(cols.sex,     SEX_LBL, "Sex distribution"),
      make(cols.cp,      CP_LBL,  "Chest pain type"),
      make(cols.restecg, ECG_LBL, "Resting ECG"),
      make(cols.slp,     SLP_LBL, "ST Slope"),
      make(cols.output,  OUT_LBL, "Heart disease"),
    ].filter(Boolean);
  },[rows,hdr,cols,loaded]);

  // ── CHART 3: Correlation heatmap ───────────────────────────────────────────
  const corrMatrix = useMemo(()=>{
    if (!loaded) return { features:[], matrix:[] };
    const features = NUM_FEATURES.filter(f=>cols[f]!==-1&&cols[f]!==undefined&&hdr[cols[f]]);
    const labels   = features.map(f=>NUM_LABELS[NUM_FEATURES.indexOf(f)]);
    const arrs     = features.map(f=>numArr(rows,hdr,cols[f]));
    const matrix   = features.map((_,i)=>features.map((_,j)=>corrCoeff(arrs[i],arrs[j])));
    return { features:labels, matrix };
  },[rows,hdr,cols,loaded]);

  // ── CHART 4: Violin plots ──────────────────────────────────────────────────
  const violinData = useMemo(()=>{
    if (!loaded) return [];
    return [
      { title:"Age by disease status",    groupCol:cols.output, valCol:cols.age,      groups:["0","1"], groupLabels:["No Disease","Disease"],  yLabel:"Age (yrs)" },
      { title:"Max HR by disease status", groupCol:cols.output, valCol:cols.thalachh, groups:["0","1"], groupLabels:["No Disease","Disease"],  yLabel:"Max HR (bpm)" },
      { title:"Cholesterol by disease",   groupCol:cols.output, valCol:cols.chol,     groups:["0","1"], groupLabels:["No Disease","Disease"],  yLabel:"Cholesterol (mg/dl)" },
    ].map(p=>({ ...p, vstats: p.groups.map(g=>violinStats(violinPoints(rows,hdr,p.groupCol,p.valCol,g))) }));
  },[rows,hdr,cols,loaded]);

  // ── CHART 5/6: Joint plot ──────────────────────────────────────────────────
  const featArrays = useMemo(()=>({
    age, trtbps, chol, thalachh, oldpeak
  }),[age,trtbps,chol,thalachh,oldpeak]);

  const jointData = useMemo(()=>{
    if (!loaded) return null;
    const xi=cols[jpX], yi=cols[jpY];
    if (xi===-1||yi===-1||!hdr[xi]||!hdr[yi]) return null;
    const xArr=numArr(rows,hdr,xi), yArr=numArr(rows,hdr,yi);
    const outArr=numArrAll(rows,hdr,cols.output);
    const pairs=xArr.map((x,i)=>({x,y:yArr[i],out:outArr[i]})).filter(p=>!isNaN(p.x)&&!isNaN(p.y));
    const pureX=pairs.map(p=>p.x), pureY=pairs.map(p=>p.y);
    const reg=linReg(pureX,pureY);
    const xSt=stats(pureX), ySt=stats(pureY);
    const r=corrCoeff(pureX,pureY);
    const regLine=[{x:xSt.min,y:reg.m*xSt.min+reg.b},{x:xSt.max,y:reg.m*xSt.max+reg.b}];
    const xLabel=NUM_LABELS[NUM_FEATURES.indexOf(jpX)]||jpX;
    const yLabel=NUM_LABELS[NUM_FEATURES.indexOf(jpY)]||jpY;
    // hex grid
    const COLS=16,ROWS=16;
    const grid=Array.from({length:COLS},()=>Array(ROWS).fill(0));
    pairs.forEach(p=>{
      const ci=Math.min(Math.floor((p.x-xSt.min)/(xSt.max-xSt.min+1e-9)*COLS),COLS-1);
      const ri=Math.min(Math.floor((p.y-ySt.min)/(ySt.max-ySt.min+1e-9)*ROWS),ROWS-1);
      grid[ci][ri]++;
    });
    const maxC=Math.max(...grid.flat())||1;
    const hexGrid=[];
    for(let c=0;c<COLS;c++) for(let r=0;r<ROWS;r++)
      if(grid[c][r]>0) hexGrid.push({x:xSt.min+c*(xSt.max-xSt.min)/COLS, y:ySt.min+r*(ySt.max-ySt.min)/ROWS, op:+(0.15+0.85*(grid[c][r]/maxC)).toFixed(2)});
    return { pairs, reg, regLine, r, xSt, ySt, hexGrid, xLabel, yLabel };
  },[rows,hdr,cols,jpX,jpY,loaded]);

  const jointChartData = useMemo(()=>{
    if (!jointData) return null;
    if (jpKind==="hex") return { datasets:[{ label:"Density", data:jointData.hexGrid.map(p=>({x:p.x,y:p.y})), backgroundColor:jointData.hexGrid.map(p=>`rgba(99,102,241,${p.op})`), pointRadius:9, pointStyle:"rect" }]};
    const diseaseP = jointData.pairs.filter(p=>p.out===1).map(p=>({x:p.x,y:p.y}));
    const noDisP   = jointData.pairs.filter(p=>p.out===0).map(p=>({x:p.x,y:p.y}));
    const ds = [
      { label:"Disease",    data:diseaseP, backgroundColor:"rgba(224,82,82,0.6)",  pointRadius:3, pointHoverRadius:5 },
      { label:"No Disease", data:noDisP,   backgroundColor:"rgba(34,197,94,0.55)", pointRadius:3, pointHoverRadius:5 },
    ];
    if (jpKind==="reg") ds.push({ type:"line", label:`OLS (r=${jointData.r})`, data:jointData.regLine, borderColor:"#f97316", borderWidth:2.5, borderDash:[6,3], pointRadius:0, tension:0 });
    return { datasets:ds };
  },[jointData,jpKind]);

  const jointOpts = useMemo(()=>{
    if (!jointData) return {};
    return { responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{position:"top",labels:{font:TF,boxWidth:11,boxHeight:11}} },
      scales:{
        x:{title:{display:true,text:jointData.xLabel,font:TF},ticks:{font:TF},grid:{color:GC}},
        y:{title:{display:true,text:jointData.yLabel,font:TF},ticks:{font:TF},grid:{color:GC}},
      }};
  },[jointData]);

  // ── CHART 7: Pair plot ─────────────────────────────────────────────────────
  const pairPlot = useMemo(()=>{
    if (!loaded) return { cells:[], n:0, labels:[] };
    const features = NUM_FEATURES.filter(f=>cols[f]!==-1&&cols[f]!==undefined&&hdr[cols[f]]);
    const labels   = features.map(f=>NUM_LABELS[NUM_FEATURES.indexOf(f)]);
    const arrs     = features.map(f=>numArr(rows,hdr,cols[f]));
    const outArr   = numArrAll(rows,hdr,cols.output);
    const n        = features.length;
    const cells    = [];
    for (let i=0;i<n;i++) for (let j=0;j<n;j++) {
      if (i===j) {
        const b=makeBins(arrs[i],8);
        cells.push({ type:"hist", row:i, col:j, labels:b.labels, counts:b.counts, label:labels[i] });
      } else {
        const r=corrCoeff(arrs[j],arrs[i]);
        const diseaseP=arrs[j].map((x,k)=>({x,y:arrs[i][k]})).filter((_,k)=>outArr[k]===1&&!isNaN(arrs[j][k])&&!isNaN(arrs[i][k]));
        const noDisP  =arrs[j].map((x,k)=>({x,y:arrs[i][k]})).filter((_,k)=>outArr[k]===0&&!isNaN(arrs[j][k])&&!isNaN(arrs[i][k]));
        cells.push({ type:"scatter", row:i, col:j, diseaseP, noDisP, r });
      }
    }
    return { cells, n, labels };
  },[rows,hdr,cols,loaded]);

  const zeroChol = useMemo(()=>rows.filter(r=>parseFloat(r[hdr[cols.chol]])===0).length,[rows,hdr,cols]);

  const availFeats = NUM_FEATURES.filter(f=>cols[f]!==-1&&cols[f]!==undefined&&hdr[cols[f]]);

  return (
    <div className={styles.page}>
      <Nav/>

      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <span className={styles.badge}>Heart Failure EDA · 7 Chart Types</span>
          <h1 className={styles.title}>Heart Disease — Exploratory Data Analysis</h1>
          <p className={styles.sub}>
            Seaborn pipeline rebuilt in Chart.js:&nbsp;
            <strong>Distplot · Pie · Correlation Heatmap · Violin · Joint Plot · OLS Regression · Pair Plot</strong>
          </p>
        </div>
      </header>

      <main className={styles.main}>

        <UploadBar/>

        {!loaded && (
          <div className={styles.emptyState}>
            <p>📊 Click <strong>⚡ Load heart.csv instantly</strong> above to see all 7 chart types — no upload needed.</p>
          </div>
        )}

        {loaded && mounted && (
          <>
            {/* Status pills */}
            <div className={styles.pills}>
              <span className={styles.pill} style={{background:"#ede9fe",color:"#5b21b6"}}>{rows.length} patients</span>
              <span className={styles.pill} style={{background:"#fef2f2",color:"#991b1b"}}>{diseaseRows.length} disease ({diseasePct}%)</span>
              <span className={styles.pill} style={{background:"#f0fdf4",color:"#14532d"}}>{noDiseaseRows.length} no disease</span>
              <span className={styles.pill} style={{background:"#f8fafc",color:"#475569"}}>{fname}</span>
              <Link href="/analysis" className={styles.pillLink}>🔬 View full statistical analysis →</Link>
            </div>

            {/* ══ CHART TYPE 1: DISTPLOT ══════════════════════════════════════ */}
            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <div>
                  <span className={styles.chartType}>Chart Type 1 · Distplot</span>
                  <h2 className={styles.sectionTitle}>Univariate distribution — Age</h2>
                  <p className={styles.sectionDesc}>Histogram with KDE overlay. ~90% of patients are aged 40–70. Adjust bins, toggle KDE smoothing and rug plot.</p>
                </div>
                <div className={styles.controls}>
                  <label className={styles.ctrl}>Bins: <strong>{binCount}</strong>
                    <input type="range" min={5} max={30} step={1} value={binCount} onChange={e=>setBinCount(+e.target.value)} className={styles.slider}/>
                  </label>
                  <label className={styles.ctrlCheck}><input type="checkbox" checked={showKDE} onChange={e=>setShowKDE(e.target.checked)}/> KDE</label>
                  <label className={styles.ctrlCheck}><input type="checkbox" checked={showRug} onChange={e=>setShowRug(e.target.checked)}/> Rug</label>
                </div>
              </div>
              <div className={styles.cardWide}>
                <div style={{position:"relative",height:270}}><Bar data={c1} options={o1}/></div>
                {showRug&&(
                  <div className={styles.rug}>
                    {age.map((v,i)=>(
                      <div key={i} className={styles.rugTick} style={{left:`${((v-ageSt.min)/(ageSt.max-ageSt.min||1))*100}%`}}/>
                    ))}
                  </div>
                )}
                <div className={styles.statRow}>
                  {[["Min",ageSt.min,"yrs"],["Max",ageSt.max,"yrs"],["Mean",ageSt.mean,"yrs"],["Median",ageSt.median,"yrs"],["Std",ageSt.std,""]].map(([l,v,u])=>(
                    <div key={l} className={styles.mini}><span className={styles.miniL}>{l}</span><span className={styles.miniV}>{v}<em>{u}</em></span></div>
                  ))}
                </div>
              </div>
            </section>

            {/* ══ CHART TYPE 2: PIE CHARTS ═══════════════════════════════════ */}
            <section className={styles.section}>
              <span className={styles.chartType}>Chart Type 2 · Pie Charts</span>
              <h2 className={styles.sectionTitle}>Categorical proportionality</h2>
              <p className={styles.sectionDesc}>Sex imbalance: {maleRows.length} male vs {femaleRows.length} female. Disease prevalence: {diseasePct}% positive cases.</p>
              <div className={styles.pieGrid}>
                {pieConfigs.map(pc=>(
                  <div key={pc.title} className={styles.pieCard}>
                    <p className={styles.pieTitle}>{pc.title}</p>
                    <div style={{position:"relative",height:175}}>
                      <Pie
                        data={{labels:pc.labels,datasets:[{data:pc.data,backgroundColor:PAL.slice(0,pc.data.length),borderWidth:3,borderColor:"#fff"}]}}
                        options={{responsive:true,maintainAspectRatio:false,
                          plugins:{legend:{position:"bottom",labels:{font:{size:9},padding:6,boxWidth:10,boxHeight:10}},
                          tooltip:{callbacks:{label:c=>` ${c.label}: ${c.raw} (${((c.raw/rows.length)*100).toFixed(1)}%)`}}}}}/>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* ══ CHART TYPE 3: CORRELATION HEATMAP ═════════════════════════ */}
            <section className={styles.section}>
              <span className={styles.chartType}>Chart Type 3 · Heatmap</span>
              <h2 className={styles.sectionTitle}>Statistical correlation matrix</h2>
              <p className={styles.sectionDesc}>
                Notable: Age ↔ Max HR = <strong style={{color:"#3b82f6"}}>{corrMatrix.matrix[0]?.[3]?.toFixed(3)||"–"}</strong> (negative inverse).
                Age ↔ Resting BP = <strong style={{color:"#e05252"}}>{corrMatrix.matrix[0]?.[1]?.toFixed(3)||"–"}</strong> (positive).
                No coefficient &gt; ±0.7 — multi-factor disease complexity confirmed.
              </p>
              <div className={styles.cardWide}>
                <div className={styles.heatmap}>
                  {corrMatrix.features.map((rowLabel,i)=>(
                    <div key={i} className={styles.heatmapRow}>
                      <span className={styles.heatmapLabel}>{rowLabel}</span>
                      {corrMatrix.matrix[i]?.map((v,j)=>(
                        <div key={j} className={styles.heatmapCell} style={{background:corrColor(v)}}>
                          <span className={styles.heatmapVal}>{v.toFixed(2)}</span>
                          <span className={styles.heatmapSub}>{corrMatrix.features[j]}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div className={styles.heatmapLegend}>
                  <div className={styles.heatmapLegendBar}/>
                  <div className={styles.heatmapLegendLabels}><span>−1.0 Negative</span><span>0</span><span>+1.0 Positive</span></div>
                </div>
              </div>
            </section>

            {/* ══ CHART TYPE 4: VIOLIN PLOTS ════════════════════════════════ */}
            <section className={styles.section}>
              <span className={styles.chartType}>Chart Type 4 · Violin Plots</span>
              <h2 className={styles.sectionTitle}>Multivariate distribution by category</h2>
              <p className={styles.sectionDesc}>
                Q1 / Median / Q3 per group — shows distribution shift between disease and no-disease cohorts.
                {zeroChol>0&&<> <span style={{color:"#dc2626"}}>⚠ {zeroChol} zero-cholesterol records flagged as data quality issue (likely missing values encoded as 0).</span></>}
              </p>
              <div className={styles.violinGrid}>
                {violinData.map((vp,vi)=>{
                  const bData={
                    labels:vp.groupLabels,
                    datasets:[
                      {label:"Q3 (75th pct)",  data:vp.vstats.map(s=>s?.q3||0),  backgroundColor:["rgba(99,102,241,0.25)","rgba(224,82,82,0.25)"], borderRadius:4, borderWidth:0},
                      {label:"Median",          data:vp.vstats.map(s=>s?.med||0), backgroundColor:["rgba(99,102,241,0.85)","rgba(224,82,82,0.85)"], borderRadius:4, borderWidth:0},
                      {label:"Q1 (25th pct)",  data:vp.vstats.map(s=>s?.q1||0),  backgroundColor:["rgba(99,102,241,0.45)","rgba(224,82,82,0.45)"], borderRadius:4, borderWidth:0},
                    ]};
                  const bOpts={responsive:true,maintainAspectRatio:false,
                    plugins:{legend:{position:"top",labels:{font:{size:10},boxWidth:10,boxHeight:10,padding:8}}},
                    scales:{x:{ticks:{font:{size:11}},grid:{display:false}},y:{title:{display:true,text:vp.yLabel,font:TF},ticks:{font:TF},grid:{color:GC}}}};
                  return (
                    <div key={vi} className={styles.violinCard}>
                      <p className={styles.violinTitle}>{vp.title}</p>
                      <div style={{position:"relative",height:230}}><Bar data={bData} options={bOpts}/></div>
                      <div className={styles.violinStats}>
                        {vp.vstats.map((s,si)=>s&&(
                          <div key={si} className={styles.violinStat}>
                            <strong>{vp.groupLabels[si]}</strong>
                            <span>n={s.n} · median={s.med} · IQR={s.iqr} · range [{s.lo}–{s.hi}]</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ══ CHART TYPE 5+6: JOINT PLOT + REGRESSION ═══════════════════ */}
            <section className={styles.section}>
              <span className={styles.chartType}>Chart Type 5 · Joint Plot &nbsp;|&nbsp; Chart Type 6 · Regression</span>
              <h2 className={styles.sectionTitle}>Bivariate relationship + OLS regression line</h2>
              <p className={styles.sectionDesc}>Select any two numeric features. Switch modes: Scatter · Hex density · Regression (OLS best-fit line with equation).</p>
              <div className={styles.jointControls}>
                <label className={styles.ctrl}>X:
                  <select value={jpX} onChange={e=>setJpX(e.target.value)} className={styles.sel}>
                    {availFeats.map(f=><option key={f} value={f}>{NUM_LABELS[NUM_FEATURES.indexOf(f)]}</option>)}
                  </select>
                </label>
                <label className={styles.ctrl}>Y:
                  <select value={jpY} onChange={e=>setJpY(e.target.value)} className={styles.sel}>
                    {availFeats.map(f=><option key={f} value={f}>{NUM_LABELS[NUM_FEATURES.indexOf(f)]}</option>)}
                  </select>
                </label>
                <div className={styles.kindBtns}>
                  {[["scatter","Scatter"],["hex","Hex density"],["reg","Regression (OLS)"]].map(([k,l])=>(
                    <button key={k} className={`${styles.kindBtn} ${jpKind===k?styles.kindActive:""}`} onClick={()=>setJpKind(k)}>{l}</button>
                  ))}
                </div>
              </div>
              {jointData&&jointChartData&&(
                <div className={styles.jointLayout}>
                  <div className={styles.jointMain}>
                    <div style={{position:"relative",height:320}}><Scatter data={jointChartData} options={jointOpts}/></div>
                    {jpKind==="reg"&&(
                      <div className={styles.regNote}>
                        OLS: <strong>y = {jointData.reg.m}x + {jointData.reg.b}</strong> &nbsp;|&nbsp; Pearson r = <strong style={{color:Math.abs(jointData.r)>0.4?"#e05252":"#22c55e"}}>{jointData.r}</strong>
                        &nbsp;— {Math.abs(jointData.r)>0.5?"Strong":Math.abs(jointData.r)>0.3?"Moderate":"Weak"} {jointData.r<0?"negative":"positive"} correlation
                      </div>
                    )}
                  </div>
                  <div className={styles.jointMarginals}>
                    {[{arr:jointData.pairs.map(p=>p.x),label:jointData.xLabel,color:"rgba(99,102,241,0.6)"},
                      {arr:jointData.pairs.map(p=>p.y),label:jointData.yLabel,color:"rgba(224,82,82,0.6)"}].map(m=>{
                      const b=makeBins(m.arr,10);
                      return (
                        <div key={m.label} className={styles.marginalCard}>
                          <p className={styles.marginalTitle}>{m.label} distribution</p>
                          <div style={{position:"relative",height:120}}>
                            <Bar data={{labels:b.labels,datasets:[{data:b.counts,backgroundColor:m.color,borderRadius:3,borderWidth:0}]}}
                              options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{maxTicksLimit:5,font:{size:9}},grid:{display:false}},y:{ticks:{font:{size:9}},grid:{color:GC}}}}}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>

            {/* ══ CHART TYPE 7: PAIR PLOT ════════════════════════════════════ */}
            <section className={styles.section}>
              <span className={styles.chartType}>Chart Type 7 · Pair Plot</span>
              <h2 className={styles.sectionTitle}>Exhaustive feature pairing — {pairPlot.n}×{pairPlot.n} grid ({pairPlot.n*pairPlot.n} charts)</h2>
              <p className={styles.sectionDesc}>Diagonal = univariate histogram. Off-diagonal = scatter coloured by disease status with Pearson r. Negative slope in Age × Max HR confirms the inverse relationship.</p>
              <div className={styles.cardWide}>
                {/* Column headers */}
                <div className={styles.pairHeaderRow} style={{gridTemplateColumns:`80px repeat(${pairPlot.n},1fr)`}}>
                  <div/>
                  {pairPlot.labels.map(l=><div key={l} className={styles.pairHeader}>{l}</div>)}
                </div>
                <div className={styles.pairGrid} style={{gridTemplateColumns:`80px repeat(${pairPlot.n},1fr)`}}>
                  {pairPlot.cells.map((cell,ci)=>{
                    const isFirst = cell.col===0;
                    return (
                      <>{isFirst&&<div key={`lbl-${ci}`} className={styles.pairRowLabel}>{pairPlot.labels[cell.row]}</div>}
                      <div key={ci} className={styles.pairCell} style={{background:cell.type==="hist"?"#f5f3ff":"#fff"}}>
                        {cell.type==="hist"?(
                          <>
                            <p className={styles.pairDiagLabel}>{cell.label}</p>
                            <div style={{position:"relative",height:90}}>
                              <Bar data={{labels:cell.labels,datasets:[{data:cell.counts,backgroundColor:"rgba(99,102,241,0.7)",borderWidth:0,borderRadius:2}]}}
                                options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{enabled:false}},scales:{x:{display:false},y:{display:false}}}}/>
                            </div>
                          </>
                        ):(
                          <>
                            <p className={styles.pairCorr} style={{color:Math.abs(cell.r)>0.4?"#e05252":Math.abs(cell.r)>0.2?"#f59e0b":"#94a3b8"}}>r={cell.r}</p>
                            <div style={{position:"relative",height:90}}>
                              <Scatter
                                data={{datasets:[
                                  {label:"Disease",data:cell.diseaseP,backgroundColor:"rgba(224,82,82,0.5)",pointRadius:1.5},
                                  {label:"No Dis.", data:cell.noDisP, backgroundColor:"rgba(34,197,94,0.45)",pointRadius:1.5},
                                ]}}
                                options={{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{enabled:false}},scales:{x:{display:false},y:{display:false}}}}/>
                            </div>
                          </>
                        )}
                      </div></>
                    );
                  })}
                </div>
                <div className={styles.pairLegend}>
                  <span><span className={styles.dot} style={{background:"rgba(224,82,82,0.8)"}}/>Disease</span>
                  <span style={{marginLeft:14}}><span className={styles.dot} style={{background:"rgba(34,197,94,0.8)"}}/>No Disease</span>
                  <span style={{marginLeft:14,color:"#94a3b8",fontSize:".72rem"}}>Diagonal = histogram · Off-diagonal = scatter with Pearson r</span>
                </div>
              </div>
            </section>

          </>
        )}
      </main>
    </div>
  );
}
