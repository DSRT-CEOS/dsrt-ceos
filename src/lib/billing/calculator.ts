export interface BillCalculation {
  grossAmount: number;
  gstAmount: number;
  totalWithGst: number;
  sdDeduction: number;
  itTdsDeduction: number;
  gstTdsDeduction: number;
  labourCess: number;
  royaltyDeduction: number;
  advanceRecovery: number;
  otherDeductions: number;
  ldDeduction: number;
  totalDeductions: number;
  netPayable: number;
}

export interface BillInput {
  grossAmount: number;
  gstRate?: number;
  sdPct?: number;
  itTdsPct?: number;
  gstTdsPct?: number;
  labourCessPct?: number;
  royalty?: number;
  advanceRecovery?: number;
  otherDeductions?: number;
  ldDeduction?: number;
}

export function calculateBill(input: BillInput): BillCalculation {
  const grossAmount = Number(input.grossAmount) || 0;
  const gstRate = Number(input.gstRate ?? 18);
  const sdPct = Number(input.sdPct ?? 10);
  const itTdsPct = Number(input.itTdsPct ?? 2);
  const gstTdsPct = Number(input.gstTdsPct ?? 2);
  const labourCessPct = Number(input.labourCessPct ?? 1);

  const gstAmount = (grossAmount * gstRate) / 100;
  const totalWithGst = grossAmount + gstAmount;

  const sdDeduction = (grossAmount * sdPct) / 100;
  const itTdsDeduction = (grossAmount * itTdsPct) / 100;
  const gstTdsDeduction = (totalWithGst * gstTdsPct) / 100;
  const labourCess = (grossAmount * labourCessPct) / 100;
  const royaltyDeduction = Number(input.royalty || 0);
  const advanceRecovery = Number(input.advanceRecovery || 0);
  const otherDeductions = Number(input.otherDeductions || 0);
  const ldDeduction = Number(input.ldDeduction || 0);

  const totalDeductions = sdDeduction + itTdsDeduction + gstTdsDeduction + labourCess +
    royaltyDeduction + advanceRecovery + otherDeductions + ldDeduction;

  const netPayable = totalWithGst - totalDeductions;

  return {
    grossAmount, gstAmount, totalWithGst,
    sdDeduction, itTdsDeduction, gstTdsDeduction, labourCess,
    royaltyDeduction, advanceRecovery, otherDeductions, ldDeduction,
    totalDeductions, netPayable
  };
}

export function calculateESI(grossWage: number): { employee: number; employer: number; total: number } {
  // ESI applicable on wage up to Rs 21,000/month
  if (grossWage > 21000) return { employee: 0, employer: 0, total: 0 };
  const employee = Math.round(grossWage * 0.0075 * 100) / 100;
  const employer = Math.round(grossWage * 0.0325 * 100) / 100;
  return { employee, employer, total: employee + employer };
}

export function calculateEPF(basicWage: number): { employee: number; employerEpf: number; employerEps: number; admin: number; edli: number; total: number } {
  // EPF on Basic+DA, capped at Rs 15,000 for EPS
  const epsBase = Math.min(basicWage, 15000);
  const employee = Math.round(basicWage * 0.12 * 100) / 100;
  const employerEps = Math.round(epsBase * 0.0833 * 100) / 100;
  const employerEpf = Math.round((basicWage * 0.12 - employerEps) * 100) / 100;
  const admin = Math.round(basicWage * 0.005 * 100) / 100;
  const edli = Math.round(Math.min(basicWage, 15000) * 0.005 * 100) / 100;
  return { employee, employerEpf, employerEps, admin, edli, total: employee + employerEpf + employerEps + admin + edli };
}

export function calculateGST(amount: number, rate: number = 18): { cgst: number; sgst: number; igst: number; total: number } {
  const total = (amount * rate) / 100;
  return {
    cgst: total / 2,
    sgst: total / 2,
    igst: total,
    total
  };
}