import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const transport =
  env.email.host && env.email.user && env.email.pass
    ? nodemailer.createTransport({
        host: env.email.host,
        port: env.email.port,
        secure: env.email.port === 465,
        auth: {
          user: env.email.user,
          pass: env.email.pass
        }
      })
    : null;

export const sendAlertEmail = async ({ contactEmail, userName, userId, timestamp, lat, lng }) => {
  if (!contactEmail) {
    console.warn('No contact email provided, skipping alert email.');
    return;
  }

  const subject = `SmartFall Alert for ${userName}`;
  const mapsUrl = `https://maps.google.com/?q=${lat ?? ''},${lng ?? ''}`;
  const text = [
    `SmartFall detected a fall for ${userName} (${userId}).`,
    `Time: ${timestamp}`,
    lat && lng ? `Location: ${lat.toFixed(5)}, ${lng.toFixed(5)}` : 'Location: unavailable',
    `Map: ${mapsUrl}`
  ]
    .filter(Boolean)
    .join('\n');

  if (!transport) {
    console.log('[SmartFall] Email transport not configured. Email contents:\n', text);
    return;
  }

  await transport.sendMail({
    to: contactEmail,
    from: env.email.from,
    subject,
    text
  });
};

