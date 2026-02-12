export interface WiseTransaction {
  description: string;
  date: string;
  incoming: number | null;
  outgoing: number | null;
  amount: number;
  reference: string;
  currency: string;
}

export interface WiseParseResult {
  currency: string;
  dateRange: { from: string; to: string };
  transactions: WiseTransaction[];
}
