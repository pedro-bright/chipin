export interface Bill {
  id: string;
  slug: string;
  host_key: string;
  host_name: string;
  restaurant_name: string | null;
  receipt_image_url: string | null;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  person_count: number | null;
  venmo_handle: string | null;
  zelle_info: string | null;
  cashapp_handle: string | null;
  paypal_handle: string | null;
  default_mode: 'claim' | 'split' | 'custom' | null;
  status: 'draft' | 'published' | 'settled';
  created_at: string;
  updated_at: string;
  // v2 fields
  host_email: string | null;
  host_user_id: string | null;
  email_notifications: boolean;
  last_reminder_sent_at: string | null;
  host_streak?: number;
}

export interface UserBadge {
  id: string;
  user_email: string;
  badge_type: string;
  badge_data: Record<string, unknown>;
  earned_at: string;
}

export interface BillItem {
  id: string;
  bill_id: string;
  name: string;
  price: number;
  quantity: number;
  sort_order: number;
  shared_by: number | null;
  created_at: string;
}

export interface Contribution {
  id: string;
  bill_id: string;
  person_name: string;
  amount: number;
  payment_method: string;
  claimed_item_ids: string[];
  note: string | null;
  created_at: string;
}

export interface ParsedReceipt {
  restaurant: string;
  items: { name: string; price: number; qty: number }[];
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
}

export interface BillWithItems extends Bill {
  bill_items: BillItem[];
  contributions: Contribution[];
  bill_attendees?: BillAttendee[];
  group_id?: string | null;
}

// ── Bill Attendees ────────────────────────────────────────────────────

export interface BillAttendee {
  id: string;
  bill_id: string;
  group_member_id: string;
  member_name: string;
  expected_amount: number | null;
  created_at: string;
}

// ── Groups ────────────────────────────────────────────────────────────

export interface Group {
  id: string;
  name: string;
  emoji: string;
  slug: string;
  invite_code: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  name: string;
  email: string | null;
  venmo_handle: string | null;
  zelle_info: string | null;
  cashapp_handle: string | null;
  paypal_handle: string | null;
  preferred_payment: string;
  role: 'admin' | 'member';
  joined_at: string;
}

export interface GroupWithMembers extends Group {
  group_members: GroupMember[];
}

export interface GroupWithMembersAndBills extends GroupWithMembers {
  bills: BillWithItems[];
}

// ── Settlements ───────────────────────────────────────────────────────

export interface Settlement {
  id: string;
  group_id: string;
  from_name: string;
  to_name: string;
  amount: number;
  settled_at: string;
}
