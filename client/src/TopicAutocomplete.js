import React, { useState, useRef } from 'react';

const API_BASE = 'http://localhost:4000';

export default function TopicAutocomplete({ selected, setSelected, disabled }) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef();

  // Fetch suggestions as user types
  const handleInputChange = async (e) => {
    const val = e.target.value;
    setInput(val);
    if (val.length === 0) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    const res = await fetch(`${API_BASE}/topics/search?q=${encodeURIComponent(val)}`);
    const data = await res.json();
    // Only show topics not already selected
    setSuggestions(data.filter(t => !selected.includes(t.id)));
    setShowDropdown(true);
  };

  // Add topic chip
  const handleSelect = (topic) => {
    setSelected([...selected, topic.id]);
    setInput('');
    setSuggestions([]);
    setShowDropdown(false);
    inputRef.current && inputRef.current.focus();
  };

  // Remove chip
  const handleRemove = (id) => {
    setSelected(selected.filter(tid => tid !== id));
  };

  return (
    <div style={{ display: 'inline-block', minWidth: 220 }}>
      {/* Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
        {selected.length === 0 && <span style={{ color: '#888' }}>No topics selected</span>}
        {selected.map(id => (
          <Chip key={id} id={id} onRemove={handleRemove} disabled={disabled} />
        ))}
      </div>
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={handleInputChange}
        disabled={disabled}
        placeholder="Type to search topics..."
        style={{ width: 180, marginRight: 4 }}
        onFocus={() => { if (input.length > 0) setShowDropdown(true); }}
      />
      {showDropdown && suggestions.length > 0 && (
        <div style={{
          border: '1px solid #ccc',
          background: '#fff',
          position: 'absolute',
          zIndex: 10,
          width: 200,
          maxHeight: 160,
          overflowY: 'auto',
        }}>
          {suggestions.map(topic => (
            <div
              key={topic.id}
              style={{ padding: 6, cursor: 'pointer' }}
              onMouseDown={() => handleSelect(topic)}
            >
              {topic.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Chip displays topic name and remove button
function Chip({ id, onRemove, disabled }) {
  const [name, setName] = useState('');
  React.useEffect(() => {
    fetch(`${API_BASE}/topics`).then(r => r.json()).then(ts => {
      const t = ts.find(t => t.id === id);
      setName(t ? t.name : id);
    });
  }, [id]);
  return (
    <span style={{
      background: '#e0e0e0',
      borderRadius: 12,
      padding: '2px 8px',
      display: 'inline-flex',
      alignItems: 'center',
      marginRight: 4,
      marginBottom: 2,
    }}>
      {name}
      {!disabled && (
        <button onClick={() => onRemove(id)} style={{ marginLeft: 4, border: 'none', background: 'none', cursor: 'pointer', color: '#888' }}>&times;</button>
      )}
    </span>
  );
}
