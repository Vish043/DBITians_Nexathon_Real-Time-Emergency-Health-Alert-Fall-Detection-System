import express from 'express';
import cors from 'cors';
import { env } from './env.js';
import eventRoutes from './routes/events.js';
import authRoutes from './routes/auth.js';
import emergencyLinksRoutes from './routes/emergencyLinks.js';
import userRoutes from './routes/users.js';
import fixLinksRoutes from './routes/fix-links.js';
import diagnosticsRoutes from './routes/diagnostics.js';
import verifyEventsRoutes from './routes/verify-events.js';
import migrateEventsRoutes from './routes/migrate-events.js';

const app = express();

// CORS configuration - allow all origins for development (mobile app + dashboard)
app.use(cors({ 
  origin: true, // Allow all origins for development
  credentials: true 
}));
app.use(express.json());

app.get('/', (_req, res) => {
  res.send('SmartFall backend running');
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public routes (no authentication required)
app.use('/api/auth', authRoutes);
app.use('/api/emergency-links', emergencyLinksRoutes);
app.use('/api/users', userRoutes);
app.use('/api/fix-links', fixLinksRoutes); // Utility route to fix email case issues
app.use('/api/verify-events', verifyEventsRoutes); // Debug endpoint to verify events
app.use('/api/migrate-events', migrateEventsRoutes); // Migrate events to correct userId

// Protected routes (authentication required)
app.use('/api/events', eventRoutes);
app.use('/api/diagnostics', diagnosticsRoutes); // Diagnostic endpoint

app.use((err, _req, res, _next) => {
  console.error('========================================');
  console.error('Unhandled error in Express middleware');
  console.error('Error name:', err.name);
  console.error('Error message:', err.message);
  console.error('Error stack:', err.stack);
  console.error('========================================');
  res.status(500).json({ 
    message: 'Internal server error',
    error: err.message || 'Unknown error'
  });
});

app.listen(env.port, () => {
  console.log(`SmartFall backend listening on ${env.port}`);
});

