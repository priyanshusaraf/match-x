import { FantasyLeague, FantasyTeam } from "@prisma/client";

// Fantasy League Creation Type
export interface FantasyLeagueData {
  name: string;
  tournamentId: string;
  entryFee: number;
  prizePool: number;
}

// Fantasy Team Data Type
export interface FantasyTeamData {
  userId: string;
  fantasyLeagueId: string;
  players: string[]; // Array of player IDs
}
