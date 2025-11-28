export default function EventsTable({ events, onDelete }) {
  if (!events.length) {
    return <div className="empty-state">No events yet.</div>;
  }

  const handleDelete = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      await onDelete(eventId);
    }
  };

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Time</th>
          <th>User</th>
          <th>Type</th>
          <th>Status</th>
          <th>Location</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {events.map((event) => (
          <tr key={event.id}>
            <td>{event.time}</td>
            <td>{event.userId}</td>
            <td>{event.type}</td>
            <td>
              <span className={`status-pill ${event.status}`}>{event.status}</span>
            </td>
            <td>
              {event.mapsUrl ? (
                <a className="map-link" href={event.mapsUrl} target="_blank" rel="noreferrer">
                  View on map
                </a>
              ) : (
                '—'
              )}
            </td>
            <td>
              <button
                className="delete-btn"
                onClick={() => handleDelete(event.id)}
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

