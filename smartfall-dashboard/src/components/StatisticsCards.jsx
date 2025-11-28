import './StatisticsCards.css';

export default function StatisticsCards({ events }) {
  const stats = {
    total: events.length,
    highSeverity: events.filter(e => e.severity?.level === 'HIGH').length,
    today: events.filter(e => {
      const eventDate = new Date(e.timestamp || e.time);
      const today = new Date();
      return eventDate.toDateString() === today.toDateString();
    }).length,
    uniqueUsers: new Set(events.map(e => e.userId || e.userName)).size,
    open: events.filter(e => e.status === 'OPEN').length,
    mediumSeverity: events.filter(e => e.severity?.level === 'MEDIUM').length,
    lowSeverity: events.filter(e => e.severity?.level === 'LOW').length
  };

  const cards = [
    {
      title: 'Total Events',
      value: stats.total,
      icon: '📊',
      color: '#3b82f6',
      bg: '#dbeafe'
    },
    {
      title: 'High Severity',
      value: stats.highSeverity,
      icon: '🔴',
      color: '#dc2626',
      bg: '#fee2e2'
    },
    {
      title: 'Today',
      value: stats.today,
      icon: '📅',
      color: '#16a34a',
      bg: '#dcfce7'
    },
    {
      title: 'Active Users',
      value: stats.uniqueUsers,
      icon: '👥',
      color: '#7c3aed',
      bg: '#ede9fe'
    },
    {
      title: 'Open Cases',
      value: stats.open,
      icon: '⚠️',
      color: '#f59e0b',
      bg: '#fef3c7'
    },
    {
      title: 'Medium Severity',
      value: stats.mediumSeverity,
      icon: '🟡',
      color: '#d97706',
      bg: '#fef3c7'
    }
  ];

  return (
    <div className="stats-grid">
      {cards.map((card, idx) => (
        <div key={idx} className="stat-card" style={{ '--card-color': card.color, '--card-bg': card.bg }}>
          <div className="stat-icon">{card.icon}</div>
          <div className="stat-content">
            <div className="stat-value">{card.value}</div>
            <div className="stat-title">{card.title}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

