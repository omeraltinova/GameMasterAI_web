
import { checkRateLimit } from '../lib/rate-limit';

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  console.log('Testing Rate Limit Logic...');

  const userId = 'test-user-1';
  const limit = 5;
  const windowMs = 1000; // 1 second

  console.log(`Limit: ${limit}, Window: ${windowMs}ms`);

  // 1. Consume all tokens
  for (let i = 1; i <= limit; i++) {
    const result = checkRateLimit(userId, limit, windowMs);
    console.log(`Request ${i}: success=${result.success}, remaining=${result.remaining}`);
    if (!result.success) {
      console.error('FAIL: Should have succeeded');
      process.exit(1);
    }
  }

  // 2. Exceed limit
  const exceedResult = checkRateLimit(userId, limit, windowMs);
  console.log(`Request ${limit + 1} (should fail): success=${exceedResult.success}, remaining=${exceedResult.remaining}`);

  if (exceedResult.success) {
    console.error('FAIL: Should have failed');
    process.exit(1);
  }

  // 3. Wait for reset
  console.log('Waiting for window to reset...');
  await sleep(windowMs + 100);

  // 4. Try again
  const retryResult = checkRateLimit(userId, limit, windowMs);
  console.log(`Request after wait: success=${retryResult.success}, remaining=${retryResult.remaining}`);

  if (!retryResult.success) {
    console.error('FAIL: Should have succeeded after reset');
    process.exit(1);
  }

  console.log('SUCCESS: Rate limiter passed all tests');
}

runTest().catch(console.error);
