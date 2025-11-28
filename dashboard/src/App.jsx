import { useEffect, useMemo, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

export default function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEvents = async () => {
    try {
      setError(null);
      const res = await fetch(`${API_BASE}/api/events`);
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 10000);
    return () => clearInterval(interval);
  }, []);

  const rows = useMemo(
    () =>
      events.map((event) => ({
        id: event.id,
        user: event.user_name ?? event.userName,
        status: event.status,
        time: new Date(event.fall_detected_at ?? event.fallDetectedAt).toLocaleString(),
        severity: event.severity,
        location: event.location_lat
          ? { lat: event.location_lat, lng: event.location_lng }
          : event.location,
        mapsUrl: event.location_lat
          ? `https://maps.google.com/?q=${event.location_lat},${event.location_lng}`
          : event.location
          ? `https://maps.google.com/?q=${event.location.lat},${event.location.lng}`
          : null
      })),
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
        {loading ? (
          <p>Loading events…</p>
        ) : rows.length === 0 ? (
          <div className="empty-state">No events yet.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Location</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((event) => (
                <tr key={event.id}>
                  <td>{event.time}</td>
                  <td>{event.user}</td>
                  <td>{event.severity}</td>
                  <td>
                    <span className={`status-pill ${event.status}`}>{event.status}</span>
                  </td>
                  <td>
                    {event.mapsUrl ? (
                      <a className="map-link" href={event.mapsUrl} target="_blank" rel="noreferrer">
                        View
                      </a>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

