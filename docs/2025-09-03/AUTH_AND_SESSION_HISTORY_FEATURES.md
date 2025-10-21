# Authentication & Session History Features

## Two-Role Authentication System

**Roles:**
- **Admin**: Full access to review all employee sessions, transcripts, and conversations. Can view analytics and metrics across all users.
- **Employee**: Can only access their own sessions, transcripts, and conversations. Cannot view other employees' data.

**Implementation:**
- Login screen with email/password authentication via Supabase Auth
- Role-based access control (RBAC) using Supabase RLS policies
- Admin dashboard showing all sessions across all employees with filters (date, employee, duration)
- Employee view shows only sessions belonging to logged-in user

## ChatGPT-Style Session History

**Layout:**
- Group sessions by date: "Today", "Yesterday", "Previous 7 Days", "Previous 30 Days", "Older"
- Vertical list (not grid) with compact session rows showing title, preview, and timestamp
- Sticky date headers as you scroll
- Hover actions: delete, rename, share (admin only)
- Search and filter bar at top to find sessions by keywords or date range
