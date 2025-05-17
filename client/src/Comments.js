import React, { useState, useEffect } from 'react';

const API_BASE = 'http://localhost:4000';

function Comments({ bookId, user }) {
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  
  // Fetch comment count when component mounts or bookId changes
  useEffect(() => {
    fetchCommentCount();
  }, [bookId]);

  // Fetch just the comment count
  const fetchCommentCount = async () => {
    try {
      const res = await fetch(`${API_BASE}/books/${bookId}/comments/count`);
      const data = await res.json();
      setCommentCount(data.count);
    } catch (error) {
      console.error('Error fetching comment count:', error);
    }
  };
  
  // Fetch full comments for this book
  const fetchComments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/books/${bookId}/comments`);
      const data = await res.json();
      setComments(data);
      setCommentCount(data.length);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add a new comment
  const addComment = async () => {
    if (!user || !commentText.trim()) return;
    
    try {
      const res = await fetch(`${API_BASE}/books/${bookId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, content: commentText.trim() }),
      });
      
      if (!res.ok) throw new Error('Failed to add comment');
      
      const newComment = await res.json();
      setComments([newComment, ...comments]);
      setCommentCount(prev => prev + 1);
      setCommentText('');
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Failed to add comment. Please try again.');
    }
  };

  // Delete a comment
  const deleteComment = async (commentId) => {
    if (!user) return;
    
    try {
      const res = await fetch(`${API_BASE}/books/${bookId}/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to delete comment');
      }
      
      setComments(comments.filter(c => c.id !== commentId));
      setCommentCount(prev => prev - 1);
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert(error.message || 'Failed to delete comment. Please try again.');
    }
  };

  const toggleComments = () => {
    if (!showComments) {
      fetchComments();
    }
    setShowComments(!showComments);
  };

  return (
    <div style={{ marginTop: 15, borderTop: '1px dashed #ddd', paddingTop: 10 }}>
      <button 
        onClick={toggleComments}
        style={{ 
          background: showComments ? '#f1f1f1' : '#e1f5fe',
          border: '1px solid #ccc',
          borderRadius: 4,
          padding: '4px 8px',
          fontSize: 14,
          cursor: 'pointer'
        }}
      >
        {commentCount === 0
          ? 'Add a comment'
          : showComments
            ? `Hide comments (${commentCount})`
            : `Show comments (${commentCount})`}
      </button>
      
      {showComments && (
        <div style={{ marginTop: 10 }}>
          {/* Comment form */}
          {user ? (
            <div style={{ display: 'flex', marginBottom: 10 }}>
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                style={{ flex: 1, marginRight: 8, padding: '6px 8px', borderRadius: 4, border: '1px solid #ccc' }}
              />
              <button
                onClick={addComment}
                disabled={!commentText.trim()}
                style={{ 
                  background: commentText.trim() ? '#90caf9' : '#e0e0e0',
                  borderRadius: 4,
                  border: 'none',
                  padding: '0 12px',
                  cursor: commentText.trim() ? 'pointer' : 'default'
                }}
              >
                Comment
              </button>
            </div>
          ) : (
            <div style={{ color: '#666', marginBottom: 10, fontStyle: 'italic' }}>
              Log in to add comments
            </div>
          )}
          
          {/* Comments list */}
          {loading ? (
            <div>Loading comments...</div>
          ) : comments.length > 0 ? (
            <div>
              {comments.map(comment => (
                <div key={comment.id} style={{ 
                  padding: 10, 
                  borderBottom: '1px solid #eee',
                  position: 'relative'
                }}>
                  <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                    {comment.user_name}
                    <span style={{ fontWeight: 'normal', color: '#777', fontSize: 12, marginLeft: 8 }}>
                      {new Date(comment.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ wordBreak: 'break-word' }}
                    dangerouslySetInnerHTML={{ __html: linkify(comment.content) }}
                  />
                  {user && user.id === comment.user_id && (
                    <button 
                      onClick={() => deleteComment(comment.id)}
                      style={{
                        position: 'absolute',
                        right: 5,
                        top: 5,
                        background: 'none',
                        border: 'none',
                        color: '#f44336',
                        cursor: 'pointer',
                        padding: '2px 5px',
                        fontSize: 12
                      }}
                    >
                      &times;
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: '#666', fontStyle: 'italic' }}>No comments yet. Be the first to comment!</div>
          )}
        </div>
      )}
    </div>
  );
}

// Utility function to convert URLs in text to clickable links
function linkify(text) {
  if (!text) return '';
  const urlRegex = /(https?:\/\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+)|(www\.[\w\-._~:/?#[\]@!$&'()*+,;=%]+)/gi;
  return text.replace(urlRegex, url => {
    let href = url;
    if (!href.startsWith('http')) {
      href = 'http://' + href;
    }
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });
}

export default Comments;
