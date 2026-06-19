import { defineConfig } from 'prisma/config';

export default defineConfig({
  datasource: {
    url: "postgresql://neondb_owner:npg_9L3btpSmMsCQ@ep-mute-leaf-atsnq5pg-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
  },
});