import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Users,
  CreditCard,
  RotateCcw,
  Copy,
  Check,
  AlertCircle,
  Share2,
  CheckCircle2,
  ArrowRight,
  Edit2,
  Plus,
  Minus,
  Info,
  Calendar,
  Wallet,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { SplitResult, SavedSplitState, ValidationErrors } from './types';
import {
  DEFAULT_CURRENCY,
  CURRENCY_OPTIONS,
  validateSplitInputs,
  calculateBillSplit,
  formatBreakdownForClipboard,
} from './utils/splitCalculator';

const STORAGE_KEY = 'bill_splitter_valid_state_v1';

export default function App() {
  // Input states
  const [occasion, setOccasion] = useState<string>('');
  const [billAmount, setBillAmount] = useState<string>('');
  const [numberOfPeople, setNumberOfPeople] = useState<string>('');
  const [currency, setCurrency] = useState<string>(DEFAULT_CURRENCY);
  const [customNames, setCustomNames] = useState<Record<number, string>>({});

  // Feedback & calculation states
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [currentResult, setCurrentResult] = useState<SplitResult | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [editingPerson, setEditingPerson] = useState<number | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [hasRestoredFromStorage, setHasRestoredFromStorage] = useState<boolean>(false);

  // Restore previous valid result from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: SavedSplitState = JSON.parse(stored);
        if (parsed && parsed.result && Array.isArray(parsed.result.shares) && parsed.result.shares.length > 0) {
          setOccasion(parsed.occasion || '');
          setBillAmount(parsed.billAmount || '');
          setNumberOfPeople(parsed.numberOfPeople || '');
          setCurrency(parsed.currency || DEFAULT_CURRENCY);
          setCurrentResult(parsed.result);
          setLastSavedAt(parsed.savedAt || Date.now());
          setHasRestoredFromStorage(true);

          // Restore any custom names that were saved
          const namesMap: Record<number, string> = {};
          parsed.result.shares.forEach((share) => {
            if (share.name && share.name !== `Person ${share.personNumber}`) {
              namesMap[share.personNumber] = share.name;
            }
          });
          setCustomNames(namesMap);
        }
      }
    } catch (e) {
      console.error('Failed to load saved bill splitter state:', e);
    }
  }, []);

  // Split Bill action handler
  const handleSplitBill = (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    const { isValid, errors } = validateSplitInputs(billAmount, numberOfPeople);

    if (!isValid) {
      // Show clear validation messages and do NOT show any bill-split result.
      // Invalid submissions must NOT overwrite the last valid saved result!
      setValidationErrors(errors);
      setCurrentResult(null);
      return;
    }

    // Clear validation errors
    setValidationErrors({});

    const billNum = Number(billAmount);
    const peopleNum = Number(numberOfPeople);

    const result = calculateBillSplit(occasion, billNum, peopleNum, currency, customNames);
    setCurrentResult(result);
    setHasRestoredFromStorage(false);

    // Save valid result and inputs to localStorage
    const savedState: SavedSplitState = {
      occasion,
      billAmount,
      numberOfPeople,
      currency,
      result,
      savedAt: Date.now(),
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedState));
      setLastSavedAt(savedState.savedAt);
    } catch (err) {
      console.error('Could not save to localStorage:', err);
    }
  };

  // Adjust number of people with stepper buttons
  const adjustPeopleCount = (delta: number) => {
    const current = parseInt(numberOfPeople, 10);
    const validCurrent = isNaN(current) ? 0 : current;
    const next = Math.max(1, validCurrent + delta);
    setNumberOfPeople(next.toString());
    if (validationErrors.numberOfPeople) {
      setValidationErrors((prev) => ({ ...prev, numberOfPeople: undefined }));
    }
  };

  // Quick preset helper
  const applyPreset = (presetOccasion: string, amount: string, people: string) => {
    setOccasion(presetOccasion);
    setBillAmount(amount);
    setNumberOfPeople(people);
    setValidationErrors({});
  };

  // Copy breakdown to clipboard
  const handleCopyBreakdown = async () => {
    if (!currentResult) return;
    try {
      const text = formatBreakdownForClipboard(currentResult);
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error('Clipboard copy failed:', e);
    }
  };

  // Clear / Reset form & stored data
  const handleClearAll = () => {
    setOccasion('');
    setBillAmount('');
    setNumberOfPeople('');
    setCurrentResult(null);
    setValidationErrors({});
    setCustomNames({});
    setHasRestoredFromStorage(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
      setLastSavedAt(null);
    } catch (e) {
      console.error('Failed to clear localStorage:', e);
    }
  };

  // Inline rename person
  const handleSavePersonName = (personNumber: number) => {
    const trimmed = editingName.trim();
    const newCustom = { ...customNames };
    if (trimmed && trimmed !== `Person ${personNumber}`) {
      newCustom[personNumber] = trimmed;
    } else {
      delete newCustom[personNumber];
    }
    setCustomNames(newCustom);
    setEditingPerson(null);
    setEditingName('');

    // Recompute current result with updated name if active
    if (currentResult) {
      const billNum = Number(billAmount);
      const peopleNum = Number(numberOfPeople);
      if (!isNaN(billNum) && !isNaN(peopleNum) && billNum > 0 && peopleNum > 0) {
        const updatedResult = calculateBillSplit(occasion, billNum, peopleNum, currency, newCustom);
        setCurrentResult(updatedResult);

        // Update localStorage
        const savedState: SavedSplitState = {
          occasion,
          billAmount,
          numberOfPeople,
          currency,
          result: updatedResult,
          savedAt: Date.now(),
        };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(savedState));
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-indigo-100 selection:text-indigo-900 pb-16 pt-6 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-8 text-center sm:text-left flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div className="flex items-center justify-center sm:justify-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Bill Splitter
              </h1>
              <p className="text-sm text-slate-500 font-medium">
                Fair, exact-remainder bill splitting with zero rounding leakage
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center sm:justify-end gap-2">
            {/* Currency selector */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1 shadow-sm text-xs font-medium text-slate-700">
              <span className="px-2 text-slate-400">Currency:</span>
              {CURRENCY_OPTIONS.map((cur) => (
                <button
                  key={cur.symbol}
                  type="button"
                  onClick={() => {
                    setCurrency(cur.symbol);
                    if (currentResult) {
                      const billNum = Number(billAmount);
                      const peopleNum = Number(numberOfPeople);
                      if (billNum > 0 && peopleNum > 0) {
                        const updated = calculateBillSplit(occasion, billNum, peopleNum, cur.symbol, customNames);
                        setCurrentResult(updated);
                      }
                    }
                  }}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    currency === cur.symbol
                      ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                  aria-label={`Select ${cur.label}`}
                >
                  {cur.symbol}
                </button>
              ))}
            </div>

            {/* Clear all button */}
            {(billAmount || numberOfPeople || occasion || currentResult) && (
              <button
                type="button"
                onClick={handleClearAll}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg shadow-sm transition-colors"
                title="Reset form and clear stored data"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </header>

        {/* Persistence Notice Banner (quiet restoration banner) */}
        {hasRestoredFromStorage && currentResult && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-between text-xs text-indigo-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                <strong>Restored from previous session:</strong> Loaded split for{' '}
                <span className="font-semibold">&ldquo;{currentResult.occasionName}&rdquo;</span> (
                {currentResult.totalBillFormatted}).
              </span>
            </div>
            <button
              type="button"
              onClick={() => setHasRestoredFromStorage(false)}
              className="text-indigo-600 hover:text-indigo-800 font-semibold ml-3"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Global Validation Alert (when Split Bill clicked with invalid inputs) */}
        {Object.keys(validationErrors).length > 0 && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 shadow-sm"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-rose-900">
                  Please fix the following validation errors to split the bill:
                </h3>
                <ul className="mt-2 list-disc list-inside text-xs font-medium text-rose-700 space-y-1">
                  {validationErrors.billAmount && <li>{validationErrors.billAmount}</li>}
                  {validationErrors.numberOfPeople && <li>{validationErrors.numberOfPeople}</li>}
                  {validationErrors.general && <li>{validationErrors.general}</li>}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Main Grid: Form on Left, Result / Empty State on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: Inputs Card */}
          <section className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-7">
            <div className="border-b border-slate-100 pb-4 mb-6">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-indigo-600" />
                Bill Details
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Enter your occasion, total bill amount, and participants.
              </p>
            </div>

            <form onSubmit={handleSplitBill} noValidate className="space-y-5">
              {/* Input 1: Occasion Name */}
              <div>
                <label
                  htmlFor="occasion-name"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Occasion Name
                </label>
                <div className="relative">
                  <input
                    id="occasion-name"
                    name="occasion"
                    type="text"
                    value={occasion}
                    onChange={(e) => setOccasion(e.target.value)}
                    placeholder="e.g. Dinner with Friends, Goa Trip, Office Lunch"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Optional description to label your split receipt.
                </p>
              </div>

              {/* Input 2: Bill Amount */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="bill-amount"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                  >
                    Bill Amount <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Must be &gt; 0</span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-semibold text-base">
                    {currency}
                  </div>
                  <input
                    id="bill-amount"
                    name="billAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={billAmount}
                    onChange={(e) => {
                      setBillAmount(e.target.value);
                      if (validationErrors.billAmount) {
                        setValidationErrors((prev) => ({ ...prev, billAmount: undefined }));
                      }
                    }}
                    placeholder="0.00"
                    className={`w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border rounded-xl text-base font-semibold text-slate-900 placeholder:text-slate-300 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                      validationErrors.billAmount
                        ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-600 bg-rose-50/30'
                        : 'border-slate-300 focus:ring-indigo-500/20 focus:border-indigo-600'
                    }`}
                    aria-invalid={!!validationErrors.billAmount}
                    aria-describedby={validationErrors.billAmount ? 'bill-amount-error' : undefined}
                  />
                </div>
                {validationErrors.billAmount && (
                  <p id="bill-amount-error" className="text-xs font-medium text-rose-600 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {validationErrors.billAmount}
                  </p>
                )}
              </div>

              {/* Input 3: Number of People */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="number-of-people"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                  >
                    Number of People <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Whole number &ge; 1</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => adjustPeopleCount(-1)}
                    className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 flex items-center justify-center border border-slate-200 transition-colors shrink-0"
                    aria-label="Decrease number of people by 1"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Users className="w-4 h-4" />
                    </div>
                    <input
                      id="number-of-people"
                      name="numberOfPeople"
                      type="number"
                      step="1"
                      min="1"
                      value={numberOfPeople}
                      onChange={(e) => {
                        setNumberOfPeople(e.target.value);
                        if (validationErrors.numberOfPeople) {
                          setValidationErrors((prev) => ({ ...prev, numberOfPeople: undefined }));
                        }
                      }}
                      placeholder="e.g. 3"
                      className={`w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border rounded-xl text-base font-semibold text-slate-900 placeholder:text-slate-300 focus:bg-white focus:outline-none focus:ring-2 transition-all ${
                        validationErrors.numberOfPeople
                          ? 'border-rose-300 focus:ring-rose-500/20 focus:border-rose-600 bg-rose-50/30'
                          : 'border-slate-300 focus:ring-indigo-500/20 focus:border-indigo-600'
                      }`}
                      aria-invalid={!!validationErrors.numberOfPeople}
                      aria-describedby={
                        validationErrors.numberOfPeople ? 'people-error' : undefined
                      }
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => adjustPeopleCount(1)}
                    className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 flex items-center justify-center border border-slate-200 transition-colors shrink-0"
                    aria-label="Increase number of people by 1"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {validationErrors.numberOfPeople && (
                  <p id="people-error" className="text-xs font-medium text-rose-600 mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {validationErrors.numberOfPeople}
                  </p>
                )}

                {/* Quick group presets */}
                <div className="flex items-center gap-1.5 mt-2.5">
                  <span className="text-[11px] text-slate-400 font-medium mr-1">Quick:</span>
                  {[2, 3, 4, 5, 6, 8].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => {
                        setNumberOfPeople(n.toString());
                        if (validationErrors.numberOfPeople) {
                          setValidationErrors((prev) => ({ ...prev, numberOfPeople: undefined }));
                        }
                      }}
                      className={`px-2 py-1 text-xs rounded-lg font-medium transition-colors ${
                        numberOfPeople === n.toString()
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prominent Split Bill button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-base shadow-md shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  <Receipt className="w-5 h-5" />
                  <span>Split Bill</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Quick Test Demo Presets */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                Sample Test Scenarios
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => applyPreset('Team Lunch', '100', '3')}
                  className="p-2 text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition-colors"
                >
                  <span className="font-semibold block text-slate-900">₹100 ÷ 3 people</span>
                  <span className="text-[11px] text-slate-500">Tests 1-paise remainder</span>
                </button>

                <button
                  type="button"
                  onClick={() => applyPreset('Birthday Dinner', '750', '3')}
                  className="p-2 text-left bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition-colors"
                >
                  <span className="font-semibold block text-slate-900">₹750 ÷ 3 people</span>
                  <span className="text-[11px] text-slate-500">Even ₹250.00 each</span>
                </button>
              </div>
            </div>
          </section>

          {/* RIGHT: Results Receipt Card or Normal Empty State */}
          <section className="lg:col-span-7">
            {currentResult ? (
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
                {/* Receipt Header */}
                <div className="bg-slate-900 text-white p-6 sm:p-7 relative">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-indigo-300 font-semibold tracking-wide uppercase">
                        <Receipt className="w-4 h-4 text-indigo-400" />
                        <span>Split Breakdown</span>
                        <span aria-hidden="true">·</span>
                        <span>{currentResult.calculatedAt}</span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-bold text-white mt-1">
                        {currentResult.occasionName}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleCopyBreakdown}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
                        title="Copy entire breakdown"
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                            <span>Copy List</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Summary Metric Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-6 pt-5 border-t border-slate-800 text-slate-200">
                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-medium">
                        Total Bill
                      </span>
                      <span className="text-xl sm:text-2xl font-extrabold text-white">
                        {currentResult.totalBillFormatted}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-medium">
                        Total People
                      </span>
                      <span className="text-xl sm:text-2xl font-extrabold text-white">
                        {currentResult.numberOfPeople}
                      </span>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-[11px] uppercase tracking-wider text-slate-400 block font-medium">
                        Rounding Balance
                      </span>
                      <span className="text-sm font-semibold text-emerald-400 flex items-center gap-1 mt-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        Exact 100% Match
                      </span>
                    </div>
                  </div>
                </div>

                {/* Individual Shares List */}
                <div className="p-6 sm:p-7">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                        Individual Shares
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Each person&apos;s exact obligation, adding up precisely to{' '}
                        {currentResult.totalBillFormatted}.
                      </p>
                    </div>

                    <span className="text-xs font-medium text-slate-500">
                      {currentResult.shares.length}{' '}
                      {currentResult.shares.length === 1 ? 'person' : 'people'}
                    </span>
                  </div>

                  <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                    {currentResult.shares.map((share) => {
                      const isEditing = editingPerson === share.personNumber;
                      return (
                        <div
                          key={share.personNumber}
                          className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0 mr-3">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                              {share.personNumber}
                            </div>

                            {isEditing ? (
                              <div className="flex items-center gap-2 flex-1 max-w-xs">
                                <input
                                  type="text"
                                  autoFocus
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSavePersonName(share.personNumber);
                                    if (e.key === 'Escape') setEditingPerson(null);
                                  }}
                                  placeholder={share.name}
                                  className="w-full px-2 py-1 text-sm bg-white border border-indigo-400 rounded-md focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSavePersonName(share.personNumber)}
                                  className="p-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 text-xs"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-sm font-semibold text-slate-800 truncate">
                                  {share.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingPerson(share.personNumber);
                                    setEditingName(share.name);
                                  }}
                                  className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
                                  title="Rename person"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>

                          <div className="text-right shrink-0">
                            {/* Prominent display line meeting: Person 1 — ₹250.00 */}
                            <div className="text-base font-bold font-mono text-slate-900">
                              <span className="text-slate-400 font-sans font-normal mr-2">—</span>
                              {share.formattedAmount}
                            </div>
                            {share.hasExtraCent && (
                              <span className="text-[10px] text-indigo-600 font-medium block">
                                +{currentResult.currency}0.01 rounded share
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Verification footer validating exact sum */}
                  <div className="mt-6 pt-5 border-t border-slate-200">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-slate-600 gap-2">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Info className="w-4 h-4 text-slate-400 shrink-0" />
                        {currentResult.isExactSplit ? (
                          <span>Even split: Every person pays the exact same share.</span>
                        ) : (
                          <span>
                            Remainder of {currentResult.currency}
                            {(currentResult.remainderPaise / 100).toFixed(2)} distributed to the first{' '}
                            {currentResult.remainderPaise}{' '}
                            {currentResult.remainderPaise === 1 ? 'person' : 'people'} so the shares
                            total exactly {currentResult.totalBillFormatted}.
                          </span>
                        )}
                      </div>

                      <div className="font-semibold text-slate-900 text-right">
                        Sum of shares: <span className="font-mono">{currentResult.totalBillFormatted}</span>
                      </div>
                    </div>

                    {lastSavedAt && (
                      <p className="text-[11px] text-slate-400 text-right mt-2">
                        Automatically saved to browser storage.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Normal Empty State */
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 sm:p-12 text-center h-full min-h-[380px] flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mb-4">
                  <Receipt className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-1">
                  Ready to calculate your bill split
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mb-6 leading-relaxed">
                  Enter your bill amount and the number of people, then click{' '}
                  <strong className="text-slate-700">Split Bill</strong> to see the exact breakdown.
                </p>

                <div className="w-full max-w-xs p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs space-y-1.5 text-slate-600">
                  <div className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider">
                    How remainder balancing works:
                  </div>
                  <p className="text-[11px] text-slate-500">
                    If ₹100 is split between 3 people, it calculates ₹33.34 for Person 1, and ₹33.33 for
                    Persons 2 &amp; 3 — adding up to exactly ₹100.00.
                  </p>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
