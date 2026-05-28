export type TableSummary = {
  id: string;
  tableNo: string;
  status: string;
  amount?: number;
  currency?: string;
  startedAt?: string;
  updatedAt?: string;
  timeLabel?: string;
};

export type OrderItem = {
  id: string;
  name: string;
  qty: number;
  price: number;
  addOns?: string[];
  notes?: string;
  status?: string;
};

export type BillingSummary = {
  subtotal?: number;
  tax?: number;
  discount?: number;
  serviceCharge?: number;
  total?: number;
  currency?: string;
};

export type TableDetails = {
  id: string;
  tableNo: string;
  status: string;
  sessionStartTime?: string;
  sessionId?: string;
  guestCount?: number;
  items: OrderItem[];
  billing?: BillingSummary;
};

export type PaymentContext = {
  tableId: string;
  amount?: number;
  currency?: string;
  guestId?: string;
};

export type PaymentResult = {
  paymentId: string;
  tableId: string;
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  remainingBalance?: number;
  createdAt?: string;
};

export type SplitMode = 'item';

export type SplitGuest = {
  id: string;
  label: string;
  amount?: number;
  itemIds?: string[];
  status?: string;
};

export type SplitBillPayload = {
  tableId: string;
  mode: SplitMode;
  guestCount: number;
  currency?: string;
  total?: number;
  guests: SplitGuest[];
  sharedItemIds?: string[];
  unassignedItemIds?: string[];
};

export type Session = {
  token: string;
  serverId?: string;
  restaurantId?: string;
  displayName?: string;
};
