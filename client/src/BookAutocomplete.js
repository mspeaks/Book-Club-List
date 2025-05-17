import React, { useState, useRef } from 'react';

const GOOGLE_BOOKS_API = 'https://www.googleapis.com/books/v1/volumes?q=';

export default function BookAutocomplete({ value, setValue, setBookDetails, disabled }) {
  const [input, setInput] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef();

  // Fetch suggestions as user types
  const handleInputChange = async (e) => {
    const val = e.target.value;
    setInput(val);
    setValue(val);
    setShowDropdown(false);
    setSuggestions([]);
    if (val.length < 3) return;
    const res = await fetch(`${GOOGLE_BOOKS_API}${encodeURIComponent(val)}&maxResults=5`);
    const data = await res.json();
    if (!data.items) return;
    setSuggestions(data.items);
    setShowDropdown(true);
  };

  // When a suggestion is selected
  const handleSelect = (item) => {
    const info = item.volumeInfo;
    setInput(info.title);
    setValue(info.title);
    setShowDropdown(false);
    setSuggestions([]);
    setBookDetails({
      author: (info.authors && info.authors.join(', ')) || '',
      description: info.description || '',
      cover: info.imageLinks ? (info.imageLinks.thumbnail || info.imageLinks.smallThumbnail) : '',
      link: info.infoLink || '',
      categories: info.categories || []
    });
    console.log('Book categories from Google Books API:', info.categories);
    inputRef.current && inputRef.current.blur();
  };

  return (
    <div style={{ position: 'relative', minWidth: 260 }}>
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={handleInputChange}
        disabled={disabled}
        placeholder="Start typing a book title..."
        style={{ width: 240, marginRight: 4 }}
        autoComplete="off"
        onFocus={() => { if (input.length >= 3 && suggestions.length > 0) setShowDropdown(true); }}
      />
      {showDropdown && suggestions.length > 0 && (
        <div style={{
          border: '1px solid #ccc',
          background: '#fff',
          position: 'absolute',
          zIndex: 20,
          width: 350,
          maxHeight: 220,
          overflowY: 'auto',
        }}>
          {suggestions.map(item => {
            const info = item.volumeInfo;
            return (
              <div
                key={item.id}
                style={{ padding: 8, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                onMouseDown={() => handleSelect(item)}
              >
                {info.imageLinks && info.imageLinks.thumbnail && (
                  <img src={info.imageLinks.thumbnail} alt="cover" style={{ width: 32, height: 48, marginRight: 8, objectFit: 'cover', borderRadius: 2 }} />
                )}
                <div>
                  <div style={{ fontWeight: 'bold' }}>{info.title}</div>
                  <div style={{ fontSize: 13, color: '#555' }}>{info.authors ? info.authors.join(', ') : ''}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
