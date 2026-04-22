/**
 * FinBridge AI — Rule-based credit scoring engine.
 * Transparent, explainable, deterministic.
 */

export type EmploymentType = "student" | "salaried" | "self_employed";

export interface ProfileInput {
  age: number | null;
  monthly_income: number | null;
  employment_type: EmploymentType | null;
  has_existing_loans: boolean;
}

export interface ScoreReason {
  label: string;
  delta: number; // points contributed
  positive: boolean;
}

export interface ScoreResult {
  score: number; // 0..100
  risk: "Low Risk" | "Medium Risk" | "High Risk";
  reasons: ScoreReason[];
}

export function computeCreditScore(p: ProfileInput): ScoreResult {
  let score = 50; // baseline
  const reasons: ScoreReason[] = [];

  // Income
  const income = p.monthly_income ?? 0;
  if (income >= 75000) {
    score += 25;
    reasons.push({ label: `Strong monthly income (₹${income.toLocaleString("en-IN")})`, delta: 25, positive: true });
  } else if (income >= 25000) {
    score += 15;
    reasons.push({ label: `Healthy monthly income (₹${income.toLocaleString("en-IN")})`, delta: 15, positive: true });
  } else if (income >= 10000) {
    score += 5;
    reasons.push({ label: `Modest income (₹${income.toLocaleString("en-IN")})`, delta: 5, positive: true });
  } else {
    score -= 10;
    reasons.push({ label: "Low / unverified income", delta: -10, positive: false });
  }

  // Employment stability
  if (p.employment_type === "salaried") {
    score += 20;
    reasons.push({ label: "Stable salaried employment", delta: 20, positive: true });
  } else if (p.employment_type === "self_employed") {
    score += 10;
    reasons.push({ label: "Self-employed (variable income)", delta: 10, positive: true });
  } else if (p.employment_type === "student") {
    score -= 5;
    reasons.push({ label: "Student profile", delta: -5, positive: false });
  }

  // Age band
  const age = p.age ?? 0;
  if (age >= 23 && age <= 50) {
    score += 10;
    reasons.push({ label: `Prime age band (${age})`, delta: 10, positive: true });
  } else if (age > 0) {
    reasons.push({ label: `Outside prime age band (${age})`, delta: 0, positive: false });
  }

  // Existing loans
  if (p.has_existing_loans) {
    score -= 15;
    reasons.push({ label: "Existing loan obligations on record", delta: -15, positive: false });
  } else {
    score += 5;
    reasons.push({ label: "No existing loan obligations", delta: 5, positive: true });
  }

  score = Math.max(0, Math.min(100, score));

  const risk: ScoreResult["risk"] =
    score >= 70 ? "Low Risk" : score >= 50 ? "Medium Risk" : "High Risk";

  return { score, risk, reasons };
}

export interface BankInput {
  id: string;
  name: string;
  short_code: string;
  brand_color: string;
  loan_base_rate: number;
  loan_risk_premium: number;
  min_score_required: number;
  fd_rate: number;
}

export interface LoanQuote {
  bank: BankInput;
  approved: boolean;
  rejectionReason?: string;
  amount: number;
  durationDays: number;
  annualRate: number;       // effective %
  interest: number;         // ₹
  repayment: number;        // ₹
  dueDate: Date;
}

/**
 * Compute a per-bank loan quote using the user's score & risk.
 * Rate = base + premium * (riskFactor) + smallDurationKicker
 */
export function quoteLoan(
  bank: BankInput,
  amount: number,
  durationDays: number,
  score: number,
): LoanQuote {
  const riskFactor = score >= 70 ? 0 : score >= 50 ? 1 : 2;
  const durationKicker = durationDays > 30 ? 0.6 : 0;
  const annualRate = +(bank.loan_base_rate + bank.loan_risk_premium * riskFactor + durationKicker).toFixed(2);

  const interest = +((amount * annualRate * durationDays) / (365 * 100)).toFixed(2);
  const repayment = +(amount + interest).toFixed(2);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + durationDays);

  const approved = score >= bank.min_score_required;
  return {
    bank,
    approved,
    rejectionReason: approved ? undefined : `Requires score ≥ ${bank.min_score_required}, you have ${score}`,
    amount,
    durationDays,
    annualRate,
    interest,
    repayment,
    dueDate,
  };
}

/** FD maturity using simple interest (matches typical aggregator displays). */
export function fdMaturity(principal: number, annualRate: number, days: number) {
  const interest = (principal * annualRate * days) / (365 * 100);
  return {
    interest: +interest.toFixed(2),
    maturity: +(principal + interest).toFixed(2),
  };
}
