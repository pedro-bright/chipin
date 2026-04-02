/**
 * Balance Computation Engine for TidyTab Groups
 *
 * Two modes:
 *
 * 1. ATTENDEE MODE (bills with attendees):
 *    - Host FRONTED the total (credit)
 *    - Each attendee OWES their expected_amount (debit)
 *    - Each contribution is a CREDIT (paying off debt)
 *    → net[person] = sum(credits) - sum(debits)
 *    → Positive = owed money, Negative = owes money
 *
 * 2. LEGACY MODE (bills without attendees):
 *    - Host FRONTED the total (credit)
 *    - Each contribution is a DEBIT (what they paid = what they owe)
 *    → Same as before for backward compatibility
 *
 * Member identity matching is by name (case-insensitive, trimmed).
 */

export interface Transfer {
  from: string; // person who owes
  to: string; // person who is owed
  amount: number; // always positive
}

export interface BalanceSummary {
  /** Net balance for each member. Positive = owed money, negative = owes money */
  netBalances: Record<string, number>;
  /** Simplified list of transfers to settle all debts */
  transfers: Transfer[];
  /** Total amount of money that flowed through the group */
  totalVolume: number;
}

interface AttendeeData {
  member_name: string;
  expected_amount: number;
}

interface BillData {
  host_name: string;
  total: number;
  contributions: { person_name: string; amount: number }[];
  attendees?: AttendeeData[];
}

interface SettlementData {
  from_name: string;
  to_name: string;
  amount: number;
}

/** Normalize name for matching: lowercase + trim */
function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * Build a canonical name map: normalized → first-seen casing.
 * e.g., "mike" → "Mike" (uses the first occurrence's casing)
 */
function buildNameMap(bills: BillData[], settlements: SettlementData[]): Map<string, string> {
  const map = new Map<string, string>();

  for (const bill of bills) {
    const key = normalizeName(bill.host_name);
    if (!map.has(key)) map.set(key, bill.host_name.trim());

    for (const c of bill.contributions) {
      const ck = normalizeName(c.person_name);
      if (!map.has(ck)) map.set(ck, c.person_name.trim());
    }

    if (bill.attendees) {
      for (const a of bill.attendees) {
        const ak = normalizeName(a.member_name);
        if (!map.has(ak)) map.set(ak, a.member_name.trim());
      }
    }
  }

  for (const s of settlements) {
    const fk = normalizeName(s.from_name);
    if (!map.has(fk)) map.set(fk, s.from_name.trim());
    const tk = normalizeName(s.to_name);
    if (!map.has(tk)) map.set(tk, s.to_name.trim());
  }

  return map;
}

/**
 * Compute net balances for all group members from bills and settlements.
 *
 * ATTENDEE MODE (bill.attendees exists and is non-empty):
 *   credit[host] += total          (host fronted the bill)
 *   debit[attendee] += expected    (each attendee owes their share)
 *   credit[contributor] += amount  (contributions pay off debt)
 *
 * LEGACY MODE (no attendees):
 *   credit[host] += total          (host fronted the bill)
 *   debit[contributor] += amount   (contributions = what they owe)
 *
 * net[person] = sum(credits) - sum(debits)
 * Positive = owed money, Negative = owes money
 */
export function computeBalances(
  bills: BillData[],
  settlements: SettlementData[] = []
): BalanceSummary {
  const nameMap = buildNameMap(bills, settlements);
  const net: Record<string, number> = {};

  let totalVolume = 0;

  for (const bill of bills) {
    const hostKey = normalizeName(bill.host_name);
    totalVolume += Number(bill.total);

    // Host fronted the total → credit
    net[hostKey] = (net[hostKey] || 0) + Number(bill.total);

    if (bill.attendees && bill.attendees.length > 0) {
      // ═══ ATTENDEE MODE ═══
      // Each attendee owes their expected share → debit
      for (const a of bill.attendees) {
        const ak = normalizeName(a.member_name);
        net[ak] = (net[ak] || 0) - Number(a.expected_amount);
      }
      // Each contribution pays off debt → credit
      for (const c of bill.contributions) {
        const ck = normalizeName(c.person_name);
        net[ck] = (net[ck] || 0) + Number(c.amount);
      }
    } else {
      // ═══ LEGACY MODE ═══
      // Contributions are debits (backward compatible)
      for (const c of bill.contributions) {
        const ck = normalizeName(c.person_name);
        net[ck] = (net[ck] || 0) - Number(c.amount);
      }
    }
  }

  // Apply settlements: from_name paid to_name
  for (const s of settlements) {
    const fromKey = normalizeName(s.from_name);
    const toKey = normalizeName(s.to_name);
    const amount = Number(s.amount);

    // from_name paid, so their debt decreases (net goes up)
    net[fromKey] = (net[fromKey] || 0) + amount;
    // to_name received, so their credit decreases (net goes down)
    net[toKey] = (net[toKey] || 0) - amount;
  }

  // Convert back to display names and round
  const netBalances: Record<string, number> = {};
  for (const [key, value] of Object.entries(net)) {
    const displayName = nameMap.get(key) || key;
    const rounded = Math.round(value * 100) / 100;
    if (Math.abs(rounded) > 0.005) {
      netBalances[displayName] = rounded;
    }
  }

  // Simplify debts using minimum cash flow algorithm
  const transfers = simplifyDebts(net, nameMap);

  return { netBalances, transfers, totalVolume };
}

/**
 * Minimum cash flow algorithm to simplify debts.
 *
 * 1. Separate into creditors (net > 0) and debtors (net < 0)
 * 2. Sort both by absolute amount (descending)
 * 3. Match largest debtor with largest creditor
 * 4. Transfer min(|debt|, credit)
 * 5. Remove settled, repeat
 */
function simplifyDebts(
  net: Record<string, number>,
  nameMap: Map<string, string>
): Transfer[] {
  const creditors: { key: string; amount: number }[] = [];
  const debtors: { key: string; amount: number }[] = [];

  for (const [key, value] of Object.entries(net)) {
    const rounded = Math.round(value * 100) / 100;
    if (rounded > 0.005) {
      creditors.push({ key, amount: rounded });
    } else if (rounded < -0.005) {
      debtors.push({ key, amount: -rounded }); // store as positive
    }
  }

  // Sort descending by amount
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  const transfers: Transfer[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];

    const transferAmount = Math.min(creditor.amount, debtor.amount);
    const rounded = Math.round(transferAmount * 100) / 100;

    if (rounded > 0) {
      transfers.push({
        from: nameMap.get(debtor.key) || debtor.key,
        to: nameMap.get(creditor.key) || creditor.key,
        amount: rounded,
      });
    }

    creditor.amount -= transferAmount;
    debtor.amount -= transferAmount;

    if (creditor.amount < 0.005) ci++;
    if (debtor.amount < 0.005) di++;
  }

  return transfers;
}
