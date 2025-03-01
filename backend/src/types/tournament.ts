import { TournamentFormat, MatchStatus } from "@prisma/client";

// Tournament Data Type
export interface TournamentData {
  name: string;
  organizerId: string;
  maxPlayers: number;
  format: TournamentFormat;
  entryFee: number;
  location?: string;
  startDate: Date;
  endDate?: Date;
}

// Match Data Type
export interface MatchData {
  tournamentId: string;
  playerAId: string;
  playerBId: string;
  refereeId?: string;
  scoreA?: number;
  scoreB?: number;
  status?: MatchStatus;
}
