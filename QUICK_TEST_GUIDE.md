# Phase 2 Integration Testing Guide

## 🚀 Quick Start

**Backend:** http://localhost:3000/api ✅ RUNNING
**Flutter App:** http://localhost:8082 🚀 LAUNCHING

---

## ✅ What to Test

### 1. **Favorites** (Priority: HIGH)
1. Login to app
2. Go to Chargers list/map
3. Tap ❤️ icon on any charger
4. Go to Favorites screen (bottom nav)
5. Verify charger appears
6. Tap ❤️ again to unfavorite
7. Verify removed from Favorites

**Test:**
- Add/remove multiple chargers
- Check persistence after reload
- Verify heart icon state

---

### 2. **Reviews & Ratings** (Priority: HIGH)
1. Open any charger details
2. Navigate to Reviews tab
3. View rating summary (stars + distribution)
4. Scroll through existing reviews
5. Tap "Write Review"
6. Select 1-5 stars
7. Enter comment
8. Upload photo (optional)
9. Submit review
10. Verify appears in list

**Test:**
- Edit your review
- Delete your review
- Mark other reviews helpful
- Check one review per charger limit

---

### 3. **Transaction History** (Priority: MEDIUM)
1. Go to Settings/Profile
2. Tap "Transaction History"
3. View past charging sessions
4. Check pagination (load more)
5. Tap transaction for details

**Test:**
- List displays correctly
- Details show session info
- Meter values accurate

---

### 4. **Chat Support** (Priority: MEDIUM)
1. Look for floating chat button (bottom-right)
2. Tap to open
3. View conversations
4. Send a message
5. Check unread badge

---

### 5. **Vehicle Management** (Priority: LOW)
1. Settings → My Vehicles
2. Add new vehicle
3. Fill form (make, model, battery, etc.)
4. Mark as primary
5. Save
6. Edit vehicle
7. Delete vehicle

---

## 🐛 Quick Troubleshooting

**Connection Error?**
→ Check backend is running: `curl http://localhost:3000/api`

**401 Unauthorized?**
→ Logout and login again

**500 Error?**
→ Check backend terminal logs

**No data showing?**
→ Create some test data first

---

## 📝 Test Credentials

**Email:** kasun@gmail.com
**Password:** Kasun123!

---

## ✨ Success Checklist

- [ ] Can add/remove favorites
- [ ] Can create reviews
- [ ] Can view rating summary  
- [ ] Can see transaction history
- [ ] Can chat (if messages exist)
- [ ] Can manage vehicles

**Ready to test? Open the browser and start! 🎉**
