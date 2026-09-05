import type { EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const allowedTypes = new Set<EmailOtpType>([
  "invite",
  "recovery",
  "signup",
  "email",
  "magiclink",
  "email_change",
]);

function safeNext(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/accept-invite";
  return value;
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const rawType = request.nextUrl.searchParams.get("type");
  const next = safeNext(request.nextUrl.searchParams.get("next"));

  if (!tokenHash || !rawType || !allowedTypes.has(rawType as EmailOtpType)) {
    const fallback = request.nextUrl.clone();
    fallback.pathname = "/accept-invite";
    fallback.search = "";
    fallback.searchParams.set("error", "Invitation link is incomplete or invalid.");
    return NextResponse.redirect(fallback);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: rawType as EmailOtpType,
  });

  if (error) {
    const fallback = request.nextUrl.clone();
    fallback.pathname = "/accept-invite";
    fallback.search = "";
    fallback.searchParams.set(
      "error",
      "This invitation or password-setup link is invalid or has expired. Ask an administrator to send a new setup email."
    );
    return NextResponse.redirect(fallback);
  }

  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = next;
  redirectTo.search = "";
  return NextResponse.redirect(redirectTo);
}
