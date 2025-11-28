export default function EventsTable({ events, onDelete, onViewDetails, onStatusChange }) {
  if (!events.length) {
    return <div className="empty-state">No events found. Try adjusting your filters.</div>;
  }

  const handleDelete = async (eventId, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this event?')) {
      await onDelete(eventId);
    }
  };

  const handleRowClick = (event) => {
    if (onViewDetails) {
      onViewDetails(event);
    }
  };

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Time</th>
          <th>User</th>
          <th>Name</th>
          <th>Type</th>
          <th>Severity</th>
          <th>Status</th>
          <th>Location</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {events.map((event) => (
          <tr 
            key={event.id} 
            className="table-row-clickable"
            onClick={() => handleRowClick(event)}
          >
            <td>{event.time}</td>
            <td>{event.userId}</td>
            <td>{event.userName || '—'}</td>
            <td>{event.type}</td>
            <td>
              <span className={`severity-pill severity-${(event.severity?.level || 'unknown').toLowerCase()}`}>
                {event.severity?.level || 'UNKNOWN'}
              </span>
            </td>
            <td>
              <select
                className="status-select"
                value={event.status}
                onChange={(e) => {
                  e.stopPropagation();
                  const newStatus = e.target.value;
                  if (window.confirm(`Change status to ${newStatus}?`)) {
                    onStatusChange?.(event.id, newStatus);
                  } else {
                    e.target.value = event.status; // Reset if cancelled
                  }
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="OPEN">Open</option>
                <option value="INVESTIGATING">Investigating</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </td>
            <td>
              {event.mapsUrl ? (
                <a 
                  className="map-link" 
                  href={event.mapsUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  View on map
                </a>
              ) : (
                '—'
              )}
            </td>
            <td>
              <button
                className="delete-btn"
                onClick={(e) => handleDelete(event.id, e)}
                title="Delete event"
              >
                🗑️ Delete
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

