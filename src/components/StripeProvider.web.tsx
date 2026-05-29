import React from 'react';

// This is a dummy provider for the web platform, as Stripe Terminal only supports native (iOS/Android)
export const StripeTerminalProvider = ({ children }: any) => {
  return <>{children}</>;
};

export const useStripeTerminal = () => {
  return {
    discoverReaders: async () => ({ readers: [], error: { message: 'Not supported on Web' } }),
    connectLocalMobileReader: async () => ({ error: { message: 'Not supported on Web' } }),
    collectPaymentMethod: async () => ({ error: { message: 'Not supported on Web' } }),
    processPayment: async () => ({ error: { message: 'Not supported on Web' } }),
    cancelCollectPaymentMethod: async () => {},
  };
};
