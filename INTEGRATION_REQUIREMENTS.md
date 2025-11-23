# Integration Requirements: Old + New Charging Systems

## Mission: Enable users to register chargers, earn revenue, and allow remote control

---

## Architecture Changes Needed

### 1. Link Old & New Systems

**Database Schema Updates:**

```sql
-- Update OLD system (evconnect.chargers)
ALTER TABLE evconnect.chargers 
ADD COLUMN "chargeBoxIdentity" VARCHAR UNIQUE,
ADD COLUMN "ocppEndpoint" VARCHAR,
ADD COLUMN "isConnected" BOOLEAN DEFAULT false,
ADD COLUMN "lastSeen" TIMESTAMP;

-- Update NEW system (evcharging.Charger)
ALTER TABLE evcharging."Charger"
ADD COLUMN "ownerId" UUID,
ADD COLUMN "registryId" UUID,
ADD COLUMN "pricePerKwh" DECIMAL(8,4);
```

**Cross-Database Link:**
- `evconnect.chargers.chargeBoxIdentity` → `evcharging.Charger.chargeBoxIdentity`
- When charger connects via OCPP, update both databases

---

## Feature Implementation Checklist

### ✅ Phase 1: Charger Registration (1 week)

**Backend Changes:**

1. **Update ChargerService** (evconnect_backend/src/charger/charger.service.ts)
```typescript
async create(dto: CreateChargerDto, ownerId: string) {
  // Generate unique chargeBoxIdentity
  const chargeBoxIdentity = `CHG-${ownerId.substring(0,8)}-${Date.now()}`;
  
  const charger = await this.chargerRepository.save({
    ...dto,
    ownerId,
    chargeBoxIdentity,
    ocppEndpoint: 'ws://your-domain.com:4000/ocpp',
    isConnected: false,
  });
  
  return {
    ...charger,
    setupInstructions: {
      endpoint: charger.ocppEndpoint,
      identity: charger.chargeBoxIdentity,
      apiKey: 'Generate secure key here',
    }
  };
}
```

2. **Add Status Sync Endpoint**
```typescript
// Poll NEW system for online status
async syncChargerStatus(chargeBoxIdentity: string) {
  const ocppCharger = await this.chargingService.getChargerDetails(chargeBoxIdentity);
  
  await this.chargerRepository.update(
    { chargeBoxIdentity },
    { 
      isConnected: ocppCharger.isOnline,
      lastSeen: ocppCharger.lastHeartbeat,
    }
  );
}
```

**Flutter Changes:**

3. **Update RegisterChargerScreen**
```dart
// After successful registration, show OCPP setup guide
void _showSetupInstructions(Map<String, dynamic> response) {
  showDialog(
    context: context,
    builder: (context) => AlertDialog(
      title: Text('Charger Registered!'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('Configure your charger with:'),
          SizedBox(height: 16),
          SelectableText('Endpoint: ${response['ocppEndpoint']}'),
          SelectableText('Identity: ${response['chargeBoxIdentity']}'),
          SelectableText('API Key: ${response['setupInstructions']['apiKey']}'),
        ],
      ),
    ),
  );
}
```

4. **Update Map Screen**
```dart
// Show online/offline status from both systems
FutureBuilder(
  future: Future.wait([
    apiClient.get('/chargers'), // OLD system (locations)
    apiClient.get('/charging/chargers/connected'), // NEW system (online status)
  ]),
  builder: (context, snapshot) {
    final chargers = snapshot.data[0];
    final onlineChargers = snapshot.data[1];
    
    // Merge data by chargeBoxIdentity
    return GoogleMap(
      markers: chargers.map((charger) {
        final isOnline = onlineChargers.any(
          (c) => c.chargeBoxIdentity == charger.chargeBoxIdentity
        );
        return Marker(
          icon: isOnline ? greenPin : grayPin,
          // ...
        );
      }).toSet(),
    );
  },
)
```

---

### ✅ Phase 2: Remote Control Commands (1 week)

**EV Charging Service Updates:**

5. **Implement Missing OCPP Commands** (ev-charging-service/src/services/ocppService.js)

```javascript
// UnlockConnector
async unlockConnector(chargeBoxIdentity, connectorId) {
  const ws = chargerConnections.get(chargeBoxIdentity);
  if (!ws) throw new Error('Charger offline');
  
  const messageId = generateUniqueId();
  const message = [
    2, // CALL
    messageId,
    'UnlockConnector',
    { connectorId }
  ];
  
  return new Promise((resolve, reject) => {
    ws.send(JSON.stringify(message));
    responseHandlers.set(messageId, { resolve, reject, timeout: 30000 });
  });
}

// ChangeAvailability (Lock/Unlock equivalent)
async lockConnector(chargeBoxIdentity, connectorId) {
  // Send ChangeAvailability with type="Inoperative"
}

async unlockConnectorForUser(chargeBoxIdentity, connectorId) {
  // Send ChangeAvailability with type="Operative"
}

// SetChargingProfile (Limits)
async setChargingLimit(chargeBoxIdentity, connectorId, maxPower, maxEnergy) {
  const message = [
    2,
    generateUniqueId(),
    'SetChargingProfile',
    {
      connectorId,
      csChargingProfiles: {
        chargingProfileId: Date.now(),
        stackLevel: 0,
        chargingProfilePurpose: 'TxProfile',
        chargingProfileKind: 'Relative',
        chargingSchedule: {
          chargingRateUnit: 'W',
          chargingSchedulePeriod: [{
            startPeriod: 0,
            limit: maxPower * 1000, // Convert kW to W
          }]
        }
      }
    }
  ];
  
  ws.send(JSON.stringify(message));
}
```

6. **Add REST Endpoints** (ev-charging-service/src/index.js)

```javascript
// Lock/Unlock
app.post('/chargers/:id/lock', authenticateApiKey, async (req, res) => {
  try {
    const { chargeBoxIdentity } = await prisma.charger.findUnique({
      where: { id: req.params.id }
    });
    
    await ocppService.lockConnector(chargeBoxIdentity, 1);
    res.json({ success: true, message: 'Connector locked' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/chargers/:id/unlock', authenticateApiKey, async (req, res) => {
  // Similar to lock
});

// Set Limits
app.post('/chargers/:id/set-limit', authenticateApiKey, async (req, res) => {
  const { maxPower, maxEnergy } = req.body;
  // Call ocppService.setChargingLimit(...)
});
```

**Backend Proxy Updates:**

7. **Add Control Methods** (evconnect_backend/src/charging/charging.service.ts)

```typescript
async lockCharger(chargerId: string) {
  const response = await firstValueFrom(
    this.httpService.post(
      `${this.chargingServiceUrl}/chargers/${chargerId}/lock`,
      {},
      { headers: this.getHeaders() }
    )
  );
  return response.data;
}

async setChargingLimit(chargerId: string, maxPower: number) {
  // Similar pattern
}
```

8. **Add Controller Endpoints** (evconnect_backend/src/charging/charging.controller.ts)

```typescript
@Post('chargers/:id/lock')
@UseGuards(JwtAuthGuard)
async lockCharger(@Param('id') id: string, @Request() req) {
  // Verify user owns this charger (query OLD system)
  const charger = await this.chargerService.findOne(id);
  if (charger.ownerId !== req.user.userId) {
    throw new ForbiddenException('Not your charger');
  }
  
  return this.chargingService.lockCharger(id);
}
```

**Flutter UI:**

9. **Add Control Buttons** (charging_session_screen.dart)

```dart
Row(
  children: [
    ElevatedButton.icon(
      icon: Icon(Icons.lock),
      label: Text('Lock'),
      onPressed: () async {
        await chargingService.lockCharger(chargerId);
      },
    ),
    SizedBox(width: 8),
    ElevatedButton.icon(
      icon: Icon(Icons.lock_open),
      label: Text('Unlock'),
      onPressed: () async {
        await chargingService.unlockCharger(chargerId);
      },
    ),
  ],
)

// Power limit slider
Slider(
  min: 0,
  max: charger.powerKw,
  value: currentLimit,
  onChanged: (value) => setState(() => currentLimit = value),
  onChangeEnd: (value) async {
    await chargingService.setChargingLimit(chargerId, value);
  },
)
```

---

### ✅ Phase 3: Revenue Tracking (1 week)

10. **Session Revenue Split**

```typescript
// After session completes
async completeSession(sessionId: string) {
  const session = await this.getSessionDetails(sessionId);
  
  // Get charger owner from OLD system
  const charger = await this.chargerService.findOne(session.chargerId);
  
  const platformFee = 0.15; // 15% platform fee
  const ownerRevenue = session.totalCost * (1 - platformFee);
  
  await this.revenueRepository.save({
    sessionId,
    ownerId: charger.ownerId,
    totalCost: session.totalCost,
    ownerRevenue,
    platformRevenue: session.totalCost * platformFee,
    energyDelivered: session.energyDelivered,
  });
  
  // Trigger payment to owner wallet/account
}
```

11. **Owner Dashboard Endpoint**

```typescript
@Get('owner/earnings')
@UseGuards(JwtAuthGuard)
async getOwnerEarnings(@Request() req) {
  const chargers = await this.chargerService.findByOwner(req.user.userId);
  
  return {
    totalEarnings: await this.calculateTotalEarnings(chargers),
    thisMonth: await this.calculateMonthlyEarnings(chargers),
    sessions: await this.getOwnerSessions(chargers),
  };
}
```

12. **Flutter Owner Dashboard**

```dart
class OwnerDashboardScreen extends StatelessWidget {
  Widget build(BuildContext context) {
    return FutureBuilder(
      future: apiClient.get('/owner/earnings'),
      builder: (context, snapshot) {
        return Column(
          children: [
            Card(
              child: ListTile(
                title: Text('Total Earnings'),
                trailing: Text('\$${snapshot.data['totalEarnings']}'),
              ),
            ),
            // Chart of earnings over time
            // List of recent sessions
            // Charger performance stats
          ],
        );
      },
    );
  }
}
```

---

### ✅ Phase 4: Dynamic Pricing (3 days)

13. **Per-Charger Pricing**

```typescript
// When creating session, use charger's price
const charger = await this.chargerService.findOne(chargerId);
const pricePerKwh = charger.pricePerKwh; // From OLD system

// Store in NEW system session
await prisma.session.update({
  where: { id: sessionId },
  data: { pricePerKwh }
});

// Calculate cost on session end
const cost = energyDelivered * pricePerKwh;
```

---

## Summary: Is Your Vision Fulfilled?

### ✅ Currently Working:
- Start/Stop charging
- Real-time energy monitoring
- Basic payments per kWh
- Session management

### ⚠️ Needs Implementation:
- ❌ User charger registration (link to owner)
- ❌ Lock/Unlock connector
- ❌ Set charging limits
- ❌ Revenue tracking & distribution
- ❌ Owner dashboard
- ❌ Map discovery with online status
- ❌ User control of their home charger

### 🎯 Recommendation:

**DON'T replace the old system - INTEGRATE THEM!**

**Timeline:**
- Phase 1 (Charger Registration): 1 week
- Phase 2 (Remote Control): 1 week  
- Phase 3 (Revenue Tracking): 1 week
- Phase 4 (Dynamic Pricing): 3 days

**Total: ~4 weeks to complete your full vision**

---

## Next Steps

1. **Approve integration approach** (not replacement)
2. **Prioritize phases** (which to build first?)
3. **I'll implement** each phase systematically

Your vision is excellent and achievable! The NEW system provides the foundation (OCPP control), but we need to enhance it with ownership, revenue, and map discovery from the OLD system.

Shall I start with Phase 1 (Charger Registration)?
