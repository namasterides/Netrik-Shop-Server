/**
 * SyncService
 * 
 * This is a mocked service layer that you must replace with your actual backend SDK.
 * For example, if you are using Supabase:
 *   import { supabase } from './supabaseClient';
 *   // supabase.channel('tables').on('postgres_changes', ...).subscribe();
 */

type TableUpdateListener = (tableId: string, status: string) => void;

class SyncService {
  private listeners: TableUpdateListener[] = [];

  // MOCK: Simulate real-time updates from the server
  constructor() {
    // Simulate someone paying on the web app after 30 seconds
    setTimeout(() => {
      this.notifyListeners('2', 'Paid'); // Table 12 paid
    }, 30000);
  }

  // Subscribe to real-time table status updates
  subscribeToTableUpdates(callback: TableUpdateListener) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  // Notify local listeners (internal mock helper)
  private notifyListeners(tableId: string, status: string) {
    this.listeners.forEach(listener => listener(tableId, status));
  }

  // Called when the server app successfully processes a Tap to Pay
  async updatePaymentStatus(tableId: string, status: string): Promise<void> {
    // 1. Send update to your actual backend here
    // await fetch('https://your-api.com/update-payment', { ... });
    
    // 2. Notify local app state
    this.notifyListeners(tableId, status);
  }

  // Called by Stripe Terminal to fetch the connection token
  async fetchStripeConnectionToken(): Promise<string> {
    // MOCK: Replace with your actual backend endpoint that returns a connection token from Stripe
    /*
    const response = await fetch('https://your-api.com/stripe/connection-token', { method: 'POST' });
    const { secret } = await response.json();
    return secret;
    */
    return 'mock_connection_token';
  }

  // Called by Stripe Terminal when it needs to capture a payment
  async fetchPaymentIntentClientSecret(tableId: string, amount: number): Promise<string> {
    // MOCK: Replace with actual backend call to create a PaymentIntent
    /*
    const response = await fetch('https://your-api.com/stripe/create-payment-intent', {
      method: 'POST',
      body: JSON.stringify({ tableId, amount })
    });
    const { client_secret } = await response.json();
    return client_secret;
    */
    return 'pi_123_secret_mock';
  }
}

export const syncService = new SyncService();
