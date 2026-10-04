import { SplitResult, PersonShare, ValidationErrors } from '../types';

export const DEFAULT_CURRENCY = '₹';

export const CURRENCY_OPTIONS = [
  { symbol: '₹', code: 'INR', label: 'INR (₹)' },
  { symbol: '$', code: 'USD', label: 'USD ($)' },
  { symbol: '€', code: 'EUR', label: 'EUR (€)' },
  { symbol: '£', code: 'GBP', label: 'GBP (£)' },
];

/**
 * Validates inputs for the bill split.
 * If either Bill Amount or Number of People is empty, zero, or negative,
 * returns descriptive validation errors.
 */
export function validateSplitInputs(
  billAmountStr: string,
  numberOfPeopleStr: string
): { isValid: boolean; errors: ValidationErrors } {
  const errors: ValidationErrors = {};

  const trimmedBill = billAmountStr.trim();
  const trimmedPeople = numberOfPeopleStr.trim();

  // Validate Bill Amount
  if (!trimmedBill) {
    errors.billAmount = 'Bill Amount is required and cannot be empty.';
  } else {
    const billNum = Number(trimmedBill);
    if (isNaN(billNum)) {
      errors.billAmount = 'Bill Amount must be a valid number.';
    } else if (billNum === 0) {
      errors.billAmount = 'Bill Amount cannot be zero (0.00).';
    } else if (billNum < 0) {
      errors.billAmount = 'Bill Amount cannot be negative.';
    }
  }

  // Validate Number of People
  if (!trimmedPeople) {
    errors.numberOfPeople = 'Number of People is required and cannot be empty.';
  } else {
    const peopleNum = Number(trimmedPeople);
    if (isNaN(peopleNum)) {
      errors.numberOfPeople = 'Number of People must be a valid number.';
    } else if (peopleNum === 0) {
      errors.numberOfPeople = 'Number of People cannot be zero.';
    } else if (peopleNum < 0) {
      errors.numberOfPeople = 'Number of People cannot be negative.';
    } else if (!Number.isInteger(peopleNum)) {
      errors.numberOfPeople = 'Number of People must be a whole number (integer).';
    }
  }

  const isValid = Object.keys(errors).length === 0;
  return { isValid, errors };
}

/**
 * Calculates the exact split in integer cents/paise and distributes
 * remainder paise among the first participants so the sum of individual
 * shares matches the bill amount exactly with zero rounding leakage.
 */
export function calculateBillSplit(
  occasion: string,
  billAmount: number,
  numberOfPeople: number,
  currency: string = DEFAULT_CURRENCY,
  customNames?: Record<number, string>
): SplitResult {
  // Convert total to integer paise (or cents) to eliminate JS float errors
  const totalPaise = Math.round(billAmount * 100);
  const basePaise = Math.floor(totalPaise / numberOfPeople);
  const remainderPaise = totalPaise % numberOfPeople;

  const shares: PersonShare[] = [];

  for (let i = 0; i < numberOfPeople; i++) {
    const personNumber = i + 1;
    // Remainder paise is distributed 1-by-1 to the first 'remainderPaise' people
    const personPaise = i < remainderPaise ? basePaise + 1 : basePaise;
    const amount = personPaise / 100;
    const formattedAmount = `${currency}${amount.toFixed(2)}`;
    const personName = customNames?.[personNumber]?.trim() || `Person ${personNumber}`;

    shares.push({
      personNumber,
      name: personName,
      amount,
      formattedAmount,
      // Matches the requested format: "Person 1 — ₹250.00"
      displayLine: `${personName} — ${formattedAmount}`,
      hasExtraCent: i < remainderPaise && remainderPaise > 0,
    });
  }

  const cleanOccasion = occasion.trim() || 'General Bill Split';
  const totalBillFormatted = `${currency}${(totalPaise / 100).toFixed(2)}`;

  return {
    occasionName: cleanOccasion,
    rawOccasion: occasion,
    totalBill: totalPaise / 100,
    totalBillFormatted,
    numberOfPeople,
    currency,
    shares,
    remainderPaise,
    baseAmountFormatted: `${currency}${(basePaise / 100).toFixed(2)}`,
    isExactSplit: remainderPaise === 0,
    calculatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

/**
 * Formats full breakdown into clean text for easy clipboard sharing.
 */
export function formatBreakdownForClipboard(result: SplitResult): string {
  const lines: string[] = [
    `🧾 Occasion: ${result.occasionName}`,
    `💰 Total Bill: ${result.totalBillFormatted}`,
    `👥 Number of People: ${result.numberOfPeople}`,
    ``,
    `--- Individual Shares ---`,
    ...result.shares.map((s) => s.displayLine),
    ``,
    `Total sum: ${result.totalBillFormatted}`,
  ];

  if (!result.isExactSplit) {
    lines.push(
      `Note: ${result.currency}0.01 remainder adjusted for first ${result.remainderPaise} people for exact penny balancing.`
    );
  }

  return lines.join('\n');
}
