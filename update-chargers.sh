#!/bin/bash

echo "🔧 Updating Existing Chargers with Type Information"
echo "===================================================="

# Database connection details
DB_NAME="evconnect"
DB_USER="akilanishan"
DB_HOST="localhost"

echo ""
echo "This will update all chargers without speedType/connectorType"
echo "Press Enter to continue or Ctrl+C to cancel..."
read

# Run the update
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -f update-existing-chargers.sql

echo ""
echo "✅ Done! Your chargers now have type information."
echo ""
echo "🔍 To verify, run:"
echo "   psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c \"SELECT name, \\\"speedType\\\", \\\"connectorType\\\" FROM chargers LIMIT 5;\""
