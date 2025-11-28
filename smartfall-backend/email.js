import nodemailer from 'nodemailer';
import { env } from './env.js';

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

export const sendAlertEmail = async ({ userId, timestamp, location }) => {
  const mapsUrl =
    location?.lat != null && location?.lng != null
      ? `https://maps.google.com/?q=${location.lat},${location.lng}`
      : null;

  const text = [
    '[SmartFall] Fall Alert Detected',
    `User ID: ${userId}`,
    `Timestamp: ${timestamp}`,
    mapsUrl ? `Location: ${mapsUrl}` : 'Location unavailable'
  ].join('\n');

  if (!transport) {
    console.log('[SmartFall] Email transport not configured. Email contents:\n', text);
    return;
  }

  await transport.sendMail({
    to: env.emergencyContact,
    from: env.email.from,
    subject: '[SmartFall] Fall Alert Detected',
    text
  });
};

