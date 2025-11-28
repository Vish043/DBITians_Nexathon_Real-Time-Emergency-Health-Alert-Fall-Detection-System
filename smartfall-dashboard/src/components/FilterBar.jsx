import './FilterBar.css';

export default function FilterBar({ filters, onFilterChange }) {
  return (
    <div className="filter-bar">
      <div className="filter-group">
        <label>Search:</label>
        <input
          type="text"
          placeholder="Search by user ID or name..."
          value={filters.search}
          onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
          className="filter-input"
        />
      </div>

      <div className="filter-group">
        <label>Severity:</label>
        <select
          value={filters.severity}
          onChange={(e) => onFilterChange({ ...filters, severity: e.target.value })}
          className="filter-select"
        >
          <option value="all">All</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Status:</label>
        <select
          value={filters.status}
          onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
          className="filter-select"
        >
          <option value="all">All</option>
          <option value="OPEN">Open</option>
          <option value="RESOLVED">Resolved</option>
          <option value="INVESTIGATING">Investigating</option>
        </select>
      </div>

      <div className="filter-group">
        <label>Sort:</label>
        <select
          value={filters.sortBy}
          onChange={(e) => onFilterChange({ ...filters, sortBy: e.target.value })}
          className="filter-select"
        >
          <option value="time-desc">Newest First</option>
          <option value="time-asc">Oldest First</option>
          <option value="severity-desc">High Severity First</option>
          <option value="severity-asc">Low Severity First</option>
        </select>
      </div>

      {(filters.search || filters.severity !== 'all' || filters.status !== 'all') && (
        <button
          className="clear-filters"
          onClick={() => onFilterChange({ search: '', severity: 'all', status: 'all', sortBy: 'time-desc' })}
        >
          Clear Filters
        </button>
      )}
    </div>
  );
}

