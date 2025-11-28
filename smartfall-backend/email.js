import nodemailer from 'nodemailer';
import { env } from './env.js';

const transport =
  env.email.host && env.email.user && env.email.pass
    ? nodemailer.createTransport({
        host: env.email.host,
        port: env.email.port,
        secure: env.email.port === 465, // true for 465, false for other ports
        auth: {
          user: env.email.user,
          pass: env.email.pass
        },
        // Connection timeout and retry options
        connectionTimeout: 15000, // 15 seconds
        greetingTimeout: 15000,
        socketTimeout: 15000,
        // TLS/SSL options
        requireTLS: env.email.port === 587, // Only require TLS for port 587
        tls: env.email.port === 465 ? {
          rejectUnauthorized: false // For development only
        } : {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2'
        },
        // Debug mode (set to true to see SMTP conversation)
        debug: false,
        logger: false
      })
    : null;

export const sendAlertEmail = async ({ userId, userName, emergencyEmail, timestamp, location }) => {
  console.log('[Email] sendAlertEmail called with:', { userId, userName, emergencyEmail, timestamp });
  
  const mapsUrl =
    location?.lat != null && location?.lng != null
      ? `https://maps.google.com/?q=${location.lat},${location.lng}`
      : null;

  const displayName = userName || userId;
  console.log('[Email] Display name:', displayName);

  const text = [
    '[SmartFall] Fall Alert Detected',
    `User: ${displayName}`,
    `User ID: ${userId}`,
    `Timestamp: ${timestamp}`,
    mapsUrl ? `Location: ${mapsUrl}` : 'Location unavailable'
  ].join('\n');

  if (!transport) {
    console.log('[SmartFall] Email transport not configured. Email contents:\n', text);
    return;
  }

  // Use emergency email from event, or fall back to default from .env
  const recipientEmail = emergencyEmail || env.emergencyContact;
  console.log('[Email] Recipient email:', recipientEmail, '(from event:', emergencyEmail, '| from env:', env.emergencyContact, ')');

  if (!recipientEmail) {
    console.warn('[SmartFall] No emergency contact email available. Cannot send email.');
    return;
  }

  try {
    const mailOptions = {
      to: recipientEmail,
      from: env.email.from,
      subject: `[SmartFall] Fall Alert - ${displayName}`,
      text
    };
    console.log('[Email] Sending email with options:', { ...mailOptions, text: '[email body]' });
    
    const info = await transport.sendMail(mailOptions);
    console.log('[SmartFall] Email sent successfully to', recipientEmail, 'Message ID:', info.messageId);
  } catch (err) {
    console.error('[SmartFall] Failed to send email:', err.message);
    console.error('[SmartFall] Error details:', err);
    throw err;
  }
};

