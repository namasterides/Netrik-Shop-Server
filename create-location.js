const stripe = require('stripe')('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');

async function createLocation() {
  try {
    const locations = await stripe.terminal.locations.list({ limit: 1 });
    if (locations.data.length > 0) {
      console.log('Existing Location ID:', locations.data[0].id);
      return;
    }

    const location = await stripe.terminal.locations.create({
      display_name: 'Main Restaurant',
      address: {
        line1: '123 Main Street',
        city: 'San Francisco',
        state: 'CA',
        country: 'US',
        postal_code: '94111',
      }
    });
    console.log('Created Location ID:', location.id);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

createLocation();
