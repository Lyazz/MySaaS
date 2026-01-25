
import { createError } from './node_modules/h3/dist/index.mjs';

console.log('Attempting to createError with plain object containing stack...');

const input = {
  message: 'Something went wrong',
  statusCode: 500,
  stack: 'Error: Something went wrong\n    at ...'
};

try {
  const err = createError(input);
  console.log('Successfully created error:', err);
} catch (e) {
  console.error('CRASHED in createError:', e);
}
