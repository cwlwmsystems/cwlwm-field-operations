export type RepShiftState = {
  startedAt: string | null;
  endedAt: string | null;
};

function key(userId: string) {
  return `cwlwm:rep-shift:${userId}`;
}

export function loadRepShift(userId?: string | null): RepShiftState {
  if (!userId || typeof window === "undefined") return { startedAt: null, endedAt: null };
  try {
    const raw = window.localStorage.getItem(key(userId));
    if (!raw) return { startedAt: null, endedAt: null };
    const parsed = JSON.parse(raw) as Partial<RepShiftState>;
    return {
      startedAt: typeof parsed.startedAt === "string" ? parsed.startedAt : null,
      endedAt: typeof parsed.endedAt === "string" ? parsed.endedAt : null,
    };
  } catch {
    return { startedAt: null, endedAt: null };
  }
}

export function saveRepShift(userId: string, state: RepShiftState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key(userId), JSON.stringify(state));
}

export function onboardingKey(userId: string) {
  return `cwlwm:rep-onboarding:v1:${userId}`;
}

export function fieldStateKey(userId: string) {
  return `cwlwm:rep-field-state:v1:${userId}`;
}
