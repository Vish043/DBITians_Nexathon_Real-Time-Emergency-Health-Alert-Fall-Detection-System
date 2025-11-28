import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: process.env.PORT ? Number(process.env.PORT) : 4000,
  baseUrl: process.env.BASE_URL ?? 'http://localhost:4000',
  email: {
    host: process.env.SMTP_HOST ?? '',
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.EMAIL_FROM ?? 'alerts@smartfall.local'
  },
  dashboardOrigin: process.env.DASHBOARD_ORIGIN ?? '*'
};

