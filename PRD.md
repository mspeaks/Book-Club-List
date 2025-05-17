# Book Club Site - Product Requirements Document (PRD)

## Overview

The Book Club site is a simple, community-driven platform where members can share book recommendations, categorize them by topics relevant to the group (e.g., "parenting", "leadership", "career", "worklife balance"), and vote on the books they are most interested in. The goal is to foster discovery, discussion, and prioritization of books that matter most to the group.

**Status: Implemented with enhancements** ✅

---

## Goals

- ✅ Allow users to easily recommend books to the group.
- ✅ Enable categorization of books into custom topics.
- ✅ Let anyone vote for books they are most curious about or want to read.
- ✅ Display books sorted by popularity (votes) and by topic.
- ✅ Provide a simple, intuitive, and mobile-friendly user interface.

---

## Core Features

1. **Book Submission** ✅
   - Users can submit a new book recommendation (title, author, optional description, link, and topic selection).
   - Users can select one or more topics for each book.
   - **Enhancement:** Google Books API integration for auto-suggestions when entering book titles.
   - **Enhancement:** Auto-population of book details (author, description, cover image) from Google Books.
   - **Enhancement:** Topic suggestions based on book categories from Google Books API.

2. **Book Browsing** ✅
   - Display a list of all recommended books with cover images.
   - Filter books by topic.
   - Sort books by most votes or most recent.

3. **Voting** ✅
   - Users can upvote books they are interested in.
   - Each user can only vote once per book.
   - **Enhancement:** Ability to undo votes with visual feedback.

4. **Topics Management** ✅
   - Display all available topics.
   - Topic auto-complete for easier selection.

5. **Book Details** ✅
   - View detailed information about each book (description, link, who recommended, votes, cover image).

---

## Nice-to-Have Features

- ✅ User authentication (to prevent duplicate voting and allow tracking of recommendations).
- ✅ Comments/discussions on each book, with ability to add, view, and delete comments.
- ✅ Book status tracking with the following options:
  - "Already Read" (with count and undo functionality)
  - "Reading Now" (with count and undo functionality)
  - "Skimmed" (with count and undo functionality)
  - "Want to Read" (with count and undo functionality)
- ⏳ Admin dashboard for content moderation. *(Not yet implemented)*

---

## Tasks & Milestones

### 1. Project Setup ✅
- [x] Initialize project repository
- [x] Set up frontend (React)
- [x] Set up backend (Node.js/Express) and database (SQLite)

### 2. Data Modeling ✅
- [x] Design database schema for books, topics, votes, and users

### 3. Core Functionality ✅
- [x] Implement book submission form with Google Books API integration
- [x] Implement book listing and filtering by topic
- [x] Implement voting mechanism (with vote count, restrictions, and undo functionality)
- [x] Implement topic management UI

### 4. UI/UX ✅
- [x] Design and implement responsive UI
- [x] Add sorting and filtering controls
- [x] Display book details
- [x] Implement user status indicators (Already Read, Reading Now, Skimmed, Want to Read)

### 5. Testing ⏳
- [ ] Write unit and integration tests for backend and frontend
- [x] User acceptance testing

### 6. Deployment ⏳
- [ ] Set up hosting (e.g., Vercel, Netlify, Heroku)
- [x] Prepare documentation and README

---

## Success Metrics

- Number of books recommended.
- Number of votes cast.
- Number of status updates (Already Read, Reading Now, Skimmed, Want to Read).
- User engagement (return visits, votes per user, status updates per user).
- Qualitative feedback from group members.

---

## Timeline Estimate

| Task                   | Duration      | Status        |
|------------------------|---------------|---------------|
| Project Setup          | 1 day         | Completed     |
| Data Modeling          | 1 day         | Completed     |
| Core Functionality     | 3-5 days      | Completed     |
| UI/UX                  | 2-3 days      | Completed     |
| Testing                | 1-2 days      | In Progress   |
| Deployment             | 1 day         | Pending       |

---

## Additional Enhancements Implemented

1. **Undo Functionality**
   - Users can undo their votes and status selections (Already Read, Reading Now, Skimmed, Want to Read)
   - Visual indication of current selections with color and text changes

2. **Google Books Integration**
   - Auto-complete for book titles
   - Automatic retrieval of book information (author, description, cover image)
   - Topic suggestions based on book categories

3. **User Experience Improvements**
   - Visual feedback for current user selections
   - Clear labeling of actions that can be undone
   - Consistent styling and responsive design

---

**Last Updated:** May 12, 2025
