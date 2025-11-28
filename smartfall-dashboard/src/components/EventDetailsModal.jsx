import { useEffect } from 'react';
import './EventDetailsModal.css';

export default function EventDetailsModal({ event, isOpen, onClose }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen || !event) return null;

  const mapsUrl = event.mapsUrl || 
    (event.location?.lat && event.location?.lng 
      ? `https://maps.google.com/?q=${event.location.lat},${event.location.lng}`
      : null);

  const severityColor = {
    'HIGH': '#dc2626',
    'MEDIUM': '#d97706',
    'LOW': '#16a34a',
    'UNKNOWN': '#64748b'
  }[event.severity?.level || 'UNKNOWN'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Event Details</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="detail-section">
            <h3>User Information</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">User ID:</span>
                <span className="detail-value">{event.userId}</span>
              </div>
              {event.userName && (
                <div className="detail-item">
                  <span className="detail-label">Name:</span>
                  <span className="detail-value">{event.userName}</span>
                </div>
              )}
              <div className="detail-item">
                <span className="detail-label">Event Type:</span>
                <span className="detail-value">{event.type}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Status:</span>
                <span className={`status-pill ${event.status}`}>{event.status}</span>
              </div>
            </div>
          </div>

          <div className="detail-section">
            <h3>Timing</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Detected At:</span>
                <span className="detail-value">{event.time}</span>
              </div>
              {event.timestamp && (
                <div className="detail-item">
                  <span className="detail-label">Timestamp:</span>
                  <span className="detail-value">{new Date(event.timestamp).toISOString()}</span>
                </div>
              )}
            </div>
          </div>

          {event.severity && (
            <div className="detail-section">
              <h3>Severity Assessment</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Level:</span>
                  <span 
                    className="severity-badge"
                    style={{ 
                      backgroundColor: severityColor + '20',
                      color: severityColor,
                      borderColor: severityColor
                    }}
                  >
                    {event.severity.level}
                  </span>
                </div>
                {event.severityScore !== null && event.severityScore !== undefined && (
                  <div className="detail-item">
                    <span className="detail-label">Score:</span>
                    <span className="detail-value">{event.severityScore}/10</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {event.severityMetrics && (
            <div className="detail-section">
              <h3>Impact Metrics</h3>
              <div className="metrics-grid">
                <div className="metric-card">
                  <div className="metric-label">Impact Force</div>
                  <div className="metric-value">{event.severityMetrics.accelerationPeak} m/s²</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Rotation</div>
                  <div className="metric-value">{event.severityMetrics.rotationAngle} rad/s</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Time Still</div>
                  <div className="metric-value">{(event.severityMetrics.timeStill / 1000).toFixed(1)}s</div>
                </div>
                {event.severityMetrics.heightEstimate !== null && (
                  <div className="metric-card">
                    <div className="metric-label">Fall Height</div>
                    <div className="metric-value">{event.severityMetrics.heightEstimate}m</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {event.location && (
            <div className="detail-section">
              <h3>Location</h3>
              <div className="detail-grid">
                <div className="detail-item">
                  <span className="detail-label">Coordinates:</span>
                  <span className="detail-value">
                    {event.location.lat.toFixed(6)}, {event.location.lng.toFixed(6)}
                  </span>
                </div>
                {mapsUrl && (
                  <div className="detail-item">
                    <a 
                      href={mapsUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="map-button"
                    >
                      📍 View on Google Maps
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

