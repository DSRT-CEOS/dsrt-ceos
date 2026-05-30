export interface GSTCalcInput {
  taxableValue: number;
  isInterState: boolean;
  gstRate?: number;
}

export interface GSTCalcResult {
  taxableValue: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
  totalAmount: number;
}

export function calculateGSTInvoice(input: GSTCalcInput): GSTCalcResult {
  const taxable = Number(input.taxableValue) || 0;
  const gstRate = input.gstRate ?? 18;

  let cgstRate = 0, sgstRate = 0, igstRate = 0;
  let cgstAmount = 0, sgstAmount = 0, igstAmount = 0;

  if (input.isInterState) {
    igstRate = gstRate;
    igstAmount = (taxable * gstRate) / 100;
  } else {
    cgstRate = gstRate / 2;
    sgstRate = gstRate / 2;
    cgstAmount = (taxable * cgstRate) / 100;
    sgstAmount = (taxable * sgstRate) / 100;
  }

  const totalTax = cgstAmount + sgstAmount + igstAmount;
  const totalAmount = taxable + totalTax;

  return {
    taxableValue: taxable,
    cgstRate, cgstAmount,
    sgstRate, sgstAmount,
    igstRate, igstAmount,
    totalTax, totalAmount,
  };
}

export function numberToWords(num: number): string {
  if (num === 0) return "Zero Rupees Only";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const intNum = Math.floor(num);
  const paise = Math.round((num - intNum) * 100);

  function convert(n: number): string {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + convert(n % 100) : "");
    if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + convert(n % 1000) : "");
    if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + convert(n % 100000) : "");
    return convert(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + convert(n % 10000000) : "");
  }

  let result = "Rupees " + convert(intNum);
  if (paise > 0) result += " and " + convert(paise) + " Paise";
  return result + " Only";
}

// State codes for inter-state detection
export const INDIAN_STATES: Record<string, string> = {
  "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab",
  "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana", "07": "Delhi",
  "08": "Rajasthan", "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim",
  "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
  "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam",
  "19": "West Bengal", "20": "Jharkhand", "21": "Odisha",
  "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "26": "Dadra & Nagar Haveli", "27": "Maharashtra", "28": "Andhra Pradesh",
  "29": "Karnataka", "30": "Goa", "31": "Lakshadweep", "32": "Kerala",
  "33": "Tamil Nadu", "34": "Puducherry", "35": "Andaman & Nicobar",
  "36": "Telangana", "37": "Andhra Pradesh (New)", "38": "Ladakh",
};

export function detectStateFromGSTIN(gstin?: string): string {
  if (!gstin || gstin.length < 2) return "";
  const code = gstin.substring(0, 2);
  return INDIAN_STATES[code] || "";
}

export function isInterStateTransaction(buyerGstin?: string, sellerGstin?: string): boolean {
  if (!buyerGstin || !sellerGstin) return false;
  if (buyerGstin.length < 2 || sellerGstin.length < 2) return false;
  return buyerGstin.substring(0, 2) !== sellerGstin.substring(0, 2);
}