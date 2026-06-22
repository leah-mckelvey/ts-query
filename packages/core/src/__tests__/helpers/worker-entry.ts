#!/usr/bin/env node
/**
 * Standalone worker entry point for multi-process testing.
 * This file can be executed directly by Node.js via cluster.fork().
 */

import './worker.js';

// Keep the process alive
process.on('disconnect', () => {
  process.exit(0);
});
