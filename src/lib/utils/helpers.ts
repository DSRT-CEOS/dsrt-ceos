export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "N/A";
  const num = Number(amount);
  if (isNaN(num)) return "N/A";
  if (num >= 10000000) return "Rs " + (num / 10000000).toFixed(2) + " Cr";
  if (num >= 100000) return "Rs " + (num / 100000).toFixed(2) + " L";
  if (num >= 1000) return "Rs " + (num / 1000).toFixed(1) + "K";
  return "Rs " + num.toFixed(0);
}

export function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "N/A";
  return "Rs " + Number(amount).toLocaleString("en-IN");
}

export function getDaysLeft(date: Date | string | null | undefined): number {
  if (!date) return 0;
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function getDeadlineColor(daysLeft: number): string {
  if (daysLeft < 0) return "text-red-500";
  if (daysLeft <= 3) return "text-red-400";
  if (daysLeft <= 7) return "text-yellow-400";
  return "text-green-400";
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    DISCOVERED: "border-blue-500/50 text-blue-400 bg-blue-500/10",
    PROCESSING: "border-blue-500/50 text-blue-400 bg-blue-500/10",
    VIEWED: "border-slate-500/50 text-slate-400 bg-slate-500/10",
    SHORTLISTED: "border-yellow-500/50 text-yellow-400 bg-yellow-500/10",
    PREPARING: "border-orange-500/50 text-orange-400 bg-orange-500/10",
    SUBMITTED: "border-purple-500/50 text-purple-400 bg-purple-500/10",
    WON: "border-green-500/50 text-green-400 bg-green-500/10",
    LOST: "border-red-500/50 text-red-400 bg-red-500/10",
    SKIPPED: "border-gray-600/50 text-gray-500 bg-gray-600/10",
    ACTIVE: "border-green-500/50 text-green-400 bg-green-500/10",
    COMPLETED: "border-blue-500/50 text-blue-400 bg-blue-500/10",
    DRAFT: "border-slate-500/50 text-slate-400 bg-slate-500/10",
    PAID: "border-green-500/50 text-green-400 bg-green-500/10",
    PENDING: "border-yellow-500/50 text-yellow-400 bg-yellow-500/10",
    OVERDUE: "border-red-500/50 text-red-400 bg-red-500/10",
    FAILED: "border-red-500/50 text-red-400 bg-red-500/10",
  };
  return colors[status] || "border-slate-500/50 text-slate-400 bg-slate-500/10";
}

export function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.substring(0, length) + "...";
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "N/A";
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}