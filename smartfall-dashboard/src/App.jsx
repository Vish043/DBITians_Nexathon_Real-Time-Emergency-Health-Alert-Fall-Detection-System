import { useEffect, useMemo, useState } from 'react';
import { fetchEvents as fetchEventsApi } from './api';
import EventsTable from './components/EventsTable';

export default function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadEvents = async () => {
    try {
      setError(null);
      const { data } = await fetchEventsApi();
      if (!data?.success) {
        throw new Error(data?.message ?? 'Failed to fetch events');
      }
      setEvents(data.events ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    const interval = setInterval(loadEvents, 5000);
    return () => clearInterval(interval);
  }, []);

  const rows = useMemo(
    () =>
      events.map((event) => {
        const location = event.location ?? null;
        const mapsUrl =
          location?.lat != null && location?.lng != null
            ? `https://maps.google.com/?q=${location.lat},${location.lng}`
            : null;
        return {
          id: event.id,
          userId: event.userId,
          status: event.status,
          type: event.type ?? 'unknown',
          time: new Date(event.timestamp).toLocaleString(),
          location,
          mapsUrl
        };
      }),
    [events]
  );

  return (
    <div className="app-shell">
      <div className="card">
        <div className="header">
          <h1>SmartFall Alerts</h1>
          <p>Live feed of fall detections across SmartFall users.</p>
        </div>
        {error && <p style={{ color: '#b91c1c' }}>{error}</p>}
        {loading ? <p>Loading events…</p> : <EventsTable events={rows} />}
      </div>
    </div>
  );
}

