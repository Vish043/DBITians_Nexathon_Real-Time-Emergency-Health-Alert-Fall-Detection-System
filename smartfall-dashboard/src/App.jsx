import { useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from './contexts/AuthContext';
import { fetchEvents as fetchEventsApi, deleteEvent as deleteEventApi, updateEventStatus as updateEventStatusApi, checkBackendHealth } from './api';
import EventsTable from './components/EventsTable';
import StatisticsCards from './components/StatisticsCards';
import FilterBar from './components/FilterBar';
import EventDetailsModal from './components/EventDetailsModal';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

export default function App() {
  const { user, loading: authLoading, logout } = useAuth();
  const [showSignup, setShowSignup] = useState(false);
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

  // Define loadEvents function with useCallback - must be defined before useEffect
  const loadEvents = useCallback(async () => {
    if (!user) return; // Don't load if not authenticated
    
    try {
      setError(null);
      console.log('[Dashboard] ========================================');
      console.log('[Dashboard] Fetching events...');
      console.log('[Dashboard] Logged in as:', user.email);
      console.log('[Dashboard] User UID:', user.uid);
      console.log('[Dashboard] API Base URL:', import.meta.env.VITE_API_URL || 'http://localhost:4000');
      console.log('[Dashboard] ========================================');
      const { data } = await fetchEventsApi();
      console.log('[Dashboard] API response:', { 
        success: data?.success, 
        eventCount: data?.events?.length,
        message: data?.message,
        accessibleUserCount: data?.accessibleUserCount,
        queriedUserIds: data?.queriedUserIds
      });
      
      // Log the actual userId being queried
      if (data?.queriedUserIds && data.queriedUserIds.length > 0) {
        console.log('[Dashboard] 🔍 Querying events for userId:', data.queriedUserIds[0]);
        console.log('[Dashboard] 🔍 Make sure events in Firestore have this exact userId!');
      }
      
      if (!data?.success) {
        throw new Error(data?.message ?? 'Failed to fetch events');
      }
      
      const eventsList = data.events ?? [];
      console.log('[Dashboard] Received', eventsList.length, 'events from API');
      
      if (eventsList.length === 0) {
        console.warn('[Dashboard] ⚠️ No events found!');
        console.warn('[Dashboard] ⚠️ Accessible user count:', data.accessibleUserCount);
        console.warn('[Dashboard] ⚠️ Queried user IDs:', data.queriedUserIds);
        console.warn('[Dashboard] ⚠️ Queried userId:', data.queriedUserId || data.queriedUserIds?.[0]);
        console.warn('[Dashboard] ⚠️ Logged in as:', user.email);
        console.warn('[Dashboard] ⚠️ Possible issues:');
        console.warn('[Dashboard]   1. Events have different userId than link');
        console.warn('[Dashboard]   2. No events have been created yet');
        console.warn('[Dashboard]   3. Check backend logs for userId mismatch');
        console.warn('[Dashboard] ⚠️ SOLUTION: Make sure mobile app uses the same userId when creating events!');
        if (data.message) {
          console.warn('[Dashboard] ⚠️ Message:', data.message);
        }
      }
      
      // Merge with existing events from localStorage to preserve history
      setEvents((prevEvents) => {
        // Create a map of existing events by ID for quick lookup
        const existingMap = new Map(prevEvents.map(e => [e.id, e]));
        
        // Add/update events from API
        eventsList.forEach(newEvent => {
          existingMap.set(newEvent.id, newEvent);
        });
        
        // Convert back to array and sort by timestamp (newest first)
        const merged = Array.from(existingMap.values()).sort((a, b) => {
          const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return timeB - timeA; // Descending
        });
        
        // Store in localStorage for persistence
        try {
          localStorage.setItem('smartfall_events', JSON.stringify(merged));
          console.log('[Dashboard] Stored', merged.length, 'events in localStorage');
        } catch (storageErr) {
          console.error('[Dashboard] Error storing in localStorage:', storageErr);
        }
        
        return merged;
      });
      
      if (data.message) {
        console.log('[Dashboard] API message:', data.message);
      }
    } catch (err) {
      console.error('[Dashboard] Error loading events:', err);
      console.error('[Dashboard] Error details:', err.response?.data || err.message);
      console.error('[Dashboard] Error code:', err.code);
      console.error('[Dashboard] Error name:', err.name);
      
      // Check if it's a network error
      if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        const errorMsg = `Cannot connect to backend API. Please check:
1. Backend is running on ${import.meta.env.VITE_API_URL || 'http://localhost:4000'}
2. Backend is accessible from this browser
3. Check browser console for CORS errors`;
        setError(errorMsg);
        console.error('[Dashboard] Network error - backend may not be running');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to fetch events');
      }
      
      // On error, try to use cached events from localStorage
      try {
        const storedEvents = localStorage.getItem('smartfall_events');
        if (storedEvents) {
          const parsed = JSON.parse(storedEvents);
          console.log('[Dashboard] Using cached events from localStorage due to error');
          setEvents(parsed);
        }
      } catch (cacheErr) {
        console.error('[Dashboard] Error loading cached events:', cacheErr);
      }
    } finally {
      setLoading(false);
    }
  }, [user]); // Depend on user

  // All hooks must be called before any conditional returns
  useEffect(() => {
    if (user) {
      // Load events from localStorage first (for instant display)
      try {
        const storedEvents = localStorage.getItem('smartfall_events');
        if (storedEvents) {
          const parsed = JSON.parse(storedEvents);
          console.log('[Dashboard] Loaded', parsed.length, 'events from localStorage');
          setEvents(parsed);
          setLoading(false);
        }
      } catch (err) {
        console.error('[Dashboard] Error loading from localStorage:', err);
      }
      
      // Then fetch fresh events from API
      loadEvents();
      const interval = setInterval(loadEvents, 5000);
      return () => clearInterval(interval);
    }
  }, [user, loadEvents]); // Depend on user and loadEvents

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
        // Handle severity: can be a string ("LOW", "MEDIUM", "HIGH") or an object with level property
        severity: typeof event.severity === 'string' 
          ? { level: event.severity } 
          : (event.severity || { level: 'UNKNOWN' }),
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

  // Define handlers - these can be defined after hooks
  const handleDelete = async (eventId) => {
    try {
      const { data } = await deleteEventApi(eventId);
      if (!data?.success) {
        throw new Error(data?.message ?? 'Failed to delete event');
      }
      // Remove the event from local state and localStorage
      setEvents((prevEvents) => {
        const updated = prevEvents.filter((event) => event.id !== eventId);
        try {
          localStorage.setItem('smartfall_events', JSON.stringify(updated));
        } catch (storageErr) {
          console.error('[Dashboard] Error updating localStorage:', storageErr);
        }
        return updated;
      });
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
      // Update local state and localStorage
      setEvents((prevEvents) => {
        const updated = prevEvents.map((event) =>
          event.id === eventId ? { ...event, status: newStatus } : event
        );
        try {
          localStorage.setItem('smartfall_events', JSON.stringify(updated));
        } catch (storageErr) {
          console.error('[Dashboard] Error updating localStorage:', storageErr);
        }
        return updated;
      });
    } catch (err) {
      setError(err.message);
    }
  };

  // Now handle conditional rendering AFTER all hooks
  if (authLoading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{ color: 'white', fontSize: '18px' }}>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return showSignup ? (
      <SignupPage onSwitchToLogin={() => setShowSignup(false)} />
    ) : (
      <LoginPage onSwitchToSignup={() => setShowSignup(true)} />
    );
  }

  return (
    <div className="app-shell">
      <div className="card">
        <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <h1>SmartFall Alerts</h1>
            <p>Live feed of fall detections for your linked users.</p>
            {user.email && (
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Logged in as: {user.email}
              </p>
            )}
          </div>
          <button
            onClick={logout}
            style={{
              background: '#fee2e2',
              color: '#991b1b',
              border: '1px solid #fecaca',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            Logout
          </button>
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

