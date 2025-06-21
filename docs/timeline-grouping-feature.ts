// Timeline Grouping Feature Demo
// This file demonstrates how the chat history timeline grouping works

/*
FEATURE OVERVIEW:
================

1. Timeline Groups:
   - Today: Chats from today
   - Yesterday: Chats from yesterday  
   - This Week: Chats from earlier this week
   - Last Week: Chats from last week
   - This Month: Chats from earlier this month
   - Last Month: Chats from last month
   - Older: Chats older than last month

2. Smart Reordering:
   - When a past chat receives a new message, it automatically moves to "Today" group
   - When you switch to an existing chat session, it updates the timestamp and moves up
   - Sessions within each group are sorted by most recent activity

3. Implementation Details:
   - Uses `getTimelineGroup()` to categorize sessions by date
   - `getSessionsByTimeline()` groups sessions and sorts them
   - `updateSessionTimestamp()` refreshes timestamp when switching sessions
   - Timeline groups are re-calculated on every save/update

USAGE:
======

In Sidebar component:
- Displays chat history grouped by timeline periods
- Shows group headers (Today, Yesterday, etc.)
- Sessions sorted by most recent within each group

In ChatStorage:
- `getSessionsByTimeline()` returns TimelineGroup[]
- Each TimelineGroup has label, sessions[], and sortOrder
- Automatically handles reordering based on activity

BENEFITS:
=========

1. Better Organization: Users can easily find chats by time period
2. Natural Browsing: Recent activity is prominently displayed
3. Smart Reordering: Past chats automatically surface when active
4. Visual Clarity: Clear separation between time periods
5. Scalability: Handles large chat histories efficiently

EXAMPLE STRUCTURE:
==================

Today (2 chats)
├── "How to implement timeline grouping..." (5 messages, Just now)
└── "Debug React component issue" (12 messages, 2h ago)

Yesterday (1 chat)  
└── "Create authentication system" (8 messages, Yesterday)

This Week (3 chats)
├── "API documentation review" (15 messages, 2 days ago)
├── "Database schema design" (6 messages, 3 days ago)
└── "UI component library setup" (22 messages, 4 days ago)

Last Week (2 chats)
├── "Performance optimization" (9 messages, Dec 15)
└── "Security audit findings" (7 messages, Dec 14)
*/

export const TIMELINE_GROUPING_DEMO = {
  features: [
    "Automatic timeline categorization",
    "Smart reordering on activity", 
    "Visual group separation",
    "Recent activity prioritization",
    "Scalable organization"
  ],
  
  groups: [
    { name: "Today", sortOrder: 0, description: "Current day activity" },
    { name: "Yesterday", sortOrder: 1, description: "Previous day" },
    { name: "This Week", sortOrder: 2, description: "Earlier this week" },
    { name: "Last Week", sortOrder: 3, description: "Previous week" },
    { name: "This Month", sortOrder: 4, description: "Earlier this month" },
    { name: "Last Month", sortOrder: 5, description: "Previous month" },
    { name: "Older", sortOrder: 6, description: "More than a month ago" }
  ]
};
