/**
 * Standalone admin + debug-user seed script.
 * Ensures the default admin and ahmed users exist. Safe to run multiple times.
 *
 * Local:   npm run seed:admin
 * Railway: railway run npm run seed:admin
 */

import { seedAdminUser, seedAhmedUser } from "../server/seed";

await seedAdminUser();
await seedAhmedUser();
process.exit(0);
