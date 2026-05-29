export const apiRoutes = {
  login: '/auth/server/login',
  session: '/auth/session',
  tables: '/tables/active',
  tableDetails: (tableId: string) => `/tables/${tableId}`,
  stripeConnectionToken: '/payments/terminal/connection-token',
  paymentIntent: '/payments/terminal/payment-intent',
  paymentStatus: (tableId: string) => `/tables/${tableId}/payment/status`,
  splitBill: (tableId: string) => `/tables/${tableId}/split`,
  whatsappReceipt: (tableId: string) => `/tables/${tableId}/receipt/whatsapp`,
  updateKitchenStatus: (tableId: string) => `/tables/${tableId}/kitchen/update`,
  markTableServed: (tableId: string) => `/tables/${tableId}/served`,
};
