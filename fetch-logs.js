const https = require('https');
const zlib = require('zlib');

const token = process.env.EXPO_TOKEN;
const projectId = '79f47102-3320-4554-a445-e449b5fea099';
const buildId = 'f7ed553d-c8e8-449c-9532-b6745c0bc9b8';

// First, get the build details to find the artifact URL for the logs
const options = {
  hostname: 'api.expo.dev',
  path: `/v2/projects/${projectId}/builds/${buildId}`,
  headers: {
    'Authorization': `Bearer ${token}`
  }
};

https.get(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const build = JSON.parse(data);
      console.log('Build Status:', build.data.status);
      console.log('Error:', build.data.error);
    } catch (e) {
      console.log('Failed to parse response', data);
    }
  });
}).on('error', (e) => {
  console.error(e);
});
