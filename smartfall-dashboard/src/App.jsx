import { useEffect, useMemo, useState } from 'react';
import { fetchEvents as fetchEventsApi, deleteEvent as deleteEventApi, updateEventStatus as updateEventStatusApi } from './api';
import EventsTable from './components/EventsTable';
import StatisticsCards from './components/StatisticsCards';
import FilterBar from './components/FilterBar';
import EventDetailsModal from './components/EventDetailsModal';

export default function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    severity: 'all',
    status: 'all',
    sortBy: 'time-desc'
  });

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

  const handleDelete = async (eventId) => {
    try {
      const { data } = await deleteEventApi(eventId);
      if (!data?.success) {
        throw new Error(data?.message ?? 'Failed to delete event');
      }
      // Remove the event from local state immediately
      setEvents((prevEvents) => prevEvents.filter((event) => event.id !== eventId));
      // Reload events to ensure consistency
      await loadEvents();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStatusChange = async (eventId, newStatus) => {
    try {
      const { data } = await updateEventStatusApi(eventId, newStatus);
      if (!data?.success) {
        throw new Error(data?.message ?? 'Failed to update status');
      }
      // Update local state
      setEvents((prevEvents) =>
        prevEvents.map((event) =>
          event.id === eventId ? { ...event, status: newStatus } : event
        )
      );
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadEvents();
    const interval = setInterval(loadEvents, 5000);
    return () => clearInterval(interval);
  }, []);

  const rows = useMemo(() => {
    // Transform events
    let transformed = events.map((event) => {
      const location = event.location ?? null;
      const mapsUrl =
        location?.lat != null && location?.lng != null
          ? `https://maps.google.com/?q=${location.lat},${location.lng}`
          : null;
      return {
        id: event.id,
        userId: event.userId,
        userName: event.userName || null,
        status: event.status,
        type: event.type ?? 'unknown',
        time: new Date(event.timestamp).toLocaleString(),
        timestamp: event.timestamp,
        location,
        mapsUrl,
        severity: event.severity || { level: 'UNKNOWN' },
        severityScore: event.severityScore || null,
        severityMetrics: event.severityMetrics || null
      };
    });

    // Apply filters
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      transformed = transformed.filter(
        (e) =>
          e.userId?.toLowerCase().includes(searchLower) ||
          e.userName?.toLowerCase().includes(searchLower)
      );
    }

    if (filters.severity !== 'all') {
      transformed = transformed.filter(
        (e) => e.severity?.level === filters.severity
      );
    }

    if (filters.status !== 'all') {
      transformed = transformed.filter((e) => e.status === filters.status);
    }

    // Apply sorting
    transformed.sort((a, b) => {
      switch (filters.sortBy) {
        case 'time-asc':
          return new Date(a.timestamp) - new Date(b.timestamp);
        case 'time-desc':
          return new Date(b.timestamp) - new Date(a.timestamp);
        case 'severity-desc': {
          const order = { HIGH: 3, MEDIUM: 2, LOW: 1, UNKNOWN: 0 };
          return (order[b.severity?.level] || 0) - (order[a.severity?.level] || 0);
        }
        case 'severity-asc': {
          const order = { HIGH: 3, MEDIUM: 2, LOW: 1, UNKNOWN: 0 };
          return (order[a.severity?.level] || 0) - (order[b.severity?.level] || 0);
        }
        default:
          return 0;
      }
    });

    return transformed;
  }, [events, filters]);

  return (
    <div className="app-shell">
      <div className="card">
        <div className="header">
          <h1>SmartFall Alerts</h1>
          <p>Live feed of fall detections across SmartFall users.</p>
        </div>
        
        {error && (
          <div style={{ 
            background: '#fee2e2', 
            color: '#991b1b', 
            padding: '12px 16px', 
            borderRadius: '8px', 
            marginBottom: '20px' 
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
            Loading events…
          </div>
        ) : (
          <>
            <StatisticsCards events={events} />
            <FilterBar filters={filters} onFilterChange={setFilters} />
            <div style={{ marginBottom: '12px', color: '#64748b', fontSize: '14px' }}>
              Showing {rows.length} of {events.length} events
            </div>
            <EventsTable 
              events={rows} 
              onDelete={handleDelete}
              onViewDetails={setSelectedEvent}
              onStatusChange={handleStatusChange}
            />
          </>
        )}
      </div>

      <EventDetailsModal
        event={selectedEvent}
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
      />
    </div>
  );
}

