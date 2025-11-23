# Complete Integration Flow - Step by Step

## 🔄 End-to-End Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PHASE 1: CHARGER REGISTRATION                        │
└─────────────────────────────────────────────────────────────────────────────┘

📱 Flutter App (User Action)
   │
   ├─► User fills registration form:
   │   • Charger name: "My Home Charger"
   │   • Location: "123 Main St"
   │   • Power: 7.4 kW
   │   • Price: $0.25/kWh
   │
   └─► Taps "Register Charger"

                    ↓ POST /chargers

🖥️  Backend (evconnect_backend:3000)
   │
   ├─► ChargersController.create()
   │   • Validates input
   │   • Creates charger in database
   │
   ├─► ChargerIntegrationService.generateOcppCredentials()
   │   │
   │   ├─► Generates unique chargeBoxIdentity
   │   │   Example: "EVCON-CH-a8f3d912"
   │   │
   │   ├─► Generates secure random password
   │   │   Example: "ocpp_pwd_x7k2m9n4p1q8"
   │   │
   │   ├─► Hashes password with bcrypt
   │   │
   │   └─► Saves to database:
   │       chargers.chargeBoxIdentity = "EVCON-CH-a8f3d912"
   │
   └─► Returns response to Flutter app:
       {
         "id": "charger-123",
         "name": "My Home Charger",
         "chargeBoxIdentity": "EVCON-CH-a8f3d912",
         "ocppPassword": "ocpp_pwd_x7k2m9n4p1q8",
         "wsUrl": "ws://your-server:8080",
         "setupInstructions": "Configure your charger with these credentials"
       }

                    ↓

📱 Flutter App (Display)
   │
   ├─► Shows success dialog with OCPP credentials
   ├─► Displays setup instructions
   └─► User can copy credentials to configure physical charger


┌─────────────────────────────────────────────────────────────────────────────┐
│                  PHASE 2: PHYSICAL CHARGER CONFIGURATION                     │
└─────────────────────────────────────────────────────────────────────────────┘

👤 Charger Owner (Physical Action)
   │
   ├─► Connects to charger's admin interface
   │   (Usually via Bluetooth, WiFi AP, or web interface)
   │
   ├─► Enters OCPP settings:
   │   • Charge Point Identity: EVCON-CH-a8f3d912
   │   • Central System URL: ws://your-server:8080
   │   • Password: ocpp_pwd_x7k2m9n4p1q8
   │   • Protocol: OCPP 1.6 JSON
   │
   ├─► Saves configuration
   │
   └─► Reboots charger


┌─────────────────────────────────────────────────────────────────────────────┐
│                    PHASE 3: OCPP CONNECTION & LINKING                        │
└─────────────────────────────────────────────────────────────────────────────┘

🔌 Physical Charger
   │
   └─► Connects to WebSocket: ws://your-server:8080

                    ↓ WebSocket Connection

⚡ Charging Service (ev-charging-service:4000)
   │
   ├─► OCPP Server receives connection on port 8080
   │
   ├─► Charger sends BootNotification:
   │   [2, "msg-id-1", "BootNotification", {
   │     "chargePointVendor": "Manufacturer",
   │     "chargePointModel": "Model-X",
   │     "chargeBoxSerialNumber": "SN12345"
   │   }]
   │
   ├─► Server validates credentials:
   │   • chargeBoxIdentity: "EVCON-CH-a8f3d912"
   │   • password: matches hashed password in database
   │
   ├─► Server accepts connection:
   │   [3, "msg-id-1", {
   │     "status": "Accepted",
   │     "currentTime": "2025-11-23T10:30:00Z",
   │     "interval": 300
   │   }]
   │
   ├─► Charger starts sending Heartbeat every 5 minutes
   │
   └─► Webhook triggered automatically:

                    ↓ POST /charger-integration/webhook/charger-connected

🖥️  Backend (evconnect_backend:3000)
   │
   ├─► ChargerIntegrationController.handleChargerConnected()
   │   • Receives: { chargeBoxIdentity: "EVCON-CH-a8f3d912" }
   │
   ├─► Finds registered charger by chargeBoxIdentity
   │
   ├─► Creates/updates OCPP charger in charging service database:
   │   • chargeBoxIdentity: "EVCON-CH-a8f3d912"
   │   • ownerId: "user-456"
   │   • status: "Available"
   │   • isOnline: true
   │
   └─► Links charger to owner for revenue tracking


┌─────────────────────────────────────────────────────────────────────────────┐
│                     PHASE 4: REAL-TIME STATUS DISPLAY                        │
└─────────────────────────────────────────────────────────────────────────────┘

📱 Flutter App (User Opens Charger Details)
   │
   ├─► Navigates to ModernChargerDetailScreen
   │
   ├─► Fetches charger data from backend
   │
   └─► Displays OCPP Status Card:

       ┌────────────────────────────────────────┐
       │  🔌 Remote Control Status              │
       │                                        │
       │  ● Online                              │  ← Green badge
       │  Last heartbeat: 2m ago                │
       │  Connection Status: Online             │
       └────────────────────────────────────────┘

       ┌────────────────────────────────────────┐
       │  🎮 Remote Controls                    │
       │                                        │
       │  ┌──────────┐    ┌──────────┐        │
       │  │ 🔓 Unlock │    │ ⚡ Set   │        │
       │  │ Connector │    │  Limit   │        │
       │  └──────────┘    └──────────┘        │
       └────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                      PHASE 5: REMOTE UNLOCK COMMAND                          │
└─────────────────────────────────────────────────────────────────────────────┘

📱 Flutter App (User Action)
   │
   ├─► User taps "Unlock Connector" button
   │
   ├─► _showUnlockDialog() shows confirmation:
   │   ┌────────────────────────────────────┐
   │   │  Unlock Connector                  │
   │   │                                    │
   │   │  This will unlock the connector    │
   │   │  on this charger. Continue?        │
   │   │                                    │
   │   │  [Cancel]  [Unlock]                │
   │   └────────────────────────────────────┘
   │
   └─► User taps "Unlock"

                    ↓

   ├─► _unlockConnector(context, ref) called
   │
   ├─► Shows SnackBar: "Sending unlock command..."
   │
   └─► ref.read(chargingServiceProvider).unlockConnector(chargerId, 1)

                    ↓ POST /charging/chargers/charger-123/unlock

⚡ Charging Service (ev-charging-service:4000)
   │
   ├─► ChargingController.unlockConnector()
   │
   ├─► Finds charger by ID: "EVCON-CH-a8f3d912"
   │
   ├─► Sends OCPP command via WebSocket:
   │   [2, "unique-msg-id", "UnlockConnector", {
   │     "connectorId": 1
   │   }]
   │
   └─► Waits for charger response

                    ↓

🔌 Physical Charger
   │
   ├─► Receives UnlockConnector command
   │
   ├─► Unlocks connector mechanically
   │
   └─► Sends response:
       [3, "unique-msg-id", {
         "status": "Unlocked"
       }]

                    ↓

⚡ Charging Service
   │
   └─► Returns success: { success: true }

                    ↓

📱 Flutter App
   │
   └─► Shows SnackBar: "Unlock command sent successfully" (green)


┌─────────────────────────────────────────────────────────────────────────────┐
│                   PHASE 6: SET POWER LIMIT COMMAND                           │
└─────────────────────────────────────────────────────────────────────────────┘

📱 Flutter App (User Action)
   │
   ├─► User taps "Set Power Limit" button
   │
   ├─► _showPowerLimitDialog() shows slider:
   │   ┌────────────────────────────────────┐
   │   │  Set Charging Power Limit          │
   │   │                                    │
   │   │           3.7 kW                   │
   │   │                                    │
   │   │  1.4 ├─────●─────────┤ 7.4        │
   │   │                                    │
   │   │  [Cancel]  [Set Limit]             │
   │   └────────────────────────────────────┘
   │
   ├─► User slides to 3.7 kW
   │
   └─► User taps "Set Limit"

                    ↓

   ├─► _setChargingLimit(context, ref, 3700) called
   │
   ├─► Shows SnackBar: "Setting power limit to 3.7 kW..."
   │
   └─► ref.read(chargingServiceProvider).setChargingLimit(chargerId, 3700, 1)

                    ↓ POST /charging/chargers/charger-123/set-limit

⚡ Charging Service (ev-charging-service:4000)
   │
   ├─► ChargingController.setChargingLimit()
   │
   ├─► Converts 3700W to charging profile:
   │   {
   │     "chargingProfileId": 1,
   │     "stackLevel": 0,
   │     "chargingProfilePurpose": "TxDefaultProfile",
   │     "chargingProfileKind": "Absolute",
   │     "chargingSchedule": {
   │       "chargingRateUnit": "W",
   │       "chargingSchedulePeriod": [{
   │         "startPeriod": 0,
   │         "limit": 3700
   │       }]
   │     }
   │   }
   │
   ├─► Sends OCPP command:
   │   [2, "msg-id-2", "SetChargingProfile", {
   │     "connectorId": 1,
   │     "csChargingProfiles": { ... }
   │   }]
   │
   └─► Waits for charger response

                    ↓

🔌 Physical Charger
   │
   ├─► Receives SetChargingProfile command
   │
   ├─► Applies power limit: max 3.7 kW
   │
   └─► Sends response:
       [3, "msg-id-2", {
         "status": "Accepted"
       }]

                    ↓

⚡ Charging Service
   │
   └─► Returns success: { success: true }

                    ↓

📱 Flutter App
   │
   └─► Shows SnackBar: "Power limit set to 3.7 kW" (green)


┌─────────────────────────────────────────────────────────────────────────────┐
│                     PHASE 7: CHARGING SESSION & REVENUE                      │
└─────────────────────────────────────────────────────────────────────────────┘

🚗 EV Driver
   │
   └─► Plugs car into charger

                    ↓

🔌 Physical Charger
   │
   ├─► Detects car connection
   │
   └─► Sends OCPP: StartTransaction
       [2, "msg-id-3", "StartTransaction", {
         "connectorId": 1,
         "idTag": "USER-RFID-123",
         "meterStart": 1000,
         "timestamp": "2025-11-23T11:00:00Z"
       }]

                    ↓

⚡ Charging Service
   │
   ├─► Creates charging session in database:
   │   • sessionId: "session-789"
   │   • chargeBoxIdentity: "EVCON-CH-a8f3d912"
   │   • transactionId: 42
   │   • startTime: 2025-11-23T11:00:00Z
   │   • meterStart: 1000 Wh
   │   • status: "Charging"
   │
   └─► Returns authorization:
       [3, "msg-id-3", {
         "transactionId": 42,
         "idTagInfo": { "status": "Accepted" }
       }]

                    ↓

🔌 Physical Charger
   │
   ├─► Starts charging at 3.7 kW (respecting our limit!)
   │
   └─► Sends MeterValues every minute

                    ↓ (after 2 hours)

🚗 EV Driver
   │
   └─► Stops charging (car full or user stops)

                    ↓

🔌 Physical Charger
   │
   └─► Sends OCPP: StopTransaction
       [2, "msg-id-4", "StopTransaction", {
         "transactionId": 42,
         "meterStop": 8400,
         "timestamp": "2025-11-23T13:00:00Z"
       }]

                    ↓

⚡ Charging Service
   │
   ├─► Updates session:
   │   • meterStop: 8400 Wh
   │   • energyDelivered: 7.4 kWh
   │   • endTime: 2025-11-23T13:00:00Z
   │   • status: "Completed"
   │
   ├─► Calculates cost:
   │   • Energy: 7.4 kWh
   │   • Price: $0.25/kWh
   │   • Total: 7.4 × $0.25 = $1.85
   │
   ├─► Distributes revenue (85/15 split):
   │   • Owner (85%): $1.85 × 0.85 = $1.57
   │   • Platform (15%): $1.85 × 0.15 = $0.28
   │
   └─► Updates database:
       ocpp_chargers.revenue += $1.57
       platform_revenue += $0.28

                    ↓

📱 Flutter App (Owner Views Revenue)
   │
   ├─► Calls: chargerIntegrationService.getOwnerRevenue()
   │
   └─► Displays:
       ┌────────────────────────────────────┐
       │  💰 Your Earnings                  │
       │                                    │
       │  Total Revenue: $1.57              │
       │  Sessions: 1                       │
       │  Avg per session: $1.57            │
       └────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                         CONTINUOUS OPERATIONS                                │
└─────────────────────────────────────────────────────────────────────────────┘

🔌 Physical Charger (Every 5 minutes)
   │
   └─► Sends Heartbeat:
       [2, "msg-id", "Heartbeat", {}]

                    ↓

⚡ Charging Service
   │
   ├─► Updates lastHeartbeat timestamp
   │
   ├─► Marks charger as online: isOnline = true
   │
   └─► Returns current time:
       [3, "msg-id", {
         "currentTime": "2025-11-23T14:05:00Z"
       }]

                    ↓

📱 Flutter App (When user views charger)
   │
   ├─► Fetches charger data
   │
   ├─► Calculates time since last heartbeat:
   │   lastHeartbeat: 2 minutes ago
   │
   └─► Updates UI:
       • Green badge if heartbeat < 10 min ago
       • Red badge if heartbeat > 10 min ago
```

## 🎯 Key Integration Points

### 1. **Auto OCPP Credential Generation**
- **When**: Charger registration
- **Where**: Backend ChargerIntegrationService
- **What**: Generates unique ID and password automatically
- **Result**: User gets credentials immediately, no manual setup

### 2. **Webhook Auto-Linking**
- **When**: Physical charger connects via OCPP
- **Where**: Charging service → Backend webhook
- **What**: Links OCPP charger to registered owner
- **Result**: Seamless connection without manual intervention

### 3. **Real-time Status Sync**
- **When**: Continuous (heartbeat every 5 min)
- **Where**: OCPP server updates, Flutter UI reads
- **What**: Shows online/offline status, last heartbeat
- **Result**: User knows charger health in real-time

### 4. **Remote Control Commands**
- **When**: User taps control buttons
- **Where**: Flutter → Backend → Charging Service → Physical Charger
- **What**: OCPP commands (Unlock, SetChargingProfile)
- **Result**: User controls charger from phone

### 5. **Revenue Distribution**
- **When**: Charging session completes
- **Where**: Charging service calculates and stores
- **What**: 85% to owner, 15% to platform
- **Result**: Automatic revenue tracking

## 📊 Data Flow Summary

```
Registration Flow:
User Input → Backend → Database → OCPP Credentials → User Display

Connection Flow:
Physical Charger → OCPP WebSocket → Charging Service → Webhook → Backend → Database Link

Status Flow:
Heartbeat → OCPP Server → Database → Backend API → Flutter UI → User Display

Control Flow:
User Tap → Dialog → API Call → OCPP Command → Physical Charger → Response → User Feedback

Revenue Flow:
Session End → Calculate Cost → Split 85/15 → Update Database → API → User Display
```

## ✅ What Makes This Special

1. **Zero Manual Linking** - Chargers auto-link via webhook when they connect
2. **Instant Credentials** - OCPP setup info provided immediately on registration
3. **Real-time Control** - Remote unlock and power limiting from mobile app
4. **Automatic Revenue** - 85/15 split calculated and tracked automatically
5. **Live Status** - Green/red badge shows charger health instantly
6. **User-Friendly** - Complex OCPP integration hidden behind simple UI

This complete flow creates a seamless experience from registration to revenue! 🎉
