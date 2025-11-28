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

const getEmailTemplate = ({ displayName, userId, timestamp, severity, severityMetrics, mapsUrl, location }) => {
  const severityColor = 
    severity === 'HIGH' ? '#dc2626' : 
    severity === 'MEDIUM' ? '#d97706' : 
    severity === 'LOW' ? '#16a34a' : '#6b7280';
  
  const formattedTime = new Date(timestamp).toLocaleString();
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SmartFall Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6; padding: 20px;">
    <tr>
      <td align="center">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">⚠️ SmartFall Alert</h1>
              <p style="margin: 8px 0 0; color: #e0e7ff; font-size: 16px;">Fall Detection System</p>
            </td>
          </tr>
          
          <!-- Alert Content -->
          <tr>
            <td style="padding: 32px 24px;">
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
                <h2 style="margin: 0 0 8px; color: #991b1b; font-size: 20px; font-weight: 700;">Fall Detected</h2>
                <p style="margin: 0; color: #7f1d1d; font-size: 14px;">A potential fall has been detected and requires immediate attention.</p>
              </div>
              
              <!-- User Information -->
              <div style="margin-bottom: 24px;">
                <h3 style="margin: 0 0 12px; color: #1f2937; font-size: 18px; font-weight: 600;">User Information</h3>
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 140px;">Name:</td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 600;">${displayName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">User ID:</td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px;">${userId}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Time:</td>
                    <td style="padding: 8px 0; color: #111827; font-size: 14px;">${formattedTime}</td>
                  </tr>
                </table>
              </div>
              
              <!-- Severity Information -->
              ${severity ? `
              <div style="margin-bottom: 24px; background-color: #f9fafb; border-radius: 8px; padding: 20px;">
                <h3 style="margin: 0 0 12px; color: #1f2937; font-size: 18px; font-weight: 600;">Severity Assessment</h3>
                <div style="display: inline-block; background-color: ${severityColor}; color: #ffffff; padding: 8px 16px; border-radius: 20px; font-weight: 700; font-size: 14px; margin-bottom: 16px;">
                  ${severity} SEVERITY
                </div>
                ${severityMetrics ? `
                <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 12px;">
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Impact Force:</td>
                    <td style="padding: 6px 0; color: #111827; font-size: 13px; font-weight: 600;">${severityMetrics.accelerationPeak} m/s²</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Rotation:</td>
                    <td style="padding: 6px 0; color: #111827; font-size: 13px; font-weight: 600;">${severityMetrics.rotationAngle} rad/s</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Time Still:</td>
                    <td style="padding: 6px 0; color: #111827; font-size: 13px; font-weight: 600;">${(severityMetrics.timeStill / 1000).toFixed(1)} seconds</td>
                  </tr>
                  ${severityMetrics.heightEstimate ? `
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280; font-size: 13px;">Fall Height:</td>
                    <td style="padding: 6px 0; color: #111827; font-size: 13px; font-weight: 600;">${severityMetrics.heightEstimate} meters</td>
                  </tr>
                  ` : ''}
                </table>
                ` : ''}
              </div>
              ` : ''}
              
              <!-- Location Information -->
              <div style="margin-bottom: 24px;">
                <h3 style="margin: 0 0 12px; color: #1f2937; font-size: 18px; font-weight: 600;">Location</h3>
                ${mapsUrl && location ? `
                <p style="margin: 0 0 12px; color: #6b7280; font-size: 14px;">
                  Coordinates: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}
                </p>
                <a href="${mapsUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                  📍 View on Google Maps
                </a>
                ` : `
                <p style="margin: 0; color: #6b7280; font-size: 14px;">Location unavailable</p>
                `}
              </div>
              
              <!-- Footer -->
              <div style="border-top: 1px solid #e5e7eb; padding-top: 24px; margin-top: 24px;">
                <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                  This is an automated alert from SmartFall Fall Detection System.<br>
                  Please respond immediately if you are able to contact the user.
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

export const sendAlertEmail = async ({ userId, userName, emergencyEmail, timestamp, location, severity, severityMetrics }) => {
  console.log('[Email] sendAlertEmail called with:', { userId, userName, emergencyEmail, timestamp, severity });
  
  const mapsUrl =
    location?.lat != null && location?.lng != null
      ? `https://maps.google.com/?q=${location.lat},${location.lng}`
      : null;

  const displayName = userName || userId;
  console.log('[Email] Display name:', displayName);

  // Plain text version for email clients that don't support HTML
  const severityText = severity ? `\nSeverity: ${severity}` : '';
  const metricsText = severityMetrics 
    ? `\nImpact: ${severityMetrics.accelerationPeak} m/s² | Rotation: ${severityMetrics.rotationAngle} rad/s | Still: ${(severityMetrics.timeStill / 1000).toFixed(1)}s${severityMetrics.heightEstimate ? ` | Height: ${severityMetrics.heightEstimate}m` : ''}`
    : '';

  const text = [
    '[SmartFall] Fall Alert Detected',
    `User: ${displayName}`,
    `User ID: ${userId}`,
    `Timestamp: ${timestamp}${severityText}${metricsText}`,
    mapsUrl ? `Location: ${mapsUrl}` : 'Location unavailable'
  ].join('\n');

  // HTML version with template
  const html = getEmailTemplate({
    displayName,
    userId,
    timestamp,
    severity,
    severityMetrics,
    mapsUrl,
    location
  });

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
      subject: `[SmartFall] Fall Alert - ${displayName}${severity ? ` (${severity} Severity)` : ''}`,
      text,
      html
    };
    console.log('[Email] Sending email with options:', { ...mailOptions, text: '[email body]', html: '[HTML template]' });
    
    const info = await transport.sendMail(mailOptions);
    console.log('[SmartFall] Email sent successfully to', recipientEmail, 'Message ID:', info.messageId);
  } catch (err) {
    console.error('[SmartFall] Failed to send email:', err.message);
    console.error('[SmartFall] Error details:', err);
    throw err;
  }
};

