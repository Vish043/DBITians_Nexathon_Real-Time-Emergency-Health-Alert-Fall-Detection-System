import express from 'express';
import cors from 'cors';
import { env } from './env.js';
import eventRoutes from './routes/events.js';

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

app.use('/api/events', eventRoutes);

app.use((err, _req, res, _next) => {
  console.error('Unhandled error', err);
  res.status(500).json({ message: 'Internal server error' });
});

app.listen(env.port, () => {
  console.log(`SmartFall backend listening on ${env.port}`);
});

