# Complete Feature & UI Design Document
## Muscled Sales AI - Proposal Generation System

**Date:** October 21, 2025
**Time:** 1:35 PM EST

---

## System Overview

An AI-powered proposal generation system that helps agencies respond to Upwork job posts quickly with personalized, high-quality proposals. The system learns from admin feedback and continuously improves over time.

**Core Value Proposition:**
- Generate Upwork proposals in under 5 minutes
- AI learns from wins/losses to improve quality
- Systematic portfolio management
- Data-driven improvement through feedback loops

---

## User Roles & Permissions

### Admin (Full Access)
**Can do:**
- Manage portfolio pieces
- Review all proposals (any employee)
- Edit proposals and provide training feedback
- Manage knowledge base
- View analytics and performance metrics
- Edit AI prompts directly
- Approve/disable learned patterns
- Manage users (future)

### Employee (Limited Access)
**Can do:**
- Submit Upwork job posts
- Review generated proposals
- Edit proposals before sending
- Mark proposals as sent
- Track their own proposal outcomes
- View their own performance stats

---

## Complete Feature List

### Portfolio Management (Admin)
1. Create portfolio pieces with title, description
2. Add media links (Loom, Google Drive, Figma)
3. Categorize portfolio pieces
4. Tag with technologies and keywords
5. Mark portfolio as active/inactive
6. View portfolio usage statistics
7. See which pieces win most often

### Job Post Management (Employee)
8. Paste raw Upwork job post (entire copy-paste, no manual entry)
9. AI extracts structured data (title, budget, skills, client info, timeline)
10. Review and edit extracted data (fix any AI mistakes)
11. Job quality scoring (scores 0-10 based on skills match, budget fit, client quality)
12. Reject low-quality jobs (skip bad opportunities, don't generate proposals)
13. Track job post history (view all submitted, accepted, rejected jobs with filters)

### Proposal Generation (AI + Employee)
14. Auto-generate proposal from job post
15. Auto-select relevant portfolio pieces
16. Generate confidence score
17. Show why portfolio pieces were selected
18. Employee edit proposal text
19. Employee add/remove portfolio pieces
20. Copy proposal to clipboard
21. Mark as sent with timestamp

### Proposal Training (Admin)
22. View all proposals (filterable by employee, status, date)
23. Side-by-side comparison (AI vs edited version)
24. Rate proposals (overall + specific aspects)
25. Explain what AI did well/poorly
26. Explain why edits were made
27. Tag common issues
28. Flag patterns to learn
29. Add learnings to knowledge base
30. Mark proposals as training examples

### Knowledge Base Management (Admin)
31. Create knowledge base entries
32. Organize by category (greeting, CTA, industry, etc.)
33. Add examples to entries
34. Set priority levels
35. Edit/update entries
36. Track which entries are used most
37. Quick-add from proposal review

### AI Learning & Improvement
38. Track win/loss for every proposal
39. Extract patterns from winning proposals
40. Weight winning examples higher
41. Apply learned patterns to new proposals
42. Version control for prompts
43. A/B test prompt variations
44. Track prompt performance over time
45. Suggest prompt improvements based on feedback

### Analytics & Reporting (Admin)
46. Win rate over time
47. Proposals sent per day/week/month
48. Average contract value
49. Response rate
50. Time to send proposal
51. AI confidence vs actual win rate
52. Most common issues/mistakes
53. Improving vs degrading areas
54. Employee performance comparison
55. Portfolio piece effectiveness

### Outcome Tracking (Employee + Admin)
56. Mark client response received
57. Mark won/lost
58. Enter contract value
59. Add client feedback notes
60. Track response time

---

## UI Screen Inventory

### Admin Screens (9 main screens)

#### 1. Admin Dashboard
**Purpose:** Overview of system performance
**Key sections:**
- Win rate metric
- Proposals sent this month
- Avg contract value
- Revenue generated
- Quick stats (pending review, sent today)
- Recent activity feed
- Performance trend graph
- Top-performing portfolio pieces

#### 2. Portfolio Management
**Purpose:** Manage all portfolio pieces
**Key sections:**
- List view with filters (category, status, tags)
- Search bar
- Create new button
- Each portfolio card shows: title, categories, tags, usage count, win rate
- Actions: Edit, Preview, Archive, View Stats

#### 3. Portfolio Editor
**Purpose:** Create/edit portfolio piece
**Key sections:**
- Title field
- Description textarea
- Loom video URL field
- Google Drive link field
- Figma link field
- Category multi-select dropdown
- Tags input (autocomplete)
- Technologies used (chips)
- Preview pane
- Save/Cancel buttons

#### 4. Proposal History
**Purpose:** View all proposals from all employees
**Key sections:**
- Filter bar (employee, status, date range, win/loss)
- Sort options (date, confidence, outcome)
- Priority sections: Lost proposals, High confidence wins, Pending review
- Each proposal card: Job title, employee, date sent, status, outcome, confidence score
- Actions per card: View, Train AI, View Details

#### 5. Proposal Training Interface
**Purpose:** Review proposal and train AI
**Layout:**
- Top bar: Job post details (collapsible)
- Middle: Side-by-side diff (AI generated vs admin edits)
- Bottom: Training feedback form

**Key sections:**
- Job post summary
- Original AI proposal (left side)
- Admin's edited version (right side)
- Diff highlighting
- Selected portfolio pieces review
- Overall rating (1-5 stars)
- Category ratings (tone, relevance, personalization, CTA)
- "What AI did well" textarea
- "What AI did poorly" textarea
- "Why I made these changes" textarea
- Quick tag buttons
- Add to knowledge base button
- Mark as training example checkbox
- Save feedback button

#### 6. AI Performance Dashboard
**Purpose:** Track AI improvement over time
**Key sections:**
- Overall metrics cards (avg rating, win rate, proposals generated)
- Performance over time line chart
- Most common issues list
- What's improving section
- What needs work section
- Prompt version comparison table
- Recent training sessions feed

#### 7. Knowledge Base Management
**Purpose:** Manage manual guidelines and rules
**Key sections:**
- Category tabs (Greetings, CTAs, Industry Tips, Mistakes to Avoid, etc.)
- List of entries per category
- Search bar
- Create new entry button
- Each entry shows: title, priority, last updated, usage count
- Actions: Edit, Delete, View History

#### 8. Knowledge Base Editor
**Purpose:** Create/edit knowledge base entry
**Key sections:**
- Category dropdown
- Title field
- Priority dropdown (high, medium, low)
- Content/guideline textarea
- Examples section (multiple text fields)
- When to apply textarea
- Related tags
- Save/Cancel buttons

#### 9. Prompt Management
**Purpose:** Manage AI prompt versions
**Key sections:**
- Active prompt version indicator
- Version history table (version name, created date, performance)
- Create new version button
- AI suggestions section (auto-generated improvements)
- Each version actions: View, Activate, Edit, Compare

**Prompt Editor subsection:**
- Version name field
- Notes textarea
- Job analysis prompt textarea
- Portfolio selection prompt textarea
- Proposal generation prompt textarea
- Test prompt button
- Save as new version button

---

### Employee Screens (4 main screens)

#### 1. Employee Dashboard
**Purpose:** Quick access to daily tasks
**Key sections:**
- Today's stats (proposals sent, responses, wins)
- Win rate this month
- Pending proposals (drafts)
- Recent proposals list
- Quick actions: Submit Job, View History
- AI improvement notifications

#### 2. Submit Job Post
**Purpose:** Input Upwork job for proposal generation
**Layout flow:**
- Step 1: Paste job post
- Step 2: Review extracted data
- Step 3: Generate proposal

**Key sections:**
- Large textarea for raw job post
- Process button
- Loading state with progress
- Extracted data preview (title, budget, skills, client info)
- Edit extracted data option
- Job quality score indicator
- Accept/Reject buttons
- Generate proposal button

#### 3. Job Post Review
**Purpose:** Edit AI-extracted job data before generation
**Key sections:**
- Title field
- Description textarea
- Budget fields (type, min, max)
- Client info section (location, rating, spent, hourly rate)
- Skills tags (editable)
- Experience level dropdown
- Job type dropdown
- Back/Regenerate/Confirm buttons

#### 4. Proposal Editor
**Purpose:** Review and edit AI-generated proposal
**Layout:**
- Top: Job post summary (collapsible)
- Middle: Proposal content
- Bottom: Portfolio pieces
- Right sidebar: Metadata

**Key sections:**
- Job post quick view
- Confidence score badge
- Confidence reasons list
- Editable proposal textarea (rich text)
- Selected portfolio pieces cards (can remove)
- Add portfolio piece button
- Character count
- Tone indicator
- Actions: Copy to Clipboard, Save Draft, Mark as Sent
- Tips from AI (optional suggestions)

#### 5. Proposal History (Employee)
**Purpose:** Track employee's own proposals
**Key sections:**
- Filter bar (status, date, outcome)
- Stats summary (sent this week/month, win rate, pending)
- Proposal list cards
- Each card: Job title, date, status, outcome, actions
- Actions per card: View, Edit (if draft), Update Outcome

#### 6. Proposal Detail View
**Purpose:** View single proposal with full details
**Key sections:**
- Job post details
- Proposal text
- Portfolio pieces used
- Metadata (sent date, confidence, etc.)
- Outcome section (editable)
- Client response field
- Contract value field
- Win/loss radio buttons
- Save outcome button

---

## User Flows

### Flow 1: Employee Submits Job & Sends Proposal

**Goal:** Go from Upwork job post to sent proposal in under 5 minutes

```
1. Employee opens app → Employee Dashboard

2. Click "Submit Job Post"
   ↓
3. Submit Job Post screen
   - Paste entire job post from Upwork
   - Click "Process Job Post"
   ↓
4. Loading state (2-5 seconds)
   - "Extracting job details..."
   - "Analyzing requirements..."
   ↓
5. Job Post Review screen
   - Shows extracted data
   - Job quality score: 8.5/10
   - Edit any incorrect fields
   - Click "Generate Proposal"
   ↓
6. Loading state (5-10 seconds)
   - "Analyzing job requirements..."
   - "Selecting portfolio pieces..."
   - "Generating proposal..."
   ↓
7. Proposal Editor screen
   - Shows generated proposal
   - Confidence: 4.2/5
   - Selected 3 portfolio pieces
   - Read through proposal
   - Optional: Make minor edits
   - Click "Copy to Clipboard"
   ↓
8. Success message
   - "Copied to clipboard!"
   - Go to Upwork, paste proposal
   - Return to app
   - Click "Mark as Sent"
   ↓
9. Confirmation dialog
   - "Confirm sent to Upwork?"
   - Yes → Records timestamp
   ↓
10. Returns to Employee Dashboard
    - Shows in "Sent today" list
    - Ready for next job
```

**Total time:** 3-5 minutes

---

### Flow 2: Admin Creates Portfolio Piece

**Goal:** Add new project to portfolio library

```
1. Admin opens app → Admin Dashboard

2. Navigate to "Portfolio Management"
   ↓
3. Portfolio Management screen
   - Click "Create Portfolio Piece"
   ↓
4. Portfolio Editor screen (blank)
   - Fill in title: "E-commerce Platform for Fashion Brand"
   - Fill in description: "Built full-stack e-commerce site..."
   - Add Loom video URL
   - Add Figma design link
   - Select categories: ["Web Development", "E-commerce"]
   - Add tags: ["React", "Stripe", "Shopify", "Fashion"]
   - Add technologies: ["React", "Node.js", "MongoDB", "Stripe"]
   - Preview shows how it looks in proposals
   - Click "Save"
   ↓
5. Success message
   - "Portfolio piece created!"
   - Returns to Portfolio Management
   ↓
6. New piece appears in list
   - Status: Active
   - Usage: 0
   - Win rate: N/A (not used yet)
```

**Total time:** 2-3 minutes

---

### Flow 3: Admin Trains AI on Proposal

**Goal:** Review sent proposal and provide feedback to improve AI

```
1. Admin opens app → Admin Dashboard

2. Navigate to "Proposal History"
   ↓
3. Proposal History screen
   - Filter: "Lost Proposals" (prioritize learning from losses)
   - See proposal: "Full Stack Developer - $75/hr" - Status: Lost
   - Click "Train AI"
   ↓
4. Proposal Training Interface loads
   - Top: Job post details expanded
   - Left side: AI-generated proposal (original)
   - Right side: Empty (admin will edit here)
   ↓
5. Admin reads AI proposal
   - Identifies issues: Too generic, didn't mention client's specific pain point
   - Types improved version on right side
   - Changes:
     * "Hi there" → "Hi Sarah"
     * Adds reference to client's deadline concerns
     * Strengthens call-to-action
   ↓
6. Scroll down to feedback form
   - Overall rating: 2/5 stars
   - Tone: 3/5
   - Relevance: 2/5
   - Personalization: 1/5
   - CTA: 3/5
   ↓
7. Fill in text feedback
   - What AI did well: "Good structure, selected relevant portfolio pieces"
   - What AI did poorly: "Too generic, didn't personalize, missed client's main concern about timeline"
   - Why I made changes: "Client specifically mentioned tight 2-week deadline. Changed greeting to use name. Added paragraph emphasizing our fast delivery track record."
   ↓
8. Select quick tags
   - Tags: [missing_personalization] [client_pain_point_ignored] [weak_greeting]
   ↓
9. Click "Add to Knowledge Base" on the personalization edit
   - Quick form appears
   - Category: Personalization
   - Title: "Always use client's name if available"
   - Auto-filled with context
   - Click "Add"
   ↓
10. Click "Save Feedback"
    ↓
11. Success message
    - "Feedback saved! AI will learn from this."
    - Shows: "3 new patterns identified"
    - Returns to Proposal History
    ↓
12. Behind the scenes
    - System extracts patterns from admin's edits
    - Updates knowledge base
    - Flags this as training data
    - Next proposal will include these learnings
```

**Total time:** 5-8 minutes per proposal

---

### Flow 4: Admin Manages Knowledge Base

**Goal:** Add a manual guideline for AI to follow

```
1. Admin in Proposal Training Interface
   - Just finished editing a proposal
   - Noticed a pattern worth codifying
   ↓
2. Click "Add to Knowledge Base"
   ↓
3. Knowledge Base Quick Add modal
   - Category: [Industry Tips ▼]
   - Title: "For fintech jobs, emphasize security experience"
   - Priority: [High ▼]
   - Content: "When responding to fintech/banking jobs, always mention our security certifications, GDPR compliance experience, and secure coding practices."
   - Example: "We understand security is paramount in fintech. Our team is certified in..."
   - When to apply: "Job posts tagged with: finance, banking, fintech, payment processing"
   - Click "Save"
   ↓
4. Success message
   - "Added to Knowledge Base!"
   - "Will be applied to future fintech proposals"
   ↓
5. (Alternative flow) Navigate to Knowledge Base Management
   ↓
6. Knowledge Base Management screen
   - Tabs: [Greetings] [CTAs] [Industry Tips] [Mistakes] [Style]
   - Click "Industry Tips" tab
   ↓
7. See new entry in list
   - "For fintech jobs, emphasize security" - Priority: High
   - Usage count: 0 (not used yet)
   - Click to view details
   ↓
8. Knowledge Base Detail modal
   - Shows full entry
   - Usage stats (will populate as used)
   - Edit/Delete options
   - View proposals where this was applied
```

**Total time:** 2 minutes

---

### Flow 5: Employee Updates Proposal Outcome

**Goal:** Track whether proposal won or lost contract

```
1. Employee receives response from client on Upwork
   - Either: Interview scheduled, contract offered, or rejected
   ↓
2. Open app → Employee Dashboard
   ↓
3. Find proposal in "Recent proposals" or search in History
   ↓
4. Click on proposal card
   ↓
5. Proposal Detail View opens
   - Shows full proposal and job details
   - Scroll to "Outcome" section (currently empty)
   ↓
6. Update outcome
   - Client responded? [Yes ▼]
   - Status: [Won ▼] (or Lost, Interview Scheduled, No Response)
   - If Won:
     * Contract value: $5,000
     * Client response: "Great proposal! Let's work together."
   - If Lost:
     * Why? "Client went with someone cheaper"
   ↓
7. Click "Save Outcome"
   ↓
8. Success message
   - "Outcome recorded!"
   - If won: "Congrats! 🎉"
   ↓
9. Behind the scenes
   - Updates win rate statistics
   - If won: Marks this proposal as "training example" candidate
   - Triggers AI learning pipeline
   - Admin can review what made it successful
```

**Total time:** 1 minute

---

### Flow 6: Admin Reviews AI Performance

**Goal:** Check if AI is improving over time

```
1. Admin opens app → Admin Dashboard
   - Quick glance at stats
   ↓
2. Navigate to "AI Performance Dashboard"
   ↓
3. AI Performance Dashboard loads
   - Top metrics:
     * Avg proposal rating: 4.2/5 ↑ +0.3 from last month
     * Win rate: 28% ↑ +5% from last month
     * Proposals this month: 47
     * Training sessions: 23
   ↓
4. Scroll to "Performance Over Time" chart
   - Line chart shows rating improving from 3.8 to 4.2
   - Green upward trend
   ↓
5. Check "Most Common Issues"
   - 1. missing_personalization (18 times) ↓ -5 from last month
   - 2. weak_cta (12 times) ↑ +3 from last month
   - 3. too_generic (9 times) ↓ -2
   ↓
6. Insight: "weak_cta" is increasing
   - Click on "weak_cta"
   - Modal shows examples of weak CTAs
   - Admin decides to update knowledge base
   ↓
7. Navigate to Knowledge Base
   - Find CTA guidelines
   - Update with stronger examples
   - Save
   ↓
8. Return to AI Performance Dashboard
   - Click "View Prompt Version History"
   ↓
9. Prompt Management screen
   - Current version: v1.2 (28% win rate)
   - Previous: v1.1 (25% win rate)
   - Notice improvement
   ↓
10. Check "AI Suggestions" section
    - Suggestion 1: "Add instruction to reference client's timeline concerns"
      * Based on: 15 recent feedback instances
      * Click "Apply"
    - Suggestion 2: "Emphasize portfolio pieces earlier in proposal"
      * Based on: High-rated proposals do this
      * Click "Apply"
    ↓
11. System creates new prompt version
    - v1.3 created
    - Automatically activated
    - Will be used for next proposals
    ↓
12. Admin monitors over next week
    - Checks if win rate improves with new version
```

**Total time:** 10-15 minutes (weekly review)

---

### Flow 7: Job Quality Scoring & Rejection

**Goal:** Filter out low-quality jobs before wasting time

```
1. Employee submits job post
   ↓
2. AI processes and extracts data
   ↓
3. AI calculates quality score based on:
   - Skills match: 9/10 (perfect match)
   - Budget fit: 6/10 (on lower end)
   - Client quality: 4/10 (new client, no history, no payment verified)
   - Overall: 6.3/10
   ↓
4. Job Post Review screen
   - Shows quality score: 6.3/10 with warning badge
   - Breakdown:
     * ✅ Skills match: 9/10
     * ⚠️  Budget: 6/10 - "Below your typical rate"
     * ❌ Client quality: 4/10
       - New to Upwork
       - No payment verified
       - No reviews
   ↓
5. Employee decision point
   - Option A: "Generate Proposal Anyway" (might be worth a shot)
   - Option B: "Reject Job" (not worth time)
   ↓
6. If employee clicks "Reject Job"
   - Confirmation: "Are you sure? This job will be archived."
   - Yes → Job marked as rejected
   - Doesn't count against stats
   - Can view in history
   ↓
7. If employee clicks "Generate Proposal Anyway"
   - Proceeds to proposal generation
   - Lower confidence warning shown
   - Can still send if desired
```

**Total time:** 30 seconds to decide

---

## Design Principles

### 1. Speed First
**Principle:** Every action should be fast. No unnecessary steps.

**Implementation:**
- Default to "happy path" (fewest clicks)
- Auto-save drafts
- Keyboard shortcuts for power users
- Copy to clipboard one-click
- Bulk actions where possible
- Optimistic UI updates

**Example:**
- Bad: Submit job → Review → Confirm → Generate → Review → Confirm → Edit → Save → Copy → Confirm send
- Good: Submit job → Review (auto-proceed if good score) → Edit in place → Copy & Send (2 clicks)

---

### 2. Progressive Disclosure
**Principle:** Show what's needed now, hide complexity until needed.

**Implementation:**
- Job post details: Collapsed by default in proposal editor
- Advanced filters: Hidden under "More filters"
- AI confidence details: Expand to see reasoning
- Full proposal history: Paginated, not all loaded at once
- Knowledge base: Categorized, not flat list

**Example:**
- Proposal editor shows:
  - Visible: Proposal text, selected portfolio, key actions
  - Collapsed: Full job post, confidence reasoning, tips
  - Hidden: Past revisions, analytics, related proposals

---

### 3. Contextual Help
**Principle:** Guide users without interrupting flow.

**Implementation:**
- Inline tips where confusion might occur
- Empty states explain what to do next
- Tooltips on hover for icons
- Confidence score shows reasoning on click
- Error messages suggest fixes

**Example:**
- First time in Proposal Editor: "💡 Tip: Click any text to edit. AI learns from your changes!"
- Empty portfolio: "You haven't created any portfolio pieces yet. Start by showcasing your best work."

---

### 4. Feedback Visibility
**Principle:** System should show what's happening and why.

**Implementation:**
- Loading states show progress ("Analyzing job...", "Selecting portfolio...")
- Success messages confirm actions
- AI explains its decisions (why it selected portfolio pieces)
- Changes are highlighted (diff view)
- Stats show trends, not just numbers

**Example:**
- Instead of: "Confidence: 4.2/5"
- Show: "Confidence: 4.2/5 ⓘ
  - ✅ Found 3 highly relevant portfolio pieces
  - ✅ Similar to 5 past wins
  - ⚠️  Client budget higher than typical"

---

### 5. Data-Driven Decisions
**Principle:** Surface insights to drive improvement.

**Implementation:**
- Every screen shows relevant metrics
- Trends visible (up/down arrows)
- Compare periods (this month vs last month)
- Highlight anomalies
- Suggest actions based on data

**Example:**
- Admin dashboard doesn't just show "Win rate: 28%"
- Shows: "Win rate: 28% ↑ +5% from last month
  - Best day: Wednesday (35%)
  - Worst day: Monday (18%)
  - 💡 Consider focusing on Wednesday jobs"

---

### 6. Consistent Patterns
**Principle:** Same actions work the same way everywhere.

**Implementation:**
- All list views: Same filters, sorting, actions pattern
- All forms: Same button placement, validation style
- All modals: Same close behavior, keyboard shortcuts
- All edit screens: Auto-save behavior consistent
- All detail views: Same layout structure

**Example:**
- Card actions always in same position
- Primary action always blue, right-aligned
- Destructive actions always red, require confirmation
- Cancel always goes back without saving

---

### 7. Mobile-Friendly (Future)
**Principle:** Design with responsive in mind, even if starting desktop.

**Implementation:**
- Card-based layouts (stack well)
- Touch-friendly targets (44px minimum)
- Swipe gestures on mobile
- Bottom navigation on mobile
- Simplified views on small screens

---

## UI Component Patterns

### Cards
**Use for:** List items, portfolio pieces, proposals, knowledge base entries

**Standard card structure:**
```
┌────────────────────────────────────┐
│ [Icon] Title                  Badge │
│ Subtitle or date                   │
│ 1-2 lines of description...        │
│ ─────────────────────────────────  │
│ Meta info  |  [Action] [Action]    │
└────────────────────────────────────┘
```

---

### Metrics Cards
**Use for:** Dashboard stats, KPIs

**Structure:**
```
┌──────────────────────┐
│ Label                │
│ 28% ↑ +5%           │
│ ──────────────       │
│ vs last month        │
└──────────────────────┘
```

---

### Split View (Diff)
**Use for:** Comparing AI vs edited proposals

**Structure:**
```
┌──────────────────┬──────────────────┐
│ Original         │ Edited           │
├──────────────────┼──────────────────┤
│ Hi there,        │ Hi Sarah,        │
│                  │                  │
│ I'm interested..│ I'm excited...   │
│                  │                  │
│ [Unchanged text across both sides]│
│                  │                  │
└──────────────────┴──────────────────┘
```

**Highlighting:**
- Removed text: Red background
- Added text: Green background
- Changed text: Yellow background

---

### Forms
**Use for:** All data entry

**Principles:**
- Labels above fields
- Required fields marked with asterisk
- Validation inline (not on submit)
- Auto-save drafts
- Clear error messages

---

### Modals
**Use for:** Quick tasks, confirmations, details

**When to use:**
- Quick edits (don't need full page)
- Confirmations (destructive actions)
- Details (view-only info)
- Quick create (simple forms)

**When NOT to use:**
- Complex forms (use full page)
- Multi-step processes (use wizard or full page)

---

### Filters & Search
**Standard pattern across all list views:**
```
┌────────────────────────────────────────────┐
│ [Search box]  [Filter: Status ▼] [+ More] │
└────────────────────────────────────────────┘
```

**Sort options:**
- Always available as dropdown
- Default: Most recent first
- Remember user preference

---

### Empty States
**Every list/section needs empty state:**

```
┌────────────────────────────────┐
│                                │
│        [Icon]                  │
│    No proposals yet            │
│  Submit your first job post    │
│   to get started!              │
│                                │
│   [Primary Action Button]      │
│                                │
└────────────────────────────────┘
```

---

## Information Architecture

### Admin Navigation Structure
```
Muscled Sales AI
├── Dashboard (home)
├── Portfolio
│   ├── All Portfolio Pieces (list)
│   ├── Create New (form)
│   └── Portfolio Detail (view/edit)
├── Proposals
│   ├── All Proposals (list)
│   ├── Proposal Detail (view)
│   └── Train AI (training interface)
├── Knowledge Base
│   ├── All Entries (by category)
│   ├── Create Entry (form)
│   └── Entry Detail (view/edit)
├── AI Performance
│   ├── Dashboard (metrics)
│   ├── Prompt Management (versions)
│   └── Prompt Editor (create/edit)
└── Settings (future)
    ├── Users
    ├── Integrations
    └── Account
```

### Employee Navigation Structure
```
Muscled Sales AI
├── Dashboard (home)
├── Submit Job Post
│   ├── Paste Job (step 1)
│   ├── Review Job (step 2)
│   └── Generate Proposal (step 3)
├── Proposal Editor (edit/send)
├── My Proposals
│   ├── All Proposals (list)
│   └── Proposal Detail (view/update outcome)
└── My Stats (performance)
```

---

## Interaction Patterns

### Loading States
**Always show progress for operations >1 second**

**Types:**
1. Inline spinner (small operations)
2. Progress bar with steps (multi-step processes)
3. Skeleton screens (loading list data)

**Examples:**
- Processing job post: Progress bar with steps
- Generating proposal: Animated with status messages
- Loading list: Skeleton cards

---

### Confirmation Dialogs
**Use for destructive or important actions**

**Pattern:**
```
┌─────────────────────────────────┐
│  ⚠️  Confirm Action              │
├─────────────────────────────────┤
│ Are you sure you want to delete │
│ this portfolio piece?           │
│                                 │
│ This cannot be undone.          │
│                                 │
│        [Cancel]  [Delete]       │
└─────────────────────────────────┘
```

**When to use:**
- Delete anything
- Mark proposal as sent (commits timestamp)
- Deactivate prompt version
- Bulk actions

---

### Inline Editing
**Use for quick updates without leaving context**

**Pattern:**
- Click text to edit
- Shows input field
- Save automatically on blur or Enter
- Cancel on Escape

**Example:**
- Proposal titles
- Knowledge base entry titles
- Quick status updates

---

### Toast Notifications
**Use for non-critical feedback**

**Types:**
- Success (green)
- Error (red)
- Warning (yellow)
- Info (blue)

**Rules:**
- Auto-dismiss after 3-5 seconds
- User can dismiss early
- Don't stack (replace previous)
- Position: Top-right

---

### Drag & Drop
**Use where helpful, not everywhere**

**Potential uses:**
- Reorder portfolio pieces
- Reorder knowledge base entries by priority
- Organize proposals into folders (future)

---

## Accessibility Considerations

### Keyboard Navigation
- Tab through all interactive elements
- Enter/Space to activate
- Escape to close modals
- Arrow keys in dropdowns

### Screen Reader Support
- Proper ARIA labels
- Alt text for icons
- Announce dynamic content changes
- Clear form validation messages

### Visual
- High contrast mode support
- Color not sole indicator (use icons too)
- Large enough text (minimum 14px body)
- Sufficient spacing between interactive elements

---

## Mobile Considerations (Future Phase)

### Responsive Breakpoints
- Desktop: 1024px+
- Tablet: 768px - 1023px
- Mobile: 320px - 767px

### Mobile-Specific Patterns
- Bottom sheet for modals
- Swipe to delete
- Pull to refresh
- Sticky headers
- Bottom navigation bar
- Simplified forms (one field per screen for complex forms)

---

## Performance Considerations

### Perceived Performance
- Skeleton screens while loading
- Optimistic UI updates
- Cached data where appropriate
- Lazy load images and lists

### Actual Performance
- Paginate long lists
- Debounce search inputs
- Cache AI responses
- Background sync for non-critical data

---

## Future Enhancements (Not MVP)

### Collaboration Features
- Comments on proposals
- @mention admin for questions
- Shared proposal templates
- Team chat integration

### Advanced Analytics
- Heatmaps of proposal sections
- A/B test proposal variations
- Predictive win probability
- Revenue forecasting

### Integrations
- Direct Upwork API (if available)
- CRM integration (Pipedrive, HubSpot)
- Slack notifications
- Email parsing (auto-import jobs)

### AI Features
- Voice input for proposal edits
- Image generation for custom visuals
- Translation for international clients
- Sentiment analysis of client responses

---

## Summary

**Total Screens:** 15 main screens
- Admin: 9 screens
- Employee: 6 screens

**Core Flows:** 7 primary user flows
- 4 employee flows (submit, edit, send, track)
- 3 admin flows (manage portfolio, train AI, analyze)

**Key Principles:**
1. Speed first (under 5 min from job to send)
2. Progressive disclosure (show what's needed now)
3. Contextual help (guide without interrupting)
4. Feedback visibility (show what's happening)
5. Data-driven (surface insights)
6. Consistent patterns (predictable behavior)

**Design System Needed:**
- Color palette
- Typography scale
- Spacing system
- Component library
- Icon set
- Animation guidelines

This document serves as the blueprint for implementation. Each screen and flow should reference back to these principles and patterns for consistency.
