import React from 'react';

// Using dummy provider since native Stripe Terminal fails to build on EAS for Android
export const StripeTerminalProvider = ({ children }: any) => {
  return <>{children}</>;
};

export const useStripeTerminal = () => {
  return {
    discoverReaders: async () => ({ readers: [], error: { message: 'Not supported' } }),
    connectLocalMobileReader: async () => ({ error: { message: 'Not supported' } }),
    collectPaymentMethod: async () => ({ error: { message: 'Not supported' } }),
    processPayment: async () => ({ error: { message: 'Not supported' } }),
    cancelCollectPaymentMethod: async () => {},
  };
};
