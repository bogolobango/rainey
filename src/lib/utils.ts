import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

export function calculateROI(locations: number, monthlyPerLocation: number = 500): {
  monthlyInvestment: number;
  annualInvestment: number;
  estimatedAnnualValue: number;
  roi: number;
  paybackDays: number;
} {
  const monthlyInvestment = locations * monthlyPerLocation;
  const setupFee = locations <= 5 ? 2000 : 5000;
  const annualInvestment = setupFee + monthlyInvestment * 12;
  // Conservative: $15K value per location per year from automation
  const estimatedAnnualValue = locations * 15000;
  const roi = Math.round((estimatedAnnualValue / annualInvestment) * 10) / 10;
  const paybackDays = Math.round((annualInvestment / estimatedAnnualValue) * 365);
  return { monthlyInvestment, annualInvestment, estimatedAnnualValue, roi, paybackDays };
}
