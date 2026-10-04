export interface PersonShare {
  personNumber: number;
  name: string;
  amount: number;
  formattedAmount: string;
  displayLine: string; // e.g. "Person 1 — ₹250.00"
  hasExtraCent: boolean;
}

export interface SplitResult {
  occasionName: string;
  rawOccasion: string;
  totalBill: number;
  totalBillFormatted: string;
  numberOfPeople: number;
  currency: string;
  shares: PersonShare[];
  remainderPaise: number;
  baseAmountFormatted: string;
  isExactSplit: boolean;
  calculatedAt: string;
}

export interface SavedSplitState {
  occasion: string;
  billAmount: string;
  numberOfPeople: string;
  currency: string;
  result: SplitResult;
  savedAt: number;
}

export interface ValidationErrors {
  billAmount?: string;
  numberOfPeople?: string;
  general?: string;
}
