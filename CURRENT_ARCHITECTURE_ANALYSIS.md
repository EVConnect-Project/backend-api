# EVConnect: Current System Architecture Analysis

## ✅ What You Already Have Built

### **Phase 1: Charger Registration & Discovery** (COMPLETE)

#### Backend (`evconnect_backend/src/charger/`)
- ✅ **POST /api/chargers** - Owners register their chargers
- ✅ **GET /api/chargers** - List all chargers
- ✅ **GET /api/chargers/nearby** - Location-based search (Haversine)
- ✅ **GET /api/chargers/my-chargers** - Owner's chargers
- ✅ **PATCH /api/chargers/:id** - Update charger info
- ✅ **DELETE /api/chargers/:id** - Remove charger

#### Charger Data Captured:
```typescript
{
  lat: number,          // Location
  lng: number,
  powerKw: number,      // Charging power
  pricePerKwh: number,  // Owner sets price ✅
  name: string,         // Charger name
  address: string,
  description: string,
  status: 'available' | 'in-use' | 'offline'
  ownerId: UUID         // Owner-charger link ✅
}
```

#### Flutter (`evconnect_app/lib/screens/`)
- ✅ **RegisterChargerScreen** - Register new charger with GPS location
- ✅ **FindChargerScreen** - Browse/search chargers
- ✅ **ModernChargerListScreen** - View all chargers
- ✅ **ModernChargerDetailScreen** - Charger details + Book button

---

### **Phase 2: Booking System** (COMPLETE)

#### Backend (`evconnect_backend/src/bookings/`)
- ✅ **POST /api/bookings** - Create time-slot booking
- ✅ **GET /api/bookings** - List all bookings
- ✅ **GET /api/bookings/my-bookings** - User's bookings
- ✅ **GET /api/bookings/charger/:id** - Charger's bookings
- ✅ **PATCH /api/bookings/:id/cancel** - Cancel booking
- ✅ **PATCH /api/bookings/:id/status** - Update status

#### Booking Data:
```typescript
{
  chargerId: UUID,
  userId: UUID,
  startTime: DateTime,
  endTime: DateTime,
  price: number,
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
}
```

#### Flutter
- ✅ **CreateBookingScreen** - Book time slot
- ✅ Booking list screens
- ✅ Booking management

---

### **Phase 3: OCPP Control System** (NEW - SEPARATE)

#### Microservice (`ev-charging-service/`)
- ✅ **OCPP 1.6 WebSocket Server** - Physical chargers connect
- ✅ **Real-time Status** - Heartbeat monitoring
- ✅ **Session Management** - Start/stop charging
- ✅ **Energy Tracking** - Meter values (kWh)
- ✅ **Transaction Lifecycle** - Complete OCPP flow

#### OCPP Commands Implemented:
- ✅ BootNotification
- ✅ Heartbeat
- ✅ StartTransaction
- ✅ StopTransaction
- ✅ MeterValues
- ✅ StatusNotification

#### Missing OCPP Commands:
- ❌ UnlockConnector
- ❌ ChangeAvailability
- ❌ SetChargingProfile
- ❌ RemoteStartTransaction (partial)
- ❌ RemoteStopTransaction (partial)

---

## ⚠️ THE MISSING LINK: Integration

### Current Situation (Disconnected Systems)

```
┌────────────────────────────────────────┐
│  OLD SYSTEM (Registration & Booking)  │
│  - User registers charger              │
│  - Sets location, price                │
│  - Others find and BOOK time slots     │
│  - Status: 'available' | 'in-use'      │
│  Database: evconnect.chargers          │
└────────────────────────────────────────┘
              ↓ ❌ NOT CONNECTED
┌────────────────────────────────────────┐
│  NEW SYSTEM (OCPP Control)             │
│  - Physical charger connects           │
│  - Real-time control (start/stop)      │
│  - Energy monitoring                   │
│  - Actual charging sessions            │
│  Database: evcharging.Charger          │
└────────────────────────────────────────┘
```

### The Problem:

1. **User registers charger** (OLD system) → Stored in `evconnect.chargers`
2. **Physical charger connects via OCPP** (NEW system) → Creates separate entry in `evcharging.Charger`
3. **❌ No link between them!**

**Result:**
- Old system shows charger on map but can't control it
- New system can control charger but doesn't know the owner or price
- Booking system creates time-slot reservations, but doesn't trigger actual charging

---

## 🎯 Solution: The Bridge

### What Needs to Happen When User Arrives at Charger:

**Current Flow (Booking Only):**
```
User finds charger on map
    ↓
Books time slot (2pm-3pm)
    ↓
Arrives at charger
    ↓
❌ Has to manually plug in and start
❌ No remote control
❌ No real-time monitoring
```

**Desired Flow (Your Vision):**
```
User finds charger on map
    ↓
Sees real-time status (Available/Charging/Offline)
    ↓
Taps "Start Charging" in app
    ↓
✅ App sends OCPP RemoteStartTransaction
    ↓
✅ Charger unlocks connector
    ↓
✅ User plugs in cable
    ↓
✅ Charging starts automatically
    ↓
✅ Real-time energy monitoring (kWh)
    ↓
User taps "Stop Charging"
    ↓
✅ App sends RemoteStopTransaction
    ↓
✅ Charger locks connector
    ↓
✅ Payment calculated: kWh × pricePerKwh
    ↓
✅ Revenue split: 85% owner / 15% platform
```

---

## 🔧 Required Integration Points

### 1. Database Schema Updates

**Option A: Link via chargeBoxIdentity**
```sql
-- Add to OLD system (evconnect.chargers)
ALTER TABLE evconnect.chargers 
ADD COLUMN "chargeBoxIdentity" VARCHAR UNIQUE,
ADD COLUMN "ocppConnected" BOOLEAN DEFAULT false,
ADD COLUMN "lastHeartbeat" TIMESTAMP;

-- Add to NEW system (evcharging.Charger)
ALTER TABLE evcharging."Charger"
ADD COLUMN "registryId" UUID,  -- Links to evconnect.chargers.id
ADD COLUMN "ownerId" UUID,      -- Owner from registration
ADD COLUMN "pricePerKwh" DECIMAL(8,4);  -- Price from registration
```

**Option B: Use same database (Recommended)**
```sql
-- Migrate evcharging tables into evconnect database
-- Merge Charger tables or create clear relationship
```

### 2. Backend Integration Service

**New Module: `ChargerIntegrationService`**
```typescript
// Links both systems
class ChargerIntegrationService {
  
  // When user registers charger
  async registerCharger(dto: CreateChargerDto, ownerId: string) {
    // 1. Create in OLD system (evconnect.chargers)
    const charger = await this.chargerService.create(dto, ownerId);
    
    // 2. Generate OCPP credentials
    const chargeBoxIdentity = `CHG-${charger.id.substring(0,8)}`;
    const apiKey = generateSecureKey();
    
    // 3. Update with OCPP info
    await this.chargerRepository.update(charger.id, {
      chargeBoxIdentity,
      ocppEndpoint: 'ws://your-domain.com:4000/ocpp',
    });
    
    // 4. Pre-register in OCPP system
    await this.chargingService.registerChargerIdentity(
      chargeBoxIdentity,
      charger.id,
      ownerId,
      dto.pricePerKwh
    );
    
    return { charger, setupInstructions: { chargeBoxIdentity, apiKey } };
  }
  
  // When OCPP charger connects
  async onChargerConnect(chargeBoxIdentity: string) {
    // 1. Find registered charger
    const charger = await this.chargerRepository.findOne({ chargeBoxIdentity });
    
    // 2. Update status
    await this.chargerRepository.update(charger.id, {
      ocppConnected: true,
      status: 'available',
    });
    
    // 3. Sync pricing to OCPP system
    await this.chargingService.updateChargerPrice(
      chargeBoxIdentity,
      charger.pricePerKwh
    );
  }
  
  // When user wants to charge
  async startChargingSession(userId: string, chargerId: string) {
    // 1. Get charger details (price, owner, etc.)
    const charger = await this.chargerService.findOne(chargerId);
    
    // 2. Check if connected via OCPP
    if (!charger.ocppConnected) {
      throw new Error('Charger is offline');
    }
    
    // 3. Create session in NEW system
    const session = await this.chargingService.createSession(
      userId,
      charger.chargeBoxIdentity
    );
    
    // 4. Send OCPP RemoteStartTransaction
    await this.chargingService.startCharging(session.id);
    
    return session;
  }
  
  // When session completes
  async onSessionComplete(sessionId: string) {
    const session = await this.chargingService.getSessionDetails(sessionId);
    const charger = await this.chargerService.findOne(session.chargerId);
    
    // Calculate revenue split
    const totalCost = session.energyDelivered * charger.pricePerKwh;
    const platformFee = 0.15; // 15%
    const ownerRevenue = totalCost * (1 - platformFee);
    
    // Record revenue
    await this.revenueService.create({
      sessionId,
      ownerId: charger.ownerId,
      totalCost,
      ownerRevenue,
      platformRevenue: totalCost * platformFee,
    });
    
    // Update booking status if exists
    await this.bookingsService.completeBooking(session.bookingId);
  }
}
```

### 3. Flutter Integration

**Update ModernChargerDetailScreen:**
```dart
// Show real-time OCPP status
FutureBuilder(
  future: Future.wait([
    apiClient.get('/chargers/${charger.id}'),  // Registration data
    apiClient.get('/charging/chargers/connected'),  // OCPP status
  ]),
  builder: (context, snapshot) {
    final chargerData = snapshot.data[0];
    final ocppStatus = snapshot.data[1].firstWhere(
      (c) => c.chargeBoxIdentity == chargerData.chargeBoxIdentity,
      orElse: () => null,
    );
    
    return Column(
      children: [
        // Show BOTH booking and OCPP control
        if (chargerData.ocppConnected && ocppStatus?.isOnline)
          ElevatedButton(
            onPressed: () => _startOCPPCharging(),
            child: Text('Start Charging (Remote Control)'),
          )
        else
          ElevatedButton(
            onPressed: () => _createBooking(),
            child: Text('Book Time Slot'),
          ),
        
        // Real-time status
        if (ocppStatus != null)
          StatusIndicator(
            status: ocppStatus.status,
            lastSeen: ocppStatus.lastHeartbeat,
          ),
      ],
    );
  },
)
```

---

## 📊 Summary

### ✅ You Already Have (95% Complete):
1. Charger registration system (owners register chargers)
2. Map discovery (users find chargers)
3. Pricing system (owners set $/kWh)
4. Booking system (reserve time slots)
5. OCPP control system (start/stop/monitor)
6. Revenue tracking foundation

### ❌ Missing (5% - The Integration):
1. Link between registered charger and OCPP charger
2. Generate OCPP credentials during registration
3. Bridge service to connect both systems
4. UI to show OCPP status on registered chargers
5. Automatic session → booking completion
6. Revenue distribution to owners

### 🎯 Your Architecture is Correct!

You were right to build them separately:
- **OLD system** = Registration, discovery, ownership, pricing
- **NEW system** = Physical control, real-time data

They just need a **bridge** to work together!

---

## Next Steps

1. **Build the bridge** (ChargerIntegrationService)
2. **Add chargeBoxIdentity to registration** (generate during signup)
3. **Update Flutter UI** to show OCPP status
4. **Add missing OCPP commands** (unlock, limits)
5. **Revenue distribution** on session complete

**Estimated Time: 1 week**

Should I implement the integration bridge now?
