# Chat Feature - Quick Start Guide

## 🚀 Overview

The chat system is **fully implemented and ready to use!** It includes:
- Real-time messaging via WebSocket
- Typing indicators
- Read receipts
- Unread message counts
- Support for mechanic and marketplace chats

---

## ✅ Recent Fixes

**Fixed User ID Issue (Just Now):**
- ✅ Chat screens now properly get current user ID from `authProvider`
- ✅ Conversations list correctly identifies current user
- ✅ No more confusion about userId vs participantId

---

## 📱 How to Use Chat

### 1. **Access Chat from Home Screen**

The home screen has a chat button with an unread count badge:

```dart
// Tap the chat icon in quick actions
// This navigates to: /conversations
```

### 2. **Start Chat with Mechanic**

From **Breakdown Assistance** screen:

1. Browse mechanics
2. Tap "Chat with Mechanic" button
3. System automatically:
   - Creates/finds conversation
   - Opens chat screen
   - You can start messaging immediately

**Code example:**
```dart
final conversation = await chatService.startMechanicChat(
  mechanicId,
  referenceId: breakdownRequestId,
  initialMessage: 'I need help!',
);
```

### 3. **Start Chat with Seller**

From **Marketplace Listing Details**:

1. View a product listing
2. Tap "Contact Seller" or chat button
3. System automatically:
   - Creates/finds conversation
   - Opens chat screen
   - Sends optional initial message

**Code example:**
```dart
final conversation = await chatService.startMarketplaceChat(
  sellerId,
  listingId: listingId,
  initialMessage: 'Is this still available?',
);
```

### 4. **View All Conversations**

Navigate to conversations list:
```dart
Navigator.pushNamed(context, '/conversations');
```

Shows:
- All active conversations
- Last message preview
- Unread count badges
- Timestamps
- User avatars/icons

---

## 🎨 Chat UI Features

### Chat Screen
- **Message Bubbles:** Different colors for sent/received messages
- **Typing Indicator:** Shows when other person is typing
- **Read Receipts:** Messages marked as read automatically
- **Auto-Scroll:** Scrolls to bottom when new messages arrive
- **Message Input:** Text field with send button
- **User Avatar:** Shows other participant's info in app bar

### Conversations List
- **Unread Badges:** Red badge with count
- **Last Message:** Preview of most recent message
- **Timestamps:** Human-readable time (e.g., "2 hours ago")
- **Pull-to-Refresh:** Swipe down to refresh list
- **Empty State:** Nice UI when no conversations

---

## 🔄 Real-Time Features

### WebSocket Connection
- **Automatic:** Connects when chat screen opens
- **Reconnects:** Auto-reconnect if connection drops (5 attempts)
- **Fallback:** Uses REST API if WebSocket unavailable

### Live Updates
- **New Messages:** Appear instantly in both users' screens
- **Typing Status:** Shows "typing..." when other user is typing
- **Read Status:** Notifies sender when message is read
- **Unread Count:** Updates badge on home screen in real-time

---

## 🧪 Testing the Chat

### Backend Test Script

Run the provided test script:

```bash
cd /Users/akilanishan/Documents/EVConnect-Project
./test-chat.sh
```

This tests:
1. User authentication
2. Conversation creation
3. Message sending
4. Message retrieval
5. Unread counts

### Manual Testing in App

**Test with 2 Users:**

1. **Device/Browser 1 (User A):**
   - Login as User A
   - Go to Breakdown Assistance
   - Start chat with a mechanic (User B)
   - Send message: "Hello!"

2. **Device/Browser 2 (User B):**
   - Login as User B (mechanic)
   - Check home screen - should see unread badge
   - Tap chat icon
   - See conversation with User A
   - Open chat - message appears
   - Reply: "Hi, how can I help?"

3. **Back to Device 1 (User A):**
   - Message from User B appears instantly
   - Type a message (User B sees "typing...")
   - Send message
   - User B receives it in real-time

**Expected Behavior:**
- ✅ Messages appear instantly on both screens
- ✅ Typing indicator shows while typing
- ✅ Messages marked as read when viewed
- ✅ Unread count updates in real-time
- ✅ Badge disappears when conversation is read

---

## 🔧 Configuration

### Update IP Address (if needed)

If your backend is on a different IP:

**File:** `evconnect_app/lib/core/api_client.dart`

```dart
static final String baseUrl = kIsWeb 
  ? 'http://localhost:3000/api' 
  : 'http://YOUR_IP:3000/api'; // Change YOUR_IP
```

**File:** `evconnect_app/lib/services/chat_service.dart`

```dart
final chatUrl = kIsWeb 
  ? 'http://localhost:3000/chat' 
  : 'http://YOUR_IP:3000/chat'; // Change YOUR_IP
```

---

## 🐛 Troubleshooting

### Issue: Messages not sending

**Check:**
1. Backend is running: `cd evconnect_backend && npm run start:dev`
2. User is authenticated (has valid JWT token)
3. Check console for errors

### Issue: WebSocket not connecting

**Check:**
1. Backend URL is correct (check IP address)
2. `/chat` namespace exists on backend
3. Check browser console: Should see "✅ Connected to chat"

**Console Logs:**
```
💬 Connecting to chat WebSocket...
✅ Connected to chat
📨 New message received
```

### Issue: Unread count not updating

**Check:**
1. WebSocket is connected
2. `markAsRead()` is called when viewing conversation
3. Backend is emitting `messagesRead` event

### Issue: Typing indicator not showing

**Check:**
1. WebSocket is connected
2. `sendTyping()` is called when user types
3. Backend gateway is handling `typing` event

---

## 📊 Chat Statistics

### Current Implementation:

- **Backend:**
  - ✅ 4 REST endpoints
  - ✅ 4 WebSocket events (join, sendMessage, typing, markRead)
  - ✅ 3 WebSocket broadcasts (newMessage, typing, messagesRead)
  - ✅ JWT authentication on all endpoints
  - ✅ TypeORM with PostgreSQL

- **Frontend:**
  - ✅ 2 main screens (conversations list, chat screen)
  - ✅ 1 widget (chat button with badge)
  - ✅ Real-time WebSocket integration
  - ✅ Riverpod state management
  - ✅ Modern Material 3 UI

---

## 📈 Next Features (Optional)

If you want to enhance the chat further:

1. **Image Sharing** - Upload and send images in chat
2. **Voice Messages** - Record and send audio
3. **Push Notifications** - FCM for new messages when app is closed
4. **Message Search** - Search through chat history
5. **Message Reactions** - React with emojis
6. **Message Editing** - Edit sent messages
7. **Message Deletion** - Delete messages
8. **Group Chats** - Multi-user conversations
9. **File Sharing** - Send documents/PDFs
10. **Location Sharing** - Already supported in models, needs UI

---

## ✅ Summary

**Chat is 100% functional!** 🎉

You can:
- ✅ Start conversations with mechanics
- ✅ Start conversations with marketplace sellers
- ✅ Send and receive messages in real-time
- ✅ See typing indicators
- ✅ Get read receipts
- ✅ Track unread messages
- ✅ Access chat from home screen
- ✅ View all conversations in one place

**Everything works out of the box!**

Just make sure:
1. Backend is running (`npm run start:dev`)
2. Database migrations are applied
3. Users are authenticated
4. IP addresses match your network

---

## 🆘 Need Help?

Check these files for reference:
- Backend: `/evconnect_backend/src/chat/`
- Frontend: `/evconnect_app/lib/services/chat_service.dart`
- Screens: `/evconnect_app/lib/screens/chat_screen.dart`
- Documentation: `/CHAT_IMPLEMENTATION_COMPLETE.md`
