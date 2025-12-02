import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

export const auth = betterAuth({
  database: databaseUrl
    ? new Pool({
        connectionString: databaseUrl,
      })
    : undefined,
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    organization({
      // For this assignment we dont actually send an email.
      // In a real app, wire this to your email provider and include
      // the invitation ID in a link to your Join Organization page.
      async sendInvitationEmail(data) {
        console.log("Organization invitation:", {
          email: data.email,
          id: data.id,
          organizationId: data.organization.id,
        });
      },
    }),
    // Must be last so cookies are handled correctly in Next.js
    nextCookies(),
  ],
});
