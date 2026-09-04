import Link from "next/link";
export default function NotFound(){return <main className="auth-page"><section className="auth-card"><div className="eyebrow">404</div><h1>Page not found</h1><p className="muted">The requested resource does not exist.</p><Link className="button" href="/dashboard">Return to dashboard</Link></section></main>}
