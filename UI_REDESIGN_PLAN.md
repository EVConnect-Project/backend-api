# UI Redesign Plan - EV Charging App

## Figma Design Reference
Source: https://www.figma.com/design/6mRoWpr19JoToe4UuS5ntg/EV-Charging-App-UI--Community-

## Phase 1: Theme & Design System (Current)

### Color Palette (To Extract from Figma)
Common EV Charging App Colors:
- **Primary**: Green/Blue tones (sustainability, technology)
- **Accent**: Electric blue, lime green
- **Background**: Light gray, white
- **Surface**: White, light cards
- **Text**: Dark gray hierarchy

### Typography
- **Font Family**: SF Pro Display / Inter / Poppins (check Figma)
- **Heading Sizes**: 24-32px (bold)
- **Body Text**: 14-16px (regular)
- **Captions**: 12px (light)

### Components to Build
1. **Charging Station Cards**
   - Compact list view
   - Detailed card with status indicators
   - Price display, availability, connector types

2. **Status Indicators**
   - Available (green)
   - In Use (blue/orange)
   - Offline (red/gray)
   - Reserved (yellow)

3. **Buttons**
   - Primary CTA (Start Charging, Book Now)
   - Secondary (Cancel, View Details)
   - Icon buttons (favorite, share, navigate)

4. **Input Fields**
   - Search bars with filters
   - Form inputs for bookings
   - Date/time pickers

5. **Progress Indicators**
   - Charging progress (circular/linear)
   - Battery level displays
   - Session timers

## Phase 2: Screen Priorities

### High Priority (Core User Flow)
1. ✅ Splash Screen
2. ✅ Login/Signup
3. ✅ Home/Dashboard
4. ✅ Find Chargers (Map + List)
5. ✅ Charger Details
6. ✅ Active Charging Session
7. ✅ Profile

### Medium Priority
8. My Vehicles
9. Payment Methods
10. Booking History
11. Transaction History
12. Favorites

### Low Priority (Secondary Features)
13. Settings
14. Help Center
15. Notifications
16. Marketplace
17. Mechanic Features

## Implementation Strategy

### Step 1: Extract Design Tokens
- [ ] Colors (primary, secondary, backgrounds, text)
- [ ] Typography (font family, sizes, weights, line heights)
- [ ] Spacing scale (4px, 8px, 16px, 24px, 32px)
- [ ] Border radius (buttons, cards, inputs)
- [ ] Shadows (elevation levels)
- [ ] Icons (check if custom or standard Material/Cupertino)

### Step 2: Create Component Library
- [ ] Base widgets (CustomButton, CustomCard, CustomInput)
- [ ] Charging-specific widgets (StationCard, ChargerConnector, BatteryIndicator)
- [ ] Layout widgets (SectionHeader, EmptyState, LoadingState)

### Step 3: Screen-by-Screen Migration
- [ ] Create new screen versions alongside old ones
- [ ] Test functionality preservation
- [ ] Gradually replace routes
- [ ] Remove old screens after verification

### Step 4: Polish & Testing
- [ ] Animations and transitions
- [ ] Dark mode (if in Figma)
- [ ] Responsive layouts (mobile, tablet)
- [ ] Accessibility (contrast, font sizes)

## Next Steps

**Please provide:**
1. Screenshots of key Figma screens (Home, Charger List, Charger Detail, Charging Session)
2. Color values from Figma (or I'll extract from screenshots)
3. Font family name used in design
4. Any specific animations or interactions to implement

**Or I can proceed with:**
- Modern EV charging app best practices
- Clean, minimalist design with green/blue accents
- Material Design 3 principles adapted for EV context
