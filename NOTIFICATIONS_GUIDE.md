# Notification System Guide

## Overview
The application has a comprehensive notification system that alerts users about all task-related activities.

## Features

### 1. Notification Types
- **assigned**: When a task is assigned to a user
- **reminder**: Automatic reminders every 3 hours for pending/in-progress tasks
- **status_update**: When task status changes (pending → in-progress → completed)
- **comment**: When someone comments on a task or replies to a comment

### 2. Auto-Delete (TTL)
- All notifications automatically delete after **6 hours**
- Implemented using MongoDB TTL index with `expiresAt` field

### 3. Real-time Updates
- Bell icon with unread count badge updates automatically
- Notifications refresh without page reload
- Tasks list updates immediately after changes

### 4. Interactive Notifications
- Click any notification to open the task details modal
- Notifications are marked as read automatically when clicked
- View task details, update status, add comments all from the modal

### 5. Smart Notification Recipients
Notifications are sent to relevant users, excluding the person who performed the action:

#### Task Assignment
- All assigned users receive notifications
- Includes reminder scheduling for 3 hours later

#### Status Updates
- All assigned users (except the one who changed status)
- Task creator (if not in assigned list)
- Messages: "is now pending", "is now in progress", "has been completed"

#### Comments
- All assigned users (except the commenter)
- Task creator (if they're not the commenter)
- Parent comment author (for replies, if they're not the commenter)

#### Reminders
- Only users assigned to pending/in-progress tasks
- Sent every 3 hours until task is completed
- Automatically stops when task status changes to completed

## Technical Implementation

### Database Schema
```prisma
model Notification {
  id              String   @id @default(auto()) @map("_id") @db.ObjectId
  userId          String   @db.ObjectId
  taskId          String   @db.ObjectId
  type            String   // assigned, reminder, status_update, comment
  message         String
  isRead          Boolean  @default(false)
  createdAt       DateTime @default(now())
  expiresAt       DateTime // Auto-delete after 6 hours
  nextReminderAt  DateTime? // For scheduling next reminder
  
  @@index([userId])
  @@index([taskId])
  @@index([isRead])
  @@index([nextReminderAt(sort: Asc)])
  @@index([expiresAt(sort: Asc)], map: "notification_ttl")
}
```

### API Endpoints
- `GET /api/notifications` - Fetch notifications & unread count
- `PATCH /api/notifications/[id]/read` - Mark notification as read
- `POST /api/notifications` - Mark all as read
- `POST /api/notifications/check-reminders` - Generate reminder notifications

### Client-Side Polling
- Unread count: Every **30 seconds**
- Reminder check: Every **5 minutes**
- Silent handling of 401 errors (expired auth tokens)

### Event System
Uses custom window events for cross-component communication:
- `refreshTasks` - Triggers task list refresh
- `refreshNotifications` - Triggers notification refresh

## Usage Examples

### Creating a Task
```javascript
// When a task is created with assignedTo users:
// 1. Task is saved to database
// 2. Notifications created for all assigned users
// 3. nextReminderAt set to 3 hours from now
// 4. expiresAt set to 6 hours from now
// 5. window.dispatchEvent(new Event('refreshTasks'))
```

### Updating Task Status
```javascript
// When status changes from "pending" to "in-progress":
// 1. Task status updated
// 2. Notifications created for assignees + creator
// 3. Message: "Task Title is now in progress"
// 4. Reminders continue (until status = completed)
```

### Adding a Comment
```javascript
// When a user comments on a task:
// 1. Comment saved to database
// 2. Notifications sent to assignees, creator, parent author
// 3. Message: "User Name commented on 'Task Title'"
// 4. Excludes the commenter from notifications
```

### Clicking a Notification
```javascript
// When user clicks a notification:
// 1. Notification marked as read
// 2. Task details fetched by ID
// 3. TaskDetailsModal opens with full task info
// 4. User can update, delete, or comment on task
```

## Testing Checklist

- [ ] Create task → Verify assignment notifications appear
- [ ] Click notification → Verify task modal opens
- [ ] Change task status → Verify status update notifications
- [ ] Add comment → Verify comment notifications
- [ ] Reply to comment → Verify parent author gets notified
- [ ] Wait 3 hours → Verify reminder notifications (or trigger manually)
- [ ] Complete task → Verify reminders stop
- [ ] Wait 6 hours → Verify notifications auto-delete
- [ ] Check unread badge → Verify count is accurate
- [ ] Mark as read → Verify badge count decreases

## Configuration

### Reminder Interval
Change in [check-reminders/route.js](src/app/api/notifications/check-reminders/route.js):
```javascript
const nextReminderAt = new Date(now.getTime() + 3 * 60 * 60 * 1000); // 3 hours
```

### TTL Duration
Change in all notification creation code:
```javascript
const expiresAt = new Date(now.getTime() + 6 * 60 * 60 * 1000); // 6 hours
```

### Polling Intervals
Change in [layout.js](src/app/dashboard/layout.js):
```javascript
const unreadInterval = setInterval(fetchUnreadCount, 30000); // 30 seconds
const reminderInterval = setInterval(checkReminders, 5 * 60 * 1000); // 5 minutes
```

## Troubleshooting

### Notifications not appearing
- Check browser console for errors
- Verify MongoDB connection
- Check TTL index is set up correctly: `db.Notification.getIndexes()`

### 401 errors in console
- These are silently handled when auth tokens expire
- User can refresh page or will be redirected to login

### Reminders not working
- Check `/api/notifications/check-reminders` is being called every 5 minutes
- Verify `nextReminderAt` field is set when tasks are created
- Ensure tasks have status "pending" or "in-progress"

### Notifications not auto-deleting
- Verify MongoDB TTL index exists with `expireAfterSeconds: 0`
- Run: `node scripts/setup-ttl-index.js`
- MongoDB TTL background task runs every 60 seconds

## Future Enhancements
- WebSocket support for real-time notifications (no polling)
- Push notifications for mobile PWA
- Email notifications for important updates
- Notification preferences per user
- Mute notifications for specific tasks
- Notification history view (before auto-delete)
