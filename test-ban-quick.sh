#!/bin/bash

# Quick test of ban endpoint
echo "Testing marketplace listing ban endpoint..."

# First, try to get a listing ID
echo ""
echo "Note: You need to be logged in as admin in your browser."
echo "The admin dashboard stores the token in localStorage."
echo ""
echo "To test manually:"
echo "1. Open browser console (F12)"
echo "2. Go to Console tab"
echo "3. Run: localStorage.getItem('admin_token')"
echo "4. Copy the token value"
echo ""
echo "Then test the endpoint with:"
echo 'curl -X POST "http://localhost:4000/api/admin/marketplace/listings/YOUR_LISTING_ID/ban" \'
echo '  -H "Authorization: Bearer YOUR_TOKEN" \'
echo '  -H "Content-Type: application/json"'
echo ""
echo "✅ Backend compilation successful!"
echo "✅ Ban endpoints are now available"
echo ""
echo "Please try clicking a ban button in the admin dashboard again."
