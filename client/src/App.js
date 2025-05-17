import React, { useEffect, useState } from 'react';
import TopicAutocomplete from './TopicAutocomplete';
import BookAutocomplete from './BookAutocomplete';
import Comments from './Comments';

const API_BASE = 'http://localhost:4000';

// Special component just for Reading Now button to isolate and fix issues
const ReadingNowButton = ({ book, user, handleStatus, myStatuses, setMyStatuses }) => {
  const [isActive, setIsActive] = useState(
    myStatuses.some(s => s.book_id === book.id && s.status === 'reading_now')
  );

  // Direct click handler that bypasses the usual flow
  const handleClick = async () => {
    if (!user) return;
    
    console.log('ReadingNowButton clicked!');
    console.log('Current state:', isActive);
    console.log('myStatuses before click:', myStatuses);
    
    try {
      // Toggle local state immediately for responsive UI
      setIsActive(!isActive);
      
      // Call the API directly using the standard 'reading_now' status
      const response = await fetch(`${API_BASE}/books/${book.id}/status`, {
        method: isActive ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, status: 'reading_now' }),
      });
      
      if (!response.ok) {
        // Revert local state if API call fails
        setIsActive(isActive);
        console.error('API call failed:', response.status);
        return;
      }
      
      // Update myStatuses state to match our local state
      if (isActive) {
        // We were removing the status, so filter it out
        setMyStatuses(prev => prev.filter(s => !(s.book_id === book.id && s.status === 'reading_now')));
      } else {
        // We were adding the status
        setMyStatuses(prev => [...prev, { book_id: book.id, status: 'reading_now', user_id: user.id }]);
      }
      
      // Call the original handler for data consistency
      handleStatus(book.id, 'reading_now');
      
      console.log('ReadingNowButton updated success!');
    } catch (error) {
      console.error('Reading Now button error:', error);
      setIsActive(isActive); // Revert on error
    }
  };

  // The active state is based on our local state for immediate feedback
  const buttonStyle = {
    background: isActive ? '#ffd180' : '#eee',
    marginLeft: 4,
    fontWeight: isActive ? 'bold' : 'normal',
  };

  return (
    <button
      onClick={handleClick}
      disabled={!user}
      style={buttonStyle}
    >
      {isActive ? 'Reading Now (Undo)' : 'Reading Now'} 
      ({book.reading_now + (isActive ? 1 : 0)})
    </button>
  );
};

function App() {
  // --- User login state ---
  const [user, setUser] = useState(() => {
    const u = window.localStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  });
  const [loginName, setLoginName] = useState('');
  const [users, setUsers] = useState([]);
  const [showRegister, setShowRegister] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [books, setBooks] = useState([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [topics, setTopics] = useState([]);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState({ title: '', author: '', description: '', link: '', recommended_by: '', topics: [] });
  const [bookCover, setBookCover] = useState('');
  const [suggestedTopics, setSuggestedTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [myBooks, setMyBooks] = useState([]);
  const [myVotes, setMyVotes] = useState([]);
  const [myStatuses, setMyStatuses] = useState([]);

  // Fetch users
  const fetchUsers = async () => {
    const res = await fetch(`${API_BASE}/users`);
    const data = await res.json();
    setUsers(data);
  };

  // Fetch user-specific books and votes
  const fetchUserSpecific = async (userId) => {
    if (!userId) {
      setMyBooks([]);
      setMyVotes([]);
      setMyStatuses([]);
      return;
    }
    const [booksRes, votesRes, statusesRes] = await Promise.all([
      fetch(`${API_BASE}/users/${userId}/books`),
      fetch(`${API_BASE}/users/${userId}/votes`),
      fetch(`${API_BASE}/users/${userId}/statuses`)
    ]);
    setMyBooks(await booksRes.json());
    setMyVotes(await votesRes.json());
    setMyStatuses(await statusesRes.json());
  };

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginName) return;
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: loginName }),
    });
    if (res.status === 404) {
      alert('User not found. Please register.');
      return;
    }
    const data = await res.json();
    setUser(data);
    window.localStorage.setItem('user', JSON.stringify(data));
    setLoginName('');
    fetchUserSpecific(data.id);
  };

  // Register handler
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!registerName.trim()) return;
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: registerName.trim() }),
    });
    if (res.status !== 201) {
      const err = await res.json();
      alert(err.error || 'Registration failed');
      return;
    }
    const data = await res.json();
    setUsers((prev) => [...prev, data]);
    setShowRegister(false);
    setRegisterName('');
    setLoginName(data.name);
    alert('Registration successful! You can now log in.');
  };

  // Logout handler
  const handleLogout = () => {
    setUser(null);
    window.localStorage.removeItem('user');
    setMyBooks([]);
    setMyVotes([]);
    setMyStatuses([]);
  };

  // Fetch books
  const fetchBooks = async () => {
    setLoading(true);
    const res = await fetch(`${API_BASE}/books`);
    const data = await res.json();
    setBooks(data);
    setLoading(false);
  };

  // Maps Google Books categories to the app's topic IDs
  const mapCategoriesToTopicIds = (categories, appTopics) => {
    if (!categories || !Array.isArray(categories) || categories.length === 0) {
      return [];
    }

    // Normalize categories (lowercase, split into words)
    const normalizedCategories = categories.flatMap(category => 
      category.toLowerCase().split(/[\s&,\/]+/)
    );

    // Common category keywords to look for
    const categoryKeywords = [
      'fiction', 'nonfiction', 'science', 'fantasy', 'mystery', 'thriller',
      'romance', 'horror', 'biography', 'history', 'business', 'self-help',
      'philosophy', 'psychology', 'technology', 'computers', 'programming'
    ];

    // Find topics that match with any of the category keywords
    const matchedTopicIds = appTopics
      .filter(topic => {
        const topicName = topic.name.toLowerCase();
        // Check if any of the keywords are in the topic name
        return categoryKeywords.some(keyword => topicName.includes(keyword)) ||
          // Or check if any normalized category words match the topic name
          normalizedCategories.some(catWord => 
            topicName.includes(catWord) || catWord.includes(topicName)
          );
      })
      .map(topic => topic.id);

    return matchedTopicIds;
  };

  // Fetch topics
  const fetchTopics = async () => {
    const res = await fetch(`${API_BASE}/topics`);
    const data = await res.json();
    setTopics(data);
  };

  useEffect(() => {
    fetchBooks();
    fetchTopics();
    fetchUsers();
  }, []);

  // When user logs in, fetch their books and votes
  useEffect(() => {
    if (user && user.id) {
      fetchUserSpecific(user.id);
    }
  }, [user]);

  // Handle book form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form submission attempted with:', { form, user });
    
    // Check validation conditions
    if (!form.title) {
      console.log('Submission blocked: Missing title');
      return;
    }
    if (!form.author) {
      console.log('Submission blocked: Missing author');
      return;
    }
    if (form.topics.length === 0) {
      console.log('Submission blocked: No topics selected');
      return;
    }
    if (!user) {
      console.log('Submission blocked: User not logged in');
      return;
    }
    
    try {
      const payload = {
        ...form,
        user_id: user.id,
        cover: bookCover
      };

      console.log('Submitting book payload:', payload);
      
      const response = await fetch(`${API_BASE}/books`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error submitting book:', response.status, errorData);
        alert(`Failed to submit book: ${response.status} ${response.statusText}`);
        return;
      }
      
      console.log('Book submitted successfully!');

      
      // Reset form
      setForm({ title: '', author: '', description: '', link: '', recommended_by: '', topics: [] });
      setBookCover('');
      setSuggestedTopics([]);
      setSuccessMsg('Book recommended successfully!');
      fetchBooks();
    } catch (error) {
      console.error('Exception when submitting book:', error);
      alert('Error submitting book. Please try again.');
    }
  };

  // Handle voting
  const handleVote = async (bookId) => {
    if (!user) return;
    const voted = myVotes.some(v => v.book_id === bookId);
    if (voted) {
      await fetch(`${API_BASE}/books/${bookId}/vote`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voter_id: user.id }),
      });
    } else {
      await fetch(`${API_BASE}/books/${bookId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voter_id: user.id }),
      });
    }
    fetchBooks();
    fetchUserSpecific(user.id);
  };

  // Handle book status (already_read, skimmed, want_to_read, reading_now)
  const handleStatus = async (bookId, status) => {
    if (!user) return;
    
    try {
      console.log(`Setting status: ${status} for book ${bookId}, user ${user.id}`);
      console.log('Current statuses:', myStatuses);
      
      const hasStatus = myStatuses.some(s => s.book_id === bookId && s.status === status);
      console.log(`User already has this status: ${hasStatus}`);
      
      const response = await fetch(`${API_BASE}/books/${bookId}/status`, {
        method: hasStatus ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, status }),
      });
      
      // Check if the response is ok
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`Failed to ${hasStatus ? 'remove' : 'add'} status:`, errorData);
        alert(`Failed to update status: ${errorData.error || response.statusText}`);
        return;
      }
      
      // Success! Update the UI
      const result = await response.json();
      console.log('Status update successful:', result);
      
      // Immediately update local state for responsive UI
      if (hasStatus) {
        // Remove the status from myStatuses
        setMyStatuses(prev => prev.filter(s => !(s.book_id === bookId && s.status === status)));
      } else {
        // Add the status to myStatuses
        setMyStatuses(prev => [...prev, { book_id: bookId, status, user_id: user.id }]);
      }
      
      // Refresh data
      await Promise.all([
        fetchBooks(),
        fetchUserSpecific(user.id)
      ]);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  // Handle topic checkbox
  const handleTopicChange = (topicId) => {
    setForm((prev) => {
      const topics = prev.topics.includes(topicId)
        ? prev.topics.filter((id) => id !== topicId)
        : [...prev.topics, topicId];
      return { ...prev, topics };
    });
  };

  // Filter books
  const filteredBooks = filter
    ? books.filter((b) => b.topics.includes(topics.find((t) => t.id === Number(filter))?.name))
    : books;

  // For each category from Google Books, check if we need to create it in our system
  const createNewTopics = async () => {
    const newTopicIds = [];
    
    // Get book categories from window if available, otherwise use empty array
    const bookCategories = window.bookCategories || [];
    
    for (const category of bookCategories) {
      // Check if a similar topic already exists
      const existingTopic = topics.find(t => 
        t.name.toLowerCase() === category.toLowerCase() ||
        category.toLowerCase().includes(t.name.toLowerCase()) ||
        t.name.toLowerCase().includes(category.toLowerCase())
      );
      
      if (existingTopic) {
        // Use existing topic if there's a match
        newTopicIds.push(existingTopic.id);
      } else {
        try {
          const res = await fetch(`${API_BASE}/topics`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: category })
          });
          
          if (res.ok) {
            const newTopic = await res.json();
            newTopicIds.push(newTopic.id);
            // Update local topics state
            setTopics(prev => [...prev, newTopic]);
          }
        } catch (error) {
          console.error('Error creating new topic:', error);
        }
      }
    }
    
    // Auto-select the topics
    if (newTopicIds.length > 0) {
      setForm(f => ({
        ...f,
        topics: [...new Set([...f.topics, ...newTopicIds])]
      }));
      
      // Store for UI indication
      setSuggestedTopics(newTopicIds);
    }
  };

  return (
    <div>
      <div style={{ maxWidth: 700, margin: '2rem auto', padding: 20 }}>
        <h1>Book Club</h1>
        {/* --- Login UI --- */}
        {!user ? (
          <div style={{ marginBottom: 30 }}>
            {!showRegister ? (
              <div style={{ display: 'flex', maxWidth: 300 }}>
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <select 
                    value={loginName} 
                    onChange={(e) => {
                      const selectedName = e.target.value;
                      if (selectedName) {
                        setLoginName(selectedName);
                        // Auto-login when a name is selected
                        const selectedUser = users.find(u => u.name === selectedName);
                        if (selectedUser) {
                          setUser(selectedUser);
                          window.localStorage.setItem('user', JSON.stringify(selectedUser));
                          fetchUserSpecific(selectedUser.id);
                        }
                      }
                    }}
                    style={{ padding: 8, marginBottom: 10 }}
                  >
                    <option value="">Select your name</option>
                    {users.map(user => (
                      <option key={user.id} value={user.name}>{user.name}</option>
                    ))}
                  </select>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" style={{ flex: 1 }} onClick={() => setShowRegister(true)}>Register</button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', maxWidth: 300 }}>
                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column' }}>
                  <input 
                    type="text" 
                    value={registerName} 
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="Choose a name"
                    style={{ padding: 8, marginBottom: 10 }}
                  />
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="submit" style={{ flex: 1 }}>Create Account</button>
                    <button type="button" style={{ flex: 1 }} onClick={() => setShowRegister(false)}>Cancel</button>
                  </div>
                </form>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
            <div>Welcome, <strong>{user.name}</strong>!</div>
            <button onClick={handleLogout}>Log out</button>
            <div style={{ display: 'flex', gap: 10 }}>
              <div>
                <label htmlFor="filter" style={{ marginRight: 8 }}>Filter by Topic:</label>
                <select id="filter" value={filter} onChange={(e) => setFilter(e.target.value)}>
                  <option value="">All Topics</option>
                  {topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {user && (
          <div>
            <h3>Your Books</h3>
            {(!Array.isArray(myBooks) || myBooks.length === 0) ? (
              <div><i>You haven't recommended any books yet.</i></div>
            ) : (
              <ul>
                {myBooks.map(book => (
                  <li key={book.id} style={{ marginBottom: 10 }}>
                    <div>
                      <b>{book.title}</b> by {book.author}
                      <div><small>Topics: {book.topics.join(', ')}</small></div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <h3>Books you voted for us to discuss</h3>
            {(!Array.isArray(myVotes) || myVotes.length === 0) ? (
              <div><i>No votes yet.</i></div>
            ) : (
              <ul>
                {myVotes.map(book => (
                  <li key={book.id} style={{ marginBottom: 10 }}>
                    <div>
                      <b>{book.title}</b> by {book.author}
                      <div><small>Topics: {book.topics.join(', ')}</small></div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <h2>Recommend a Book</h2>
        <form onSubmit={handleSubmit}>
          <BookAutocomplete
            value={form.title}
            setValue={(title) => setForm(f => ({ ...f, title }))}
            setBookDetails={(details) => {
              setForm(f => ({ 
                ...f, 
                author: details.author || f.author, 
                description: details.description || f.description,
                link: details.link || f.link
              }));
              setBookCover(details.cover || '');
              
              // If we have categories from Google Books, handle them
              if (details.categories && details.categories.length) {
                // Store categories for topic creation
                window.bookCategories = details.categories;
                
                // Automatically map to existing topics
                const matchedTopicIds = mapCategoriesToTopicIds(details.categories, topics);
                if (matchedTopicIds.length) {
                  setForm(f => ({
                    ...f,
                    topics: [...new Set([...f.topics, ...matchedTopicIds])]
                  }));
                  setSuggestedTopics(matchedTopicIds);
                }
                
                // Execute the async function
                createNewTopics();
              }
            }}
            disabled={!user}
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '10px 0' }}>
            <label>Author:</label>
            <input 
              type="text" 
              value={form.author}
              onChange={(e) => setForm(f => ({ ...f, author: e.target.value }))}
              placeholder="Author"
              style={{ flex: 1 }}
              disabled={!user}
            />
          </div>
          <div style={{ margin: '10px 0' }}>
            <label>Description:</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Description (optional)"
              style={{ width: '100%', height: 80, marginTop: 4 }}
              disabled={!user}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '10px 0' }}>
            <label>Link:</label>
            <input 
              type="text" 
              value={form.link}
              onChange={(e) => setForm(f => ({ ...f, link: e.target.value }))}
              placeholder="Link (optional)"
              style={{ flex: 1 }}
              disabled={!user}
            />
          </div>
          <div style={{ margin: '10px 0' }}>
            <b>Topics:</b>{' '}
            {suggestedTopics.length > 0 && (
              <div style={{ 
                backgroundColor: '#e3f2fd', 
                padding: '8px 12px', 
                marginTop: 4,
                borderRadius: 4,
                fontSize: 14
              }}>
                <span style={{ fontWeight: 'bold' }}>
                  ✨ Topics auto-suggested based on book categories:{' '}
                </span>
                {topics
                  .filter(t => suggestedTopics.includes(t.id))
                  .map(t => t.name)
                  .join(', ')}
              </div>
            )}
            <TopicAutocomplete 
              selected={form.topics} 
              setSelected={(topics) => setForm(f => ({ ...f, topics }))}
              disabled={!user}
            />
          </div>
          <div style={{ marginTop: 16 }}>
            <button type="submit" disabled={!user}>
              Share Book
            </button>
          </div>
        </form>
        {/* Book list section */}
        {successMsg && (
          <div style={{ background: '#e6ffe6', color: '#1b5e20', padding: '10px 18px', margin: '10px 0', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg('')} style={{ background: 'none', border: 'none', color: '#1b5e20', cursor: 'pointer', fontWeight: 'bold', fontSize: 18 }}>&times;</button>
          </div>
        )}
        {loading ? <div>Loading...</div> : (
          <ul>
            {/* Regular rendering if there are no books */}
            {!filteredBooks || filteredBooks.length === 0 ? (
              <li><i>No books yet. Be the first to recommend one!</i></li>
            ) : (
              /* Custom sorting for non-empty book list */
              filteredBooks
                .slice() // Make a copy to avoid mutating original array
                .sort((a, b) => {
                  // First by recency
                  const dateA = new Date(a.created_at || 0);
                  const dateB = new Date(b.created_at || 0);
                  
                  // Special case: if this is the most recent book, it's first
                  if (dateA > dateB) return -1;
                  if (dateB > dateA) return 1;
                  
                  // If dates are equal, sort by votes
                  return b.votes - a.votes;
                })
                .map((book, index) => {
                  // Second place is highest votes that isn't most recent
                  if (index === 1 && filteredBooks.length > 2) {
                    // Find highest votes book (excluding index 0)
                    const highestVotesBook = [...filteredBooks]
                      .filter(b => b.id !== filteredBooks[0].id)
                      .sort((a, b) => b.votes - a.votes)[0];
                    
                    // If the book at index 1 isn't the highest votes book, swap
                    if (highestVotesBook && highestVotesBook.id !== book.id) {
                      // Find book in the array
                      const highestIndex = filteredBooks.findIndex(b => b.id === highestVotesBook.id);
                      if (highestIndex > 1) {
                        const temp = filteredBooks[1];
                        filteredBooks[1] = filteredBooks[highestIndex];
                        filteredBooks[highestIndex] = temp;
                        // Use the swapped book
                        book = filteredBooks[1];
                      }
                    }
                  }
                  
                  return (
                    <li key={book.id} style={{ marginBottom: 18, borderBottom: '1px solid #eee', paddingBottom: 10, display: 'flex' }}>
                      <div style={{ marginRight: '15px', minWidth: '100px' }}>
                        {book.cover && <img src={book.cover} alt="Book cover" style={{ maxWidth: '100px', maxHeight: '150px' }} />}
                      </div>
                      <div>
                        <b>{book.title}</b> by {book.author}
                        {book.description && (
                          <div>
                            <i>{book.description.split(' ').slice(0, 25).join(' ')}{book.description.split(' ').length > 25 ? '...' : ''}</i>
                          </div>
                        )}
                        {book.link && <div><a href={book.link} target="_blank" rel="noopener noreferrer">More info</a></div>}
                        <div>Topics: {book.topics.join(', ')}</div>
                        {/* DEBUG: Show myStatuses for this book */}
                        <pre style={{fontSize: 10, color: '#888', margin: 0}}>
                          {JSON.stringify(myStatuses.filter(s => s.book_id === book.id), null, 2)}
                        </pre>
                        {/* DEBUG: Show 'reading_now' match */}
                        <div style={{fontSize: 10, color: '#d2691e', margin: 0}}>
                          reading_now: {String(myStatuses.some(s => s.book_id === book.id && s.status === 'reading_now'))}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                           <span>Votes: {book.votes}</span>
                           <button
                             onClick={() => handleVote(book.id)}
                             disabled={!user}
                             style={{ fontWeight: myVotes.some(v => v.book_id === book.id) ? 'bold' : 'normal', background: myVotes.some(v => v.book_id === book.id) ? '#b3e5fc' : undefined }}
                           >{myVotes.some(v => v.book_id === book.id) ? 'Voted (Undo)' : 'Vote'}</button>
                           <span>|</span>
                            <button
                              onClick={() => handleStatus(book.id, 'already_read')}
                              disabled={!user}
                              style={{
                                background: myStatuses.some(s => s.book_id === book.id && s.status === 'already_read') ? '#c8e6c9' : '#eee',
                                marginLeft: 4,
                                fontWeight: myStatuses.some(s => s.book_id === book.id && s.status === 'already_read') ? 'bold' : 'normal'
                              }}
                            >
                              {myStatuses.some(s => s.book_id === book.id && s.status === 'already_read') ? 'Already Read (Undo)' : 'Already Read'} ({book.already_read + (myStatuses.some(s => s.book_id === book.id && s.status === 'already_read') ? 1 : 0)})
                            </button>
                            <ReadingNowButton 
                              book={book} 
                              user={user} 
                              myStatuses={myStatuses}
                              handleStatus={handleStatus}
                              setMyStatuses={setMyStatuses}
                            />
                           <button
                              onClick={() => handleStatus(book.id, 'skimmed')}
                              disabled={!user}
                              style={{
                                background: myStatuses.some(s => s.book_id === book.id && s.status === 'skimmed') ? '#fff9c4' : '#eee',
                                marginLeft: 4,
                                fontWeight: myStatuses.some(s => s.book_id === book.id && s.status === 'skimmed') ? 'bold' : 'normal'
                              }}
                            >
                              {myStatuses.some(s => s.book_id === book.id && s.status === 'skimmed') ? 'Skimmed (Undo)' : 'Skimmed'} 
                              ({book.skimmed + (myStatuses.some(s => s.book_id === book.id && s.status === 'skimmed') ? 1 : 0)})
                            </button>
                           <button
                             onClick={() => handleStatus(book.id, 'want_to_read')}
                             disabled={!user}
                             style={{
                               background: myStatuses.some(s => s.book_id === book.id && s.status === 'want_to_read') ? '#bbdefb' : '#eee',
                               marginLeft: 4,
                               fontWeight: myStatuses.some(s => s.book_id === book.id && s.status === 'want_to_read') ? 'bold' : 'normal'
                             }}
                           >{myStatuses.some(s => s.book_id === book.id && s.status === 'want_to_read') ? 'Want to Read (Undo)' : 'Want to Read'} ({book.want_to_read + (myStatuses.some(s => s.book_id === book.id && s.status === 'want_to_read') ? 1 : 0)})
                            </button>
                         </div>
                         {book.recommended_by && <div><small>Recommended by {book.recommended_by}</small></div>}
                         {user && user.id === book.user_id && (
                           <button
                             style={{ marginTop: 8, background: '#e57373', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', cursor: 'pointer' }}
                             onClick={async () => {
                              if (window.confirm('Are you sure you want to delete this book?')) {
                                const res = await fetch(`${API_BASE}/books/${book.id}`, {
                                  method: 'DELETE',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ user_id: user.id })
                                });
                                if (res.ok) {
                                  setSuccessMsg('Book deleted successfully!');
                                  fetchBooks();
                                } else {
                                  const err = await res.json().catch(() => ({}));
                                  alert(err.error || 'Failed to delete book');
                                }
                              }
                             }}
                           >Delete</button>
                         )}
                         
                         {/* Comments component */}
                         <Comments bookId={book.id} user={user} />
                       </div>
                    </li>
                  );
                })
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;
