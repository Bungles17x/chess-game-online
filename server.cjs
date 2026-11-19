/* CommonJS entry point for hosts that insist on a .cjs file.
 *
 * Some Node runtimes (Render's, for one) rewrite a `node server.js` start
 * command to `node server.cjs`, which then fails with MODULE_NOT_FOUND.
 * This file simply loads the real server, so both commands work.
 */
'use strict';

require('./server.js');
