"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Nav.module.css";

const links = [
  { href: "/vitals",             label: "❤ Heart Vitals" },
  { href: "/analysis",           label: "🔬 Analysis" },
  { href: "/ipynb/fake-jobs",    label: "💼 Fake Jobs" },
  { href: "/ipynb/fake-jobs/charts", label: "📊 Job Charts" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className={styles.nav}>
      <Link href="/vitals" className={styles.brand}>📓 Notebook Studio</Link>
      <div className={styles.links}>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={path === l.href ? styles.active : styles.link}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
