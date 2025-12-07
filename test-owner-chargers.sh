#!/bin/bash

# Get auth token (you'll need to replace with actual token)
echo "Testing /owner/chargers endpoint..."
echo ""
echo "Please provide your JWT token:"
read -s TOKEN

curl -X GET http://localhost:3000/owner/chargers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '.'

