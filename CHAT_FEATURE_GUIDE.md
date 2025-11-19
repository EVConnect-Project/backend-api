# Professional Chat Feature - Implementation Guide

## Overview
This document describes the complete professional chat system implemented for EVConnect, enabling real-time messaging between users and mechanics/marketplace sellers.

## Features Implemented

### ✅ Backend Infrastructure (NestJS)
- **WebSocket Gateway** (`chat.gateway.ts`)
  - Real-time message delivery using Socket.IO
  - JWT authentication for WebSocket connections
  - Event handlers: `join`, `sendMessage`, `typing`, `markRead`
  - User socket tracking for online status
  - Automatic message broadcasting

- **Database Entities**
  - `Conversation` - Stores conversation metadata
    - Type: mechanic or marketplace
    - User and participant references
    - Unread counts for both parties
    - Last message tracking
  - `Message` - Stores individual messages
    - Message types: text, image, location, system
    - Read status and timestamps
    - Optional image URL and location data

- **REST API Endpoints** (`chat.controller.ts`)
  - `POST /chat/conversations` - Create new conversation
  - `GET /chat/conversations` - Get all user conversations
  - `GET /chat/conversations/:id/messages` - Get messages (paginated)
  - `PATCH /chat/conversations/:id/read` - Mark conversation as read
  - `GET /chat/unread-count` - Get total unread count

- **Business Logic** (`chat.service.ts`)
  - `getOrCreateConversation()` - Smart conversation creation/retrieval
  - `sendMessage()` - Message creation with validation
  - `getMessages()` - Paginated message retrieval
  - `markAsRead()` - Update read status
  - `getUnreadCount()` - Calculate unread messages

### ✅ Database Schema

#### Conversations Table
```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reference_id VARCHAR(255),
    reference_type VARCHAR(50),
    last_message TEXT,
    last_message_at TIMESTAMP,
    unread_count_user INTEGER DEFAULT 0,
    unread_count_participant INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, participant_id, type)
);

CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_participant ON conversations(participant_id);
CREATE INDEX idx_conversations_type ON conversations(type);
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at);
```

#### Messages Table
```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL DEFAULT 'text',
    content TEXT NOT NULL,
    image_url VARCHAR(500),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
```

### ✅ Flutter Frontend

#### Models (`lib/models/chat/chat_models.dart`)
- `Conversation` - Complete conversation data
  - Helper methods: `getUnreadCount()`, `getOtherParticipant()`
  - JSON serialization
- `ChatMessage` - Message with metadata
  - Helper method: `isMine(userId)`
  - Support for text, image, location
- `ChatUser` - User information
- `CreateConversationRequest` - DTO for creating conversations
- Enums: `ConversationType`, `MessageType`

#### Chat Service (`lib/services/chat_service.dart`)
- **WebSocket Connection**
  - `connect(userId, token)` - Establish WebSocket connection with auth
  - Event listeners for `newMessage`, `messagesRead`, `typing`
  - Automatic reconnection handling

- **WebSocket Methods**
  - `sendMessageWS(message)` - Send message via WebSocket
  - `sendTyping(conversationId, isTyping)` - Send typing indicator
  - `markAsReadWS(conversationId)` - Mark as read via WebSocket

- **REST API Methods**
  - `createConversation(request)` - Create new conversation
  - `getConversations()` - Fetch all conversations
  - `getMessages(conversationId, limit, offset)` - Paginated messages
  - `sendMessage(message)` - Send message via REST
  - `markAsRead(conversationId)` - Mark as read via REST
  - `getUnreadCount()` - Get total unread count

- **Quick Start Helpers**
  - `startMechanicChat(mechanicId, {referenceId, initialMessage})`
  - `startMarketplaceChat(sellerId, {listingId, initialMessage})`

#### UI Screens

##### ConversationsListScreen (`lib/screens/conversations_list_screen.dart`)
- **Features:**
  - List all user conversations
  - Unread message badges
  - Last message preview
  - Time formatting (HH:MM, Yesterday, Xd ago, DD/MM/YYYY)
  - Pull-to-refresh
  - Empty state handling
  - Error handling with retry
  - Navigation to ChatScreen

- **UI Elements:**
  - ConversationTile with avatar
  - Different icons for mechanic vs marketplace
  - Unread count indicator
  - Last message text
  - Formatted timestamp

##### ChatScreen (`lib/screens/chat_screen.dart`)
- **Features:**
  - Real-time message display
  - Message bubbles (sent/received styling)
  - Text input with send button
  - Typing indicators
  - Read receipts (✓ sent, ✓✓ read)
  - Auto-scroll to bottom
  - Message timestamps
  - Empty state handling
  - Loading states
  - Error handling

- **UI Elements:**
  - AppBar with participant info
  - Message bubbles with different colors
  - Text input with rounded corners
  - Send button (blue circle)
  - Typing indicator ("typing..." in green)
  - Read receipt icons

### ✅ Integration Points

#### 1. Breakdown Assistance Screen
- **Location:** `lib/screens/breakdown_assistance_screen.dart`
- **Features:**
  - Chat button in mechanic details modal
  - Floating action button for conversations list
  - Auto-creates conversation with mechanic
  - Initial message: "Hi, I need assistance with my vehicle."

- **Implementation:**
  ```dart
  // Mechanic details modal buttons
  Row(
    children: [
      ElevatedButton.icon(
        onPressed: () => _makePhoneCall(mechanic.phone!),
        icon: const Icon(Icons.phone),
        label: const Text('Call'),
      ),
      ElevatedButton.icon(
        onPressed: () => _startChatWithMechanic(mechanic),
        icon: const Icon(Icons.chat),
        label: const Text('Chat'),
      ),
    ],
  ),
  
  // Floating action button
  floatingActionButton: Column(
    mainAxisAlignment: MainAxisAlignment.end,
    children: [
      FloatingActionButton(
        onPressed: _openConversations,
        child: const Icon(Icons.chat),
      ),
      FloatingActionButton.extended(
        onPressed: _activateEmergencyMode,
        icon: const Icon(Icons.emergency),
        label: const Text('🚨 Emergency'),
      ),
    ],
  ),
  ```

#### 2. Marketplace Listing Details
- **Location:** `lib/screens/marketplace/listing_details_screen.dart`
- **Features:**
  - Chat button in seller section
  - Auto-creates conversation with seller
  - Initial message: "Hi, I'm interested in [listing title]."
  - Links conversation to listing ID

- **Implementation:**
  ```dart
  IconButton(
    icon: const Icon(Icons.chat_bubble_outline),
    onPressed: () async {
      final chatService = ChatService();
      final conversation = await chatService.startMarketplaceChat(
        listing.seller.id,
        listingId: listing.id,
        initialMessage: 'Hi, I\'m interested in ${listing.title}.',
      );
      
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => ChatScreen(conversation: conversation),
        ),
      );
    },
  )
  ```

## How to Use

### Starting the Backend
```bash
cd evconnect_backend
npm run start:dev
```

WebSocket endpoint: `ws://192.168.2.1:4000/chat`
REST API base: `http://192.168.2.1:4000/api/chat`

### Testing the Chat Feature

#### 1. Test Mechanic Chat
1. Open EVConnect app
2. Navigate to "Find Mechanics"
3. Select a mechanic
4. Tap "Chat" button
5. Send a message
6. Check for real-time delivery

#### 2. Test Marketplace Chat
1. Navigate to Marketplace
2. Select a listing
3. Scroll to seller section
4. Tap chat icon
5. Send a message
6. Verify conversation appears in conversations list

#### 3. Test Conversations List
1. Tap floating chat button on breakdown assistance screen
2. OR navigate to `/conversations` route
3. View all conversations
4. Check unread counts
5. Tap conversation to open chat

#### 4. Test Real-Time Features
1. Open chat on two devices (or web + mobile)
2. Send message from device 1
3. Verify it appears instantly on device 2
4. Test typing indicator
5. Test read receipts

## API Documentation

### WebSocket Events

#### Client → Server
- `join` - Join conversation room
  ```typescript
  { conversationId: string }
  ```

- `sendMessage` - Send new message
  ```typescript
  {
    conversationId: string,
    type: 'text' | 'image' | 'location',
    content: string,
    imageUrl?: string,
    latitude?: number,
    longitude?: number
  }
  ```

- `typing` - Send typing indicator
  ```typescript
  { conversationId: string, isTyping: boolean }
  ```

- `markRead` - Mark conversation as read
  ```typescript
  { conversationId: string }
  ```

#### Server → Client
- `newMessage` - Receive new message
  ```typescript
  {
    id: string,
    conversationId: string,
    senderId: string,
    type: string,
    content: string,
    createdAt: string
  }
  ```

- `messagesRead` - Messages marked as read
  ```typescript
  { conversationId: string }
  ```

- `typing` - User typing notification
  ```typescript
  { conversationId: string, userId: string, isTyping: boolean }
  ```

### REST Endpoints

#### POST /chat/conversations
Create new conversation
```json
{
  "type": "mechanic" | "marketplace",
  "participantId": "uuid",
  "referenceId": "optional-reference-id",
  "referenceType": "breakdown_request" | "marketplace_listing",
  "initialMessage": "optional initial message"
}
```

Response:
```json
{
  "id": "uuid",
  "type": "mechanic",
  "userId": "uuid",
  "participantId": "uuid",
  "user": { "id": "uuid", "name": "string", "email": "string" },
  "participant": { "id": "uuid", "name": "string", "email": "string" },
  "lastMessage": "string",
  "lastMessageAt": "timestamp",
  "unreadCountUser": 0,
  "unreadCountParticipant": 1,
  "createdAt": "timestamp"
}
```

#### GET /chat/conversations
Get all user conversations

Response:
```json
[
  {
    "id": "uuid",
    "type": "mechanic",
    "lastMessage": "string",
    "unreadCountUser": 0,
    "user": { ... },
    "participant": { ... }
  }
]
```

#### GET /chat/conversations/:id/messages?limit=50&offset=0
Get conversation messages

Response:
```json
[
  {
    "id": "uuid",
    "conversationId": "uuid",
    "senderId": "uuid",
    "type": "text",
    "content": "Hello!",
    "isRead": true,
    "createdAt": "timestamp"
  }
]
```

#### PATCH /chat/conversations/:id/read
Mark conversation as read

Response: `{ success: true }`

#### GET /chat/unread-count
Get total unread count

Response: `{ count: 5 }`

## Configuration

### Backend (evconnect_backend/src/chat/chat.gateway.ts)
```typescript
@WebSocketGateway({
  namespace: 'chat',
  cors: {
    origin: '*',
  },
})
```

### Flutter (evconnect_app/lib/services/chat_service.dart)
```dart
final socket = IO.io(
  'ws://192.168.2.1:4000/chat',
  OptionBuilder()
    .setTransports(['websocket'])
    .setAuth({'token': 'Bearer $token'})
    .build(),
);
```

### Routes (evconnect_app/lib/main.dart)
```dart
'/conversations': (context) => const ConversationsListScreen(),
```

## File Structure

```
evconnect_backend/
├── src/
│   └── chat/
│       ├── entities/
│       │   ├── conversation.entity.ts
│       │   └── message.entity.ts
│       ├── dto/
│       │   ├── create-conversation.dto.ts
│       │   └── send-message.dto.ts
│       ├── chat.gateway.ts
│       ├── chat.service.ts
│       ├── chat.controller.ts
│       └── chat.module.ts
│   └── auth/
│       └── guards/
│           └── ws-jwt.guard.ts

evconnect_app/
├── lib/
│   ├── models/
│   │   └── chat/
│   │       └── chat_models.dart
│   ├── services/
│   │   └── chat_service.dart
│   └── screens/
│       ├── conversations_list_screen.dart
│       ├── chat_screen.dart
│       ├── breakdown_assistance_screen.dart (integrated)
│       └── marketplace/
│           └── listing_details_screen.dart (integrated)
```

## Dependencies

### Backend
```json
{
  "@nestjs/websockets": "^10.0.0",
  "@nestjs/platform-socket.io": "^10.0.0",
  "socket.io": "^4.6.0"
}
```

### Flutter
```yaml
dependencies:
  socket_io_client: ^2.0.0
  flutter_riverpod: ^2.3.0
```

## Security

### Authentication
- REST endpoints: JWT authentication via `JwtAuthGuard`
- WebSocket: JWT authentication via `WsJwtGuard`
- Token passed in WebSocket handshake: `auth: { token: 'Bearer ...' }`

### Authorization
- Users can only access their own conversations
- Messages are filtered by user participation
- WebSocket events are user-scoped

### Data Validation
- DTOs validate all input data
- Message content length limits
- File upload size restrictions (when implemented)

## Future Enhancements

### Planned Features
- [ ] Image message support with file upload
- [ ] Location sharing with maps
- [ ] Voice messages
- [ ] Message reactions
- [ ] Message editing/deletion
- [ ] Push notifications
- [ ] Online/offline status
- [ ] Message search
- [ ] Conversation archiving
- [ ] Block/Report users

### Performance Optimizations
- [ ] Message caching
- [ ] Lazy loading for old messages
- [ ] WebSocket connection pooling
- [ ] Redis for real-time data
- [ ] Message delivery queue

## Troubleshooting

### WebSocket Connection Issues
1. Check backend is running: `npm run start:dev`
2. Verify WebSocket endpoint: `ws://192.168.2.1:4000/chat`
3. Check JWT token is valid
4. Ensure CORS is configured correctly

### Messages Not Delivering
1. Check WebSocket connection status: `chatService.isConnected`
2. Verify user is authenticated
3. Check conversation exists in database
4. Review backend logs for errors

### Unread Counts Not Updating
1. Call `markAsRead()` after viewing conversation
2. Verify `messagesRead` event is being emitted
3. Check database triggers are working
4. Refresh conversation list

## Support

For issues or questions, contact the development team or refer to:
- Backend code: `evconnect_backend/src/chat/`
- Flutter code: `evconnect_app/lib/services/chat_service.dart`
- Database schema: `evconnect_backend/migrations/` or SQL files
