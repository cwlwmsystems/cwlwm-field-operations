"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { useAuth } from "@/lib/auth/AuthProvider";

export type RepShiftSession = {
  id: string;
  organizationId: string;
  representativeId: string;
  startedAt: string;
  endedAt: string | null;
};

export type RepShiftBreak = {
  id: string;
  shiftSessionId: string;
  startedAt: string;
  endedAt: string | null;
};

function mapRow(row: any): RepShiftSession {
  return {
    id: row.id,
    organizationId: row.organization_id,
    representativeId: row.representative_id,
    startedAt: row.started_at,
    endedAt: row.ended_at ?? null,
  };
}

export function useRepShiftClock() {
  const { organization, membership, user } = useAuth();
  const [activeShift, setActiveShift] = useState<RepShiftSession | null>(null);
  const [activeBreak, setActiveBreak] = useState<RepShiftBreak | null>(null);
  const [breakSeconds, setBreakSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRepresentative = membership?.role === "representative";
  const orgId = organization?.id;

  const refresh = useCallback(async () => {
    if (!isRepresentative || !orgId || !user?.id) {
      setActiveShift(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("rep_shift_sessions")
      .select("id,organization_id,representative_id,started_at,ended_at")
      .eq("organization_id", orgId)
      .eq("user_id", user.id)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      setError(error.message);
      setActiveShift(null);
      setActiveBreak(null);
      setBreakSeconds(0);
      setLoading(false);
      return;
    }

    const mapped = data ? mapRow(data) : null;
    setActiveShift(mapped);

    if (!mapped) {
      setActiveBreak(null);
      setBreakSeconds(0);
      setLoading(false);
      return;
    }

    const { data: breakRows, error: breakError } = await supabase
      .from("rep_shift_breaks")
      .select("id,shift_session_id,started_at,ended_at")
      .eq("shift_session_id", mapped.id)
      .order("started_at", { ascending: true });

    if (breakError) {
      setError(breakError.message);
      setActiveBreak(null);
      setBreakSeconds(0);
    } else {
      const rows = breakRows ?? [];
      const now = Date.now();
      setBreakSeconds(rows.reduce((sum, row) => {
        const end = row.ended_at ? Date.parse(row.ended_at) : now;
        return sum + Math.max(0, Math.floor((end - Date.parse(row.started_at)) / 1000));
      }, 0));
      const open = rows.find((row) => !row.ended_at);
      setActiveBreak(open ? {
        id: open.id,
        shiftSessionId: open.shift_session_id,
        startedAt: open.started_at,
        endedAt: null,
      } : null);
    }
    setLoading(false);
  }, [isRepresentative, orgId, user?.id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const clockIn = useCallback(async (position?: GeolocationPosition) => {
    if (!orgId) throw new Error("No active organization.");
    setWorking(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("clock_in_rep_shift", {
        p_organization_id: orgId,
        p_latitude: position?.coords.latitude ?? null,
        p_longitude: position?.coords.longitude ?? null,
        p_accuracy_meters: position?.coords.accuracy ?? null,
      });
      if (error) throw new Error(error.message);
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error("Clock-in did not return a shift.");
      const mapped = mapRow(row);
      setActiveShift(mapped);
      return mapped;
    } finally {
      setWorking(false);
    }
  }, [orgId]);

  const clockOut = useCallback(async (position?: GeolocationPosition) => {
    if (!orgId) throw new Error("No active organization.");
    setWorking(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("clock_out_rep_shift", {
        p_organization_id: orgId,
        p_latitude: position?.coords.latitude ?? null,
        p_longitude: position?.coords.longitude ?? null,
        p_accuracy_meters: position?.coords.accuracy ?? null,
      });
      if (error) throw new Error(error.message);
      setActiveShift(null);
      return Array.isArray(data) ? data[0] : data;
    } finally {
      setWorking(false);
    }
  }, [orgId]);

  const startBreak = useCallback(async () => {
    if (!orgId) throw new Error("No active organization.");
    setWorking(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("start_rep_break", {
        p_organization_id: orgId,
      });
      if (error) throw new Error(error.message);
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error("Break start did not return a record.");
      setActiveBreak({
        id: row.id,
        shiftSessionId: row.shift_session_id,
        startedAt: row.started_at,
        endedAt: row.ended_at ?? null,
      });
      return row;
    } finally {
      setWorking(false);
    }
  }, [orgId]);

  const endBreak = useCallback(async () => {
    if (!orgId) throw new Error("No active organization.");
    setWorking(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("end_rep_break", {
        p_organization_id: orgId,
      });
      if (error) throw new Error(error.message);
      setActiveBreak(null);
      await refresh();
      return Array.isArray(data) ? data[0] : data;
    } finally {
      setWorking(false);
    }
  }, [orgId, refresh]);

  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    if (!activeShift) return;
    const timer = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [activeShift]);

  const elapsedSeconds = useMemo(() => {
    if (!activeShift) return 0;
    return Math.max(0, Math.floor((nowTick - Date.parse(activeShift.startedAt)) / 1000));
  }, [activeShift, nowTick]);

  const liveBreakSeconds = useMemo(() => {
    if (!activeBreak) return breakSeconds;
    const storedWithoutOpen = Math.max(
      0,
      breakSeconds - Math.max(0, Math.floor((Date.now() - Date.parse(activeBreak.startedAt)) / 1000))
    );
    return storedWithoutOpen + Math.max(0, Math.floor((nowTick - Date.parse(activeBreak.startedAt)) / 1000));
  }, [activeBreak, breakSeconds, nowTick]);

  const netWorkedSeconds = Math.max(0, elapsedSeconds - liveBreakSeconds);

  const staleOpenShift = useMemo(() => {
    if (!activeShift) return false;
    const start = new Date(activeShift.startedAt);
    const now = new Date(nowTick);
    const differentLocalDay =
      start.getFullYear() !== now.getFullYear() ||
      start.getMonth() !== now.getMonth() ||
      start.getDate() !== now.getDate();
    return differentLocalDay || elapsedSeconds >= 14 * 3600;
  }, [activeShift, elapsedSeconds, nowTick]);

  return {
    isRepresentative,
    activeShift,
    activeBreak,
    loading,
    working,
    error,
    elapsedSeconds,
    breakSeconds: liveBreakSeconds,
    netWorkedSeconds,
    staleOpenShift,
    refresh,
    clockIn,
    clockOut,
    startBreak,
    endBreak,
  };
}
