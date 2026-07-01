export enum AttendanceStatus {
  PRESENT = "present",
  ABSENT = "absent",
  LATE = "late",
  FORGOT = "forgot",
  NO_SHOW = "no_show",
}

export enum MatchStatus {
  PENDING = "pending",
  ORGANIZED = "organized",
  CANCELLED = "cancelled",
}

export enum MatchResult {
  WIN = "win",
  LOSS = "loss",
  DRAW = "draw",
}

export interface Match {
  id: string;
  date: string;
  status: MatchStatus;
  result: MatchResult | null;
  created_at?: string;
}

export interface PlayerAttendance {
  id: string; // user_id
  name: string;
  status: AttendanceStatus;
}

export interface PenaltySettings {
  [key: string]: number;
}