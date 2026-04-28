"use client";
import { useRef, useState } from "react";
import Papa from "papaparse";
import Link from "next/link";
import Nav from "../../components/Nav";
import styles from "./fakejobs.module.css";

// ── Tutorial steps — full Jupyter notebook style ───────────────────────────
const STEPS = [
  {
    n: "01",
    title: "Data Ingestion & Path Setup",
    icon: "📂",
    tag: "Data Loading",
    theory: "The first step in any EDA pipeline is establishing a robust data ingestion process. We define the file path, load the CSV into a DataFrame, and perform an initial structural audit to validate data volume and header alignment against our data dictionary.",
    code: `import pandas as pd

# Define path to the dataset
path = "/kaggle/input/fake-job-postings/fake_job_postings.csv"

# Load into DataFrame
df = pd.read_csv(path)

# Initial structural audit
print(f"Shape: {df.shape}")
print(f"Columns: {list(df.columns)}")
df.head()`,
    outputType: "schema",
    insight: "Confirms dataset is correctly loaded. The .shape reveals total observations and feature count. .head() provides a snapshot of the first 5 records for preliminary header validation.",
  },
  {
    n: "02",
    title: "Schema Validation & Dimensionality Audit",
    icon: "🔍",
    tag: "Inspection",
    theory: "Before any analysis, we perform a schema audit to verify column data types, check for nulls, and confirm the record count matches our data dictionary. This ensures pipeline integrity before downstream processing.",
    code: `# Dimensionality audit
print(f"Total Records: {len(df)}")
print(f"Total Features: {df.shape[1]}")

# Data types and null check
df.info()

# Missing value summary
missing = df.isnull().sum()
missing[missing > 0].sort_values(ascending=False)`,
    outputType: "info",
    insight: "Identifies columns with missing data early. Any column with >30% nulls should be flagged for imputation or exclusion. This prevents silent errors in downstream charts and models.",
  },
  {
    n: "03",
    title: "Salary Distribution Analysis",
    icon: "💰",
    tag: "Univariate Analysis",
    theory: "Analyzing salary ranges is the cornerstone of job market EDA. We separate salary_in_range into min/max components and compute descriptive statistics. This establishes the compensation baseline across the dataset.",
    code: `# Parse salary range column
df[['salary_min','salary_max']] = df['salary_range'].str.split('-', expand=True).astype(float)

# Descriptive statistics
print(df[['salary_min','salary_max']].describe())

# Average salary per job type
df.groupby('employment_type')[['salary_min','salary_max']].mean().round(0)`,
    outputType: "salary",
    insight: "Reveals compensation spread and identifies outlier roles (e.g., remote executive positions). Average salaries by employment type expose structural pay differences between Full-time, Part-time, and Contract roles.",
  },
  {
    n: "04",
    title: "Location & Geographic Distribution",
    icon: "📍",
    tag: "Categorical Analysis",
    theory: "Geographic distribution analysis identifies where job demand is concentrated. High-frequency locations indicate job market hubs. This is critical for workforce planning and understanding regional talent gaps.",
    code: `# Top 10 locations by job count
top_locations = df['location'].value_counts().head(10)
print(top_locations)

# Plot location distribution
import matplotlib.pyplot as plt
top_locations.plot(kind='barh', figsize=(10,6), color='steelblue')
plt.title('Top 10 Job Locations')
plt.xlabel('Job Count')
plt.tight_layout()
plt.show()`,
    outputType: "location",
    insight: "Identifies hiring hotspots. Locations with disproportionately high counts may indicate tech hubs or cities with high startup density. Remote entries in location reveal the rise of distributed work.",
  },
  {
    n: "05",
    title: "Job Type & Employment Distribution",
    icon: "📊",
    tag: "Proportional Analysis",
    theory: "Pie charts are the optimal visualization for categorical data with low cardinality (< 8 categories). They reveal structural imbalances in employment type proportions — critical for understanding market composition.",
    code: `# Employment type distribution
emp_dist = df['employment_type'].value_counts()
print(emp_dist)
print(f"\\nProportions:\\n{(emp_dist/len(df)*100).round(1)}%")

# Pie chart visualization
emp_dist.plot(kind='pie', autopct='%1.1f%%', figsize=(8,8))
plt.title('Employment Type Distribution')
plt.ylabel('')
plt.show()`,
    outputType: "type",
    insight: "Full-time roles typically dominate at 70%+. High part-time or contract proportions may indicate economic instability or gig-economy trends in the dataset's time period.",
  },
  {
    n: "06",
    title: "Industry & Sector Analysis",
    icon: "🏭",
    tag: "Bivariate Analysis",
    theory: "Industry-level analysis reveals which sectors are most active in hiring and which offer the highest compensation. Cross-referencing industry with salary exposes compensation tiers and helps identify high-value career paths.",
    code: `# Top industries by job volume
top_industries = df['industry'].value_counts().head(8)

# Average max salary by industry
avg_sal_industry = df.groupby('industry')['salary_max'].mean().sort_values(ascending=False).head(8)
print(avg_sal_industry.round(0))

# Seaborn bar plot
import seaborn as sns
sns.barplot(x=avg_sal_industry.values, y=avg_sal_industry.index, palette='viridis')
plt.title('Avg Max Salary by Industry (Top 8)')
plt.xlabel('Average Max Salary ($)')
plt.tight_layout()`,
    outputType: "industry",
    insight: "Technology and Finance sectors consistently show higher max salaries. Industries with high job volume but low salaries (e.g., Retail, Hospitality) indicate competitive but low-compensation markets.",
  },
  {
    n: "07",
    title: "Experience Level & Seniority Insights",
    icon: "🎓",
    tag: "Segmentation Analysis",
    theory: "Segmenting jobs by experience level reveals market demand structure. A Junior-heavy market signals entry-level accessibility; Senior-heavy markets indicate talent scarcity and higher compensation requirements.",
    code: `# Experience level distribution
exp_dist = df['required_experience'].value_counts()
print(exp_dist)

# Salary by experience level — violin plot
sns.violinplot(data=df, x='required_experience', y='salary_max', palette='Set2')
plt.title('Salary Distribution by Experience Level')
plt.xticks(rotation=45)
plt.tight_layout()
plt.show()

# Average salary per level
df.groupby('required_experience')['salary_max'].mean().sort_values(ascending=False).round(0)`,
    outputType: "experience",
    insight: "Senior roles command a 40–60% salary premium over Mid-level, and 80–120% over Junior. Visualizing the full distribution (not just mean) via violin plot reveals whether salary ranges overlap between levels.",
  },
  {
    n: "08",
    title: "Interactive Charts Dashboard",
    icon: "📈",
    tag: "Visualization",
    theory: "The final step synthesizes all prior analyses into an interactive Chart.js dashboard. Each chart updates dynamically when you upload your own CSV. The dashboard mirrors the complete Seaborn/Matplotlib pipeline in a browser-native format.",
    code: `# All 6 visualizations are now live in the dashboard:
# 1. Jobs by Location (Bar)       — replaces barh location plot
# 2. Job Type Distribution (Pie)  — replaces pie autopct chart
# 3. Avg Salary by Industry (Bar) — replaces seaborn barplot
# 4. Experience Level (Bar)       — replaces value_counts bar
# 5. Remote Distribution (Donut)  — new: work arrangement split
# 6. Salary Range by Industry (Line) — replaces violin salary bands

# Upload your CSV → all charts refresh live
# Click the button below to open the dashboard →`,
    outputType: "dashboard",
    insight: "The Chart.js dashboard provides interactivity that static Matplotlib/Seaborn charts cannot: hover tooltips, live CSV refresh, and responsive mobile layout. This is the production-ready equivalent of the notebook analysis.",
  },
];

// ── helpers ────────────────────────────────────────────────────────────────
function detectJobCols(headers) {
  const low = headers.map(h=>h.toLowerCase().trim());
  return {
    titleIdx:    low.findIndex(h=>["job_title","title","position","role"].some(k=>h.includes(k))),
    locationIdx: low.findIndex(h=>["location","city","place","region"].some(k=>h.includes(k))),
    salMinIdx:   low.findIndex(h=>["salary_min","min_salary","sal_min"].some(k=>h.includes(k))),
    salMaxIdx:   low.findIndex(h=>["salary_max","max_salary","salary"].some(k=>h.includes(k))),
    typeIdx:     low.findIndex(h=>["job_type","type","employment_type"].some(k=>h.includes(k))),
    industryIdx: low.findIndex(h=>["industry","sector","field"].some(k=>h.includes(k))),
    expIdx:      low.findIndex(h=>["experience","exp_level","seniority","level"].some(k=>h.includes(k))),
    remoteIdx:   low.findIndex(h=>["remote","work_type"].some(k=>h.includes(k))),
  };
}

function countBy(rows, key) {
  const m={};
  rows.forEach(r=>{ const v=r[key]||"Unknown"; m[v]=(m[v]||0)+1; });
  return Object.entries(m).sort((a,b)=>b[1]-a[1]);
}

export default function FakeJobsPage() {
  const fileRef  = useRef(null);
  const [rows,   setRows]   = useState([]);
  const [hdrs,   setHdrs]   = useState([]);
  const [cols,   setCols]   = useState({});
  const [loaded, setLoaded] = useState(false);
  const [error,  setError]  = useState("");
  const [fname,  setFname]  = useState("");
  const [active, setActive] = useState(0); // active tutorial step index

  const parse = (text, name="") => {
    setError("");
    Papa.parse(text, { header:true, skipEmptyLines:true,
      complete: res => {
        if (!res.data.length) { setError("No data rows found."); return; }
        const headers = res.meta.fields||[];
        const detected = detectJobCols(headers);
        if (detected.titleIdx===-1 && detected.typeIdx===-1) {
          setError(`Could not detect columns. Found: ${headers.join(", ")}. Need: job_title, salary_min/max, job_type, industry, location.`);
          return;
        }
        setHdrs(headers); setCols(detected);
        setRows(res.data); setFname(name); setLoaded(true);
      },
      error: e => setError("Parse error: "+e.message),
    });
  };

  const onFile = f => { if(!f)return; const r=new FileReader(); r.onload=e=>parse(e.target.result,f.name); r.readAsText(f); };

  // ── derive live output data per step ──────────────────────────────────────
  const liveOutput = loaded ? (() => {
    const h = hdrs;
    const typeKey   = cols.typeIdx!==-1    ? h[cols.typeIdx]    : null;
    const indKey    = cols.industryIdx!==-1? h[cols.industryIdx]: null;
    const locKey    = cols.locationIdx!==-1? h[cols.locationIdx]: null;
    const expKey    = cols.expIdx!==-1     ? h[cols.expIdx]     : null;
    const salMaxKey = cols.salMaxIdx!==-1  ? h[cols.salMaxIdx]  : null;
    const salMinKey = cols.salMinIdx!==-1  ? h[cols.salMinIdx]  : null;

    const typeCounts = typeKey ? countBy(rows,typeKey).slice(0,6) : [];
    const indCounts  = indKey  ? countBy(rows,indKey).slice(0,6)  : [];
    const locCounts  = locKey  ? countBy(rows,locKey).slice(0,8)  : [];
    const expCounts  = expKey  ? countBy(rows,expKey).slice(0,5)  : [];

    const avgSalByInd = (indKey&&salMaxKey) ? indCounts.map(([k])=>{
      const v=rows.filter(r=>r[indKey]===k).map(r=>parseFloat(r[salMaxKey])).filter(x=>!isNaN(x));
      return [k, v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length):0];
    }) : [];

    const avgSalByType = (typeKey&&salMaxKey) ? typeCounts.map(([k])=>{
      const v=rows.filter(r=>r[typeKey]===k).map(r=>parseFloat(r[salMaxKey])).filter(x=>!isNaN(x));
      return [k, v.length?Math.round(v.reduce((a,b)=>a+b,0)/v.length):0];
    }) : [];

    const salAll = salMaxKey?rows.map(r=>parseFloat(r[salMaxKey])).filter(x=>!isNaN(x)):[];
    const salMin = salMinKey?rows.map(r=>parseFloat(r[salMinKey])).filter(x=>!isNaN(x)):[];
    const mean = a=>a.length?Math.round(a.reduce((s,v)=>s+v,0)/a.length):0;

    return { typeCounts, indCounts, locCounts, expCounts, avgSalByInd, avgSalByType,
      salStats:{ min:salAll.length?Math.min(...salAll):0, max:salAll.length?Math.max(...salAll):0,
        meanMax:mean(salAll), meanMin:mean(salMin) } };
  })() : null;

  const step = STEPS[active];

  return (
    <div className={styles.page}>
      <Nav/>

      {/* ── HERO ── */}
      <header className={styles.hero}>
        <div className={styles.inner}>
          <span className={styles.badge}>💼 Jupyter Notebook · Fake Jobs EDA</span>
          <h1 className={styles.title}>Graduate Job Market Analysis</h1>
          <p className={styles.sub}>
            An 8-step interactive tutorial that walks through the full Python/Pandas/Seaborn EDA pipeline.
            Each cell shows real code, explains the theory, and displays live output from your CSV.
          </p>
          <div className={styles.heroLinks}>
            <a href="/data/fake_jobs_sample.csv" download className={styles.dlBtn}>⬇ Download sample CSV</a>
            <Link href="/ipynb/fake-jobs/charts" className={styles.chartsBtn}>📊 Live Charts →</Link>
          </div>
        </div>
      </header>

      <main className={styles.main}>

        {/* ── UPLOAD ── */}
        <div className={styles.upCard}>
          <div className={styles.drop} onClick={()=>fileRef.current?.click()}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <div>
              <p className={styles.dropT}>Upload your jobs <strong>.csv</strong> to see live output in each step</p>
              <p className={styles.dropH}>Columns: <code>job_title</code> · <code>salary_min/max</code> · <code>job_type</code> · <code>industry</code> · <code>location</code> · <code>experience_level</code></p>
            </div>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={e=>onFile(e.target.files?.[0])} style={{display:"none"}}/>
          </div>
          {error && <div className={styles.err}>⚠ {error}</div>}
          {loaded && (
            <div className={styles.loadedBanner}>
              ✓ <strong>{fname}</strong> loaded — {rows.length} jobs · {hdrs.length} columns detected.
              Scroll through each step to see your live data output.
            </div>
          )}
        </div>

        {/* ── NOTEBOOK LAYOUT ── */}
        <div className={styles.notebook}>

          {/* LEFT: step index sidebar */}
          <aside className={styles.sidebar}>
            <p className={styles.sidebarTitle}>Steps</p>
            {STEPS.map((s,i)=>(
              <button key={i} className={`${styles.sideStep} ${i===active?styles.sideActive:""}`} onClick={()=>setActive(i)}>
                <span className={styles.sideN}>{s.n}</span>
                <span className={styles.sideLabel}>{s.title}</span>
                <span className={styles.sideTag}>{s.tag}</span>
              </button>
            ))}
          </aside>

          {/* RIGHT: active cell content */}
          <div className={styles.cellArea}>

            {/* Cell header */}
            <div className={styles.cellHeader}>
              <span className={styles.cellIcon}>{step.icon}</span>
              <div>
                <span className={styles.cellTag}>{step.tag}</span>
                <h2 className={styles.cellTitle}>Step {step.n} — {step.title}</h2>
              </div>
              <div className={styles.cellNav}>
                <button className={styles.navBtn} disabled={active===0} onClick={()=>setActive(a=>a-1)}>← Prev</button>
                <span className={styles.navCount}>{active+1} / {STEPS.length}</span>
                <button className={styles.navBtn} disabled={active===STEPS.length-1} onClick={()=>setActive(a=>a+1)}>Next →</button>
              </div>
            </div>

            {/* Theory cell */}
            <div className={styles.theoryCell}>
              <span className={styles.cellKind}>📖 Theory</span>
              <p className={styles.theoryText}>{step.theory}</p>
            </div>

            {/* Code cell */}
            <div className={styles.codeCell}>
              <div className={styles.codeCellBar}>
                <span className={styles.cellKind}>In [{step.n}]:</span>
                <span className={styles.codeLang}>Python · Pandas · Seaborn</span>
              </div>
              <pre className={styles.codeBlock}><code>{step.code}</code></pre>
            </div>

            {/* Output cell — live data */}
            <div className={styles.outputCell}>
              <span className={styles.cellKind}>Out [{step.n}]:</span>
              {loaded && liveOutput ? (
                <LiveOutput stepIndex={active} data={liveOutput} rows={rows} hdrs={hdrs} cols={cols} fname={fname}/>
              ) : (
                <div className={styles.outputEmpty}>
                  <span>📤 Upload a CSV above to see live output for this step</span>
                  <a href="/data/fake_jobs_sample.csv" download className={styles.sampleLink}>or download the sample CSV →</a>
                </div>
              )}
            </div>

            {/* Insight cell */}
            <div className={styles.insightCell}>
              <span className={styles.cellKind}>💡 Key Insight</span>
              <p className={styles.insightText}>{step.insight}</p>
            </div>

            {/* Step navigation */}
            <div className={styles.stepFooter}>
              {active < STEPS.length-1 ? (
                <button className={styles.nextStepBtn} onClick={()=>setActive(a=>a+1)}>
                  Continue to Step {STEPS[active+1].n}: {STEPS[active+1].title} →
                </button>
              ) : (
                <Link href="/ipynb/fake-jobs/charts" className={styles.nextStepBtn}>
                  🎉 Tutorial complete — Open Live Charts Dashboard →
                </Link>
              )}
            </div>

          </div>
        </div>

        {/* ── STEP OVERVIEW GRID (always visible below) ── */}
        <div className={styles.overviewSection}>
          <h2 className={styles.overviewTitle}>All 8 tutorial steps</h2>
          <div className={styles.overviewGrid}>
            {STEPS.map((s,i)=>(
              <button key={i} className={`${styles.overviewCard} ${i===active?styles.overviewActive:""}`} onClick={()=>setActive(i)}>
                <span className={styles.ovIcon}>{s.icon}</span>
                <span className={styles.ovN}>{s.n}</span>
                <h3 className={styles.ovTitle}>{s.title}</h3>
                <span className={styles.ovTag}>{s.tag}</span>
              </button>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}

// ── Live output component — renders different output per step ───────────────
function LiveOutput({ stepIndex, data, rows, hdrs, cols, fname }) {
  const { typeCounts, indCounts, locCounts, expCounts, avgSalByInd, avgSalByType, salStats } = data;

  const TRow = ({k,v})=><tr><td className={styles.otk}>{k}</td><td className={styles.otv}>{v}</td></tr>;

  if (stepIndex === 0) return ( // Schema
    <div className={styles.outputTable}>
      <p className={styles.outputMeta}>Shape: ({rows.length}, {hdrs.length}) &nbsp;|&nbsp; File: {fname}</p>
      <table className={styles.ot}><thead><tr>{hdrs.map(h=><th key={h} className={styles.oth}>{h}</th>)}</tr></thead>
      <tbody>{rows.slice(0,5).map((r,i)=><tr key={i}>{hdrs.map(h=><td key={h} className={styles.otd}>{r[h]??""}</td>)}</tr>)}</tbody></table>
      <p className={styles.outputMeta}>Showing first 5 of {rows.length} rows · {hdrs.length} columns</p>
    </div>
  );

  if (stepIndex === 1) return ( // Info
    <div className={styles.outputGrid2}>
      <div>
        <p className={styles.outputMeta}>Column info ({hdrs.length} features)</p>
        <table className={styles.ot}><thead><tr><th className={styles.oth}>Column</th><th className={styles.oth}>Non-Null</th><th className={styles.oth}>Type</th></tr></thead>
        <tbody>{hdrs.map(h=>{
          const nulls=rows.filter(r=>!r[h]||r[h]==="").length;
          return <tr key={h}><td className={styles.otk}>{h}</td><td className={styles.otd}>{rows.length-nulls}</td><td className={styles.otd} style={{color:"#6366f1"}}>object</td></tr>;
        })}</tbody></table>
      </div>
      <div>
        <p className={styles.outputMeta}>Missing values</p>
        <table className={styles.ot}><thead><tr><th className={styles.oth}>Column</th><th className={styles.oth}>Missing</th><th className={styles.oth}>%</th></tr></thead>
        <tbody>{hdrs.map(h=>{
          const nulls=rows.filter(r=>!r[h]||r[h]==="").length;
          if(nulls===0)return null;
          return <tr key={h}><td className={styles.otk}>{h}</td><td className={styles.otd} style={{color:"#e05252"}}>{nulls}</td><td className={styles.otd}>{((nulls/rows.length)*100).toFixed(1)}%</td></tr>;
        }).filter(Boolean)}
        {hdrs.every(h=>rows.every(r=>r[h]&&r[h]!==""))&&<tr><td colSpan={3} className={styles.otd} style={{color:"#22c55e"}}>✓ No missing values detected</td></tr>}
        </tbody></table>
      </div>
    </div>
  );

  if (stepIndex === 2) return ( // Salary
    <div>
      <p className={styles.outputMeta}>Salary statistics</p>
      <div className={styles.salGrid}>
        {[["Min salary",`$${salStats.min.toLocaleString()}`,"#22c55e"],["Max salary",`$${salStats.max.toLocaleString()}`,"#e05252"],["Avg max",`$${salStats.meanMax.toLocaleString()}`,"#6366f1"],["Avg min",`$${salStats.meanMin.toLocaleString()}`,"#f97316"]]
        .map(([l,v,c])=><div key={l} className={styles.salCard}><span className={styles.salL}>{l}</span><span className={styles.salV} style={{color:c}}>{v}</span></div>)}
      </div>
      <p className={styles.outputMeta} style={{marginTop:"1rem"}}>Avg max salary by job type</p>
      <table className={styles.ot}><thead><tr><th className={styles.oth}>Job Type</th><th className={styles.oth}>Count</th><th className={styles.oth}>Avg Max Salary</th></tr></thead>
      <tbody>{avgSalByType.map(([k,v])=>(
        <tr key={k}><td className={styles.otk}>{k}</td>
        <td className={styles.otd}>{typeCounts.find(([t])=>t===k)?.[1]||0}</td>
        <td className={styles.otd}><span style={{color:"#6366f1",fontWeight:600}}>${v.toLocaleString()}</span></td></tr>
      ))}</tbody></table>
    </div>
  );

  if (stepIndex === 3) return ( // Location
    <div>
      <p className={styles.outputMeta}>Top {locCounts.length} locations by job count</p>
      {locCounts.map(([k,v])=>(
        <div key={k} className={styles.barRow}>
          <span className={styles.barLabel}>{k}</span>
          <div className={styles.barWrap}><div className={styles.barFill} style={{width:`${(v/locCounts[0][1])*100}%`,background:"#3b82f6"}}/></div>
          <span className={styles.barVal}>{v}</span>
        </div>
      ))}
    </div>
  );

  if (stepIndex === 4) return ( // Job type
    <div>
      <p className={styles.outputMeta}>Employment type distribution ({rows.length} total)</p>
      {typeCounts.map(([k,v],i)=>{
        const colors=["#6366f1","#e05252","#22c55e","#f97316","#a855f7","#14b8a6"];
        const pct=((v/rows.length)*100).toFixed(1);
        return (
          <div key={k} className={styles.barRow}>
            <span className={styles.barLabel}>{k}</span>
            <div className={styles.barWrap}><div className={styles.barFill} style={{width:`${pct}%`,background:colors[i%colors.length]}}/></div>
            <span className={styles.barVal}>{v} ({pct}%)</span>
          </div>
        );
      })}
    </div>
  );

  if (stepIndex === 5) return ( // Industry
    <div>
      <p className={styles.outputMeta}>Top industries — job count &amp; avg max salary</p>
      <table className={styles.ot}><thead><tr><th className={styles.oth}>Industry</th><th className={styles.oth}>Job Count</th><th className={styles.oth}>Avg Max Salary</th><th className={styles.oth}>Share</th></tr></thead>
      <tbody>{indCounts.map(([k,v])=>{
        const sal=avgSalByInd.find(([ik])=>ik===k)?.[1]||0;
        return <tr key={k}>
          <td className={styles.otk}>{k}</td>
          <td className={styles.otd}>{v}</td>
          <td className={styles.otd}><span style={{color:"#22c55e",fontWeight:600}}>{sal>0?`$${sal.toLocaleString()}`:"—"}</span></td>
          <td className={styles.otd}>{((v/rows.length)*100).toFixed(1)}%</td>
        </tr>;
      })}</tbody></table>
    </div>
  );

  if (stepIndex === 6) return ( // Experience
    <div>
      <p className={styles.outputMeta}>Experience level demand breakdown</p>
      {expCounts.map(([k,v],i)=>{
        const colors=["#60a5fa","#34d399","#f59e0b","#f87171","#a78bfa"];
        const pct=((v/rows.length)*100).toFixed(1);
        return (
          <div key={k} className={styles.barRow}>
            <span className={styles.barLabel}>{k}</span>
            <div className={styles.barWrap}><div className={styles.barFill} style={{width:`${pct}%`,background:colors[i%colors.length]}}/></div>
            <span className={styles.barVal}>{v} ({pct}%)</span>
          </div>
        );
      })}
      <p className={styles.outputMeta} style={{marginTop:"1rem"}}>Senior roles command higher compensation. Upload a CSV with salary columns to see salary-by-experience breakdown.</p>
    </div>
  );

  if (stepIndex === 7) return ( // Dashboard
    <div className={styles.dashOutput}>
      <div className={styles.dashSummary}>
        {[["Jobs loaded",rows.length],["Job types",[...new Set(rows.map(r=>r[hdrs[cols.typeIdx]]).filter(Boolean))].length],["Industries",[...new Set(rows.map(r=>r[hdrs[cols.industryIdx]]).filter(Boolean))].length],["Locations",[...new Set(rows.map(r=>r[hdrs[cols.locationIdx]]).filter(Boolean))].length]]
        .map(([l,v])=><div key={l} className={styles.dashCard}><span className={styles.dashL}>{l}</span><span className={styles.dashV}>{v}</span></div>)}
      </div>
      <p className={styles.outputMeta}>All 6 charts are ready with your data. Open the dashboard to view them interactively.</p>
      <Link href="/ipynb/fake-jobs/charts" className={styles.bigChartBtn}>📊 Open Live Charts Dashboard →</Link>
    </div>
  );

  return <div className={styles.outputEmpty}><span>No output for this step.</span></div>;
}
