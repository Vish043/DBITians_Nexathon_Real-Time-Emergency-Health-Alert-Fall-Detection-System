export default function EventsTable({ events }) {
  if (!events.length) {
    return <div className="empty-state">No events yet.</div>;
  }

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Time</th>
          <th>User</th>
          <th>Type</th>
          <th>Status</th>
          <th>Location</th>
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
          </tr>
        ))}
      </tbody>
    </table>
  );
}

