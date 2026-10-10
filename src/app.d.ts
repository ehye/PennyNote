import type { D1Database } from '@cloudflare/workers-types';
declare global {
  namespace App {
    interface Platform {
      env: {
        DB: D1Database;
        ACCESS_TEAM_DOMAIN?: string;
        ACCESS_AUD?: string;
        OWNER_EMAIL?: string;
        REPORT_TIMEZONE?: string;
      };
    }
  }
}
export {};
