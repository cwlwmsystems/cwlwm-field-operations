"use client";
import type {ReactNode} from "react";
import {AppShell} from "@/components/AppShell";
import {useAuth} from "@/lib/auth/AuthProvider";

const allowed=new Set(["organization_owner","organization_admin","operations_manager"]);

export default function AdminLayout({children}:{children:ReactNode}){
  const {membership}=useAuth();
  if(!membership||!allowed.has(membership.role)){
    return <AppShell><div className="card"><div className="eyebrow">Access Control</div><h1>Administration restricted</h1><p className="muted">Your current organization role does not permit administrative configuration.</p></div></AppShell>;
  }
  return <>{children}</>;
}
