import Link from "next/link";

const items = [
  ["Overview", "/admin"],
  ["Organization", "/admin/organization"],
  ["Teams", "/admin/teams"],
  ["Markets", "/admin/markets"],
  ["Territories", "/admin/territories"],
  ["Representatives", "/admin/representatives"],
  ["Dispositions", "/admin/dispositions"],
  ["Locations / Import", "/admin/locations"],
  ["Sales Review", "/admin/sales-review"],
  ["Scheduling", "/admin/scheduling"],
];

export function AdminNav() {
  return <div className="admin-tabs">{items.map(([label, href]) => <Link key={href} href={href}>{label}</Link>)}</div>;
}
