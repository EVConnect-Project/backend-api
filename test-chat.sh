#!/bin/bash

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:3000"
WS_URL="ws://localhost:3000"

echo "🧪 Testing EVConnect Chat System"
echo "=================================="

# Step 1: Login as user 1
echo -e "\n${YELLOW}1. Logging in as first user...${NC}"
USER1_LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user1@test.com",
    "password": "password123"
  }')

USER1_TOKEN=$(echo $USER1_LOGIN | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$USER1_TOKEN" ]; then
  echo -e "${RED}❌ Failed to login as user1${NC}"
  echo "Response: $USER1_LOGIN"
  exit 1
fi

echo -e "${GREEN}✅ User1 logged in${NC}"
USER1_ID=$(echo $USER1_LOGIN | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "User1 ID: $USER1_ID"

# Step 2: Login as user 2
echo -e "\n${YELLOW}2. Logging in as second user...${NC}"
USER2_LOGIN=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user2@test.com",
    "password": "password123"
  }')

USER2_TOKEN=$(echo $USER2_LOGIN | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$USER2_TOKEN" ]; then
  echo -e "${RED}❌ Failed to login as user2${NC}"
  echo "Response: $USER2_LOGIN"
  exit 1
fi

echo -e "${GREEN}✅ User2 logged in${NC}"
USER2_ID=$(echo $USER2_LOGIN | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "User2 ID: $USER2_ID"

# Step 3: Create/Get conversation
echo -e "\n${YELLOW}3. Creating conversation between users...${NC}"
CONVERSATION=$(curl -s -X POST "$API_URL/chat/conversations" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -d "{
    \"participantId\": \"$USER2_ID\",
    \"type\": \"mechanic\"
  }")

CONVERSATION_ID=$(echo $CONVERSATION | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$CONVERSATION_ID" ]; then
  echo -e "${RED}❌ Failed to create conversation${NC}"
  echo "Response: $CONVERSATION"
  exit 1
fi

echo -e "${GREEN}✅ Conversation created${NC}"
echo "Conversation ID: $CONVERSATION_ID"

# Step 4: Send message via REST API
echo -e "\n${YELLOW}4. Sending message via REST API...${NC}"
MESSAGE=$(curl -s -X POST "$API_URL/chat/messages" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -d "{
    \"conversationId\": \"$CONVERSATION_ID\",
    \"content\": \"Hello! This is a test message from the chat system.\",
    \"type\": \"text\"
  }")

MESSAGE_ID=$(echo $MESSAGE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$MESSAGE_ID" ]; then
  echo -e "${RED}❌ Failed to send message${NC}"
  echo "Response: $MESSAGE"
  exit 1
fi

echo -e "${GREEN}✅ Message sent${NC}"
echo "Message ID: $MESSAGE_ID"

# Step 5: Get conversation messages
echo -e "\n${YELLOW}5. Retrieving conversation messages...${NC}"
MESSAGES=$(curl -s -X GET "$API_URL/chat/conversations/$CONVERSATION_ID/messages" \
  -H "Authorization: Bearer $USER1_TOKEN")

MESSAGE_COUNT=$(echo $MESSAGES | grep -o '"id"' | wc -l)

if [ "$MESSAGE_COUNT" -lt 1 ]; then
  echo -e "${RED}❌ Failed to retrieve messages${NC}"
  echo "Response: $MESSAGES"
  exit 1
fi

echo -e "${GREEN}✅ Retrieved $MESSAGE_COUNT message(s)${NC}"

# Step 6: Get user conversations
echo -e "\n${YELLOW}6. Getting user conversations...${NC}"
CONVERSATIONS=$(curl -s -X GET "$API_URL/chat/conversations" \
  -H "Authorization: Bearer $USER1_TOKEN")

CONV_COUNT=$(echo $CONVERSATIONS | grep -o '"id"' | wc -l)

if [ "$CONV_COUNT" -lt 1 ]; then
  echo -e "${RED}❌ Failed to retrieve conversations${NC}"
  echo "Response: $CONVERSATIONS"
  exit 1
fi

echo -e "${GREEN}✅ Retrieved $CONV_COUNT conversation(s)${NC}"

# Step 7: Check unread count
echo -e "\n${YELLOW}7. Checking unread count for user2...${NC}"
USER2_CONVERSATIONS=$(curl -s -X GET "$API_URL/chat/conversations" \
  -H "Authorization: Bearer $USER2_TOKEN")

echo "User2 conversations: $USER2_CONVERSATIONS"

# Summary
echo -e "\n${GREEN}=================================="
echo "✅ Chat System Test Complete!"
echo "==================================${NC}"
echo ""
echo "Summary:"
echo "  - User authentication: ✅"
echo "  - Conversation creation: ✅"
echo "  - Message sending: ✅"
echo "  - Message retrieval: ✅"
echo "  - Conversation listing: ✅"
echo ""
echo -e "${YELLOW}Note: WebSocket real-time messaging requires a WebSocket client test${NC}"
echo "You can test real-time features in the Flutter app."
