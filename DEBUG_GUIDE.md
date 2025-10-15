# CRM Debug Guide

## Issue: Frontend requests not reaching backend

### Current Status:
- ✅ Backend running on http://127.0.0.1:8000
- ✅ Frontend running on http://localhost:5173
- ✅ CORS configured correctly
- ❌ Requests not showing in backend logs

### Debugging Steps:

## 1. Check Browser Console
Open browser DevTools (F12) and check:
- Console tab for JavaScript errors
- Network tab to see if requests are being sent
- Look for CORS errors or failed requests

## 2. Verify API URL
In browser console, run:
```javascript
console.log(import.meta.env.VITE_API_URL);
```
Should show: `http://localhost:8000`

## 3. Test API Connection
In browser console, run:
```javascript
fetch('http://localhost:8000/health')
  .then(r => r.json())
  .then(d => console.log('API Response:', d))
  .catch(e => console.error('API Error:', e));
```

## 4. Check if logged in
In browser console, run:
```javascript
console.log('Token:', localStorage.getItem('access_token'));
```

If null, you need to login first!

## 5. Test authenticated endpoint
```javascript
const token = localStorage.getItem('access_token');
fetch('http://localhost:8000/api/deals', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
  .then(r => r.json())
  .then(d => console.log('Deals:', d))
  .catch(e => console.error('Error:', e));
```

## Common Issues:

### Issue 1: Not Authenticated
**Symptom:** "Not authenticated" error
**Solution:** Login first at http://localhost:5173/login
- Email: admin@company.com
- Password: admin123

### Issue 2: Wrong API URL
**Symptom:** Network error, CORS error
**Solution:** 
1. Check `.env` file has `VITE_API_URL=http://localhost:8000`
2. Restart frontend dev server: `npm run dev`

### Issue 3: Backend not running
**Symptom:** Connection refused
**Solution:** Start backend:
```bash
cd backend
uvicorn main:app --reload
```

### Issue 4: CORS Error
**Symptom:** "CORS policy" error in console
**Solution:** Backend CORS is configured for:
- http://localhost:5173
- http://127.0.0.1:5173

Make sure you're accessing via one of these URLs.

## Quick Test Commands:

### Test Backend Health:
```bash
curl http://localhost:8000/health
```

### Test Login:
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"admin123"}'
```

### Test Deals (with token):
```bash
curl http://localhost:8000/api/deals \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Expected Backend Logs:

When frontend makes requests, you should see:
```
INFO:     127.0.0.1:XXXXX - "OPTIONS /api/deals HTTP/1.1" 200 OK
INFO:     127.0.0.1:XXXXX - "GET /api/deals HTTP/1.1" 200 OK
```

If you don't see these logs, the requests aren't reaching the backend.

## Solution Checklist:

- [ ] Backend running on port 8000
- [ ] Frontend running on port 5173
- [ ] Logged in (have access_token in localStorage)
- [ ] .env file exists with VITE_API_URL
- [ ] Frontend dev server restarted after .env changes
- [ ] Browser console shows no errors
- [ ] Network tab shows requests being sent
