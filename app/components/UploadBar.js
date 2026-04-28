"use client";
import { useRef, useState } from "react";
import { useData } from "../context/DataContext";
import styles from "./UploadBar.module.css";

export default function UploadBar({ compact = false }) {
  const { loadFile, loadUrl, loaded, fname, rows, error } = useData();
  const fileRef = useRef(null);
  const [drag, setDrag] = useState(false);

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    loadFile(e.dataTransfer.files?.[0]);
  };

  return (
    <div className={styles.wrap}>
      <div
        className={`${styles.drop} ${drag ? styles.dragOver : ""} ${compact ? styles.compact : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
        <div>
          <p className={styles.title}>
            {loaded
              ? <>✓ <strong>{fname}</strong> loaded — {rows.length} rows. Click to replace.</>
              : <>Drop or click to upload <strong>heart.csv</strong></>
            }
          </p>
          {!compact && (
            <p className={styles.hint}>
              Columns: <code>age, sex, cp, trtbps, chol, fbs, restecg, thalachh, exng, oldpeak, slp, caa, thall, output</code>
            </p>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => loadFile(e.target.files?.[0])}
          style={{ display: "none" }}
        />
      </div>

      <div className={styles.actions}>
        <button
          className={`${styles.btn} ${styles.primary}`}
          onClick={() => loadUrl("/data/heart.csv", "heart.csv")}
        >
          ⚡ Load heart.csv instantly
        </button>
        <a href="/data/heart.csv" download className={styles.btn}>
          ⬇ Download heart.csv
        </a>
      </div>

      {error && <div className={styles.err}>⚠ {error}</div>}
    </div>
  );
}
