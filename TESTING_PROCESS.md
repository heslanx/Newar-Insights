# Testing Process - Newar Insights

**CRITICAL RULE**: NEVER claim something is functional without following this complete testing process.

## Testing Philosophy

1. **Test BEFORE claiming it works**
2. **Test ALL scenarios (success + error cases)**
3. **Test with REAL data/requests**
4. **Document ALL test results**
5. **Fix ALL issues before declaring complete**

---

## Frontend Testing Checklist

### Phase 1: Build & Startup Tests

- [ ] **Build succeeds without errors**
  ```bash
  cd frontend && npm run build
  # Expected: ✓ Compiled successfully
  ```

- [ ] **Dev server starts successfully**
  ```bash
  npm run dev
  # Expected: ✓ Ready in Xs on http://localhost:3000
  ```

- [ ] **No console errors in terminal**
  - Check for PostCSS errors
  - Check for TypeScript errors
  - Check for module resolution errors

### Phase 2: Page Load Tests

- [ ] **Homepage loads in browser**
  - Open http://localhost:3000
  - Expected: See "Newar Insights" dashboard
  - No blank screen
  - No infinite loading

- [ ] **Browser console has no errors**
  - Open DevTools (F12)
  - Check Console tab
  - No red errors

- [ ] **Network requests work**
  - Open DevTools Network tab
  - Check API calls to localhost:8081/health
  - Check API calls to localhost:8080/health
  - Expected: 200 OK responses

### Phase 3: UI Component Tests

- [ ] **Health status cards display correctly**
  - "Total de Usuários" shows number
  - "Gravações Ativas" shows number
  - "Status do Sistema" shows Online/Offline with green/red dot

- [ ] **Create user form renders**
  - Email input visible
  - Name input visible
  - Max Bots input visible
  - "Criar Usuário" button visible

- [ ] **Users table renders**
  - Table headers visible (ID, Nome, Email, Max Bots, Criado em, Ações)
  - Existing users displayed (if any)
  - "Gerar Token" and "Deletar" buttons visible

### Phase 4: Functional Tests

#### Test 4.1: Create User
- [ ] Fill form with test data:
  - Email: test@newar.com
  - Name: Test User
  - Max Bots: 5
- [ ] Click "Criar Usuário"
- [ ] Expected: Success alert appears
- [ ] Expected: User appears in table
- [ ] Expected: Form is cleared

#### Test 4.2: Generate Token
- [ ] Click "Gerar Token" for a user
- [ ] Expected: Alert with token message
- [ ] Expected: Green box appears with token
- [ ] Expected: Token string is visible (starts with "vxa_")
- [ ] Click "Copiar" button
- [ ] Expected: "Token copiado!" alert
- [ ] Paste somewhere to verify it copied correctly

#### Test 4.3: Delete User
- [ ] Create a test user first
- [ ] Click "Deletar" button
- [ ] Expected: Confirmation dialog appears
- [ ] Click "OK"
- [ ] Expected: Success alert
- [ ] Expected: User removed from table

#### Test 4.4: Auto-refresh
- [ ] Leave page open for 5+ seconds
- [ ] Make change via API (create user via curl)
- [ ] Expected: Dashboard auto-updates within 5 seconds

### Phase 5: Error Handling Tests

#### Test 5.1: Backend offline
- [ ] Stop backend services: `docker-compose down`
- [ ] Refresh frontend page
- [ ] Expected: "Status do Sistema" shows "Offline" with red dot
- [ ] Expected: Error message in console (acceptable)
- [ ] Expected: Page doesn't crash

#### Test 5.2: Invalid form data
- [ ] Try creating user with invalid email (e.g., "notanemail")
- [ ] Expected: Browser validation prevents submission
- [ ] Try creating user with Max Bots = 0
- [ ] Expected: Browser validation prevents submission

#### Test 5.3: Duplicate user
- [ ] Create user with email: test@newar.com
- [ ] Try creating another user with same email
- [ ] Expected: Error alert with message

### Phase 6: Styling Tests

- [ ] **Responsive design works**
  - Resize browser window to mobile size (< 768px)
  - Expected: Layout adapts (form stacks vertically, table scrolls)

- [ ] **Hover states work**
  - Hover over buttons
  - Expected: Color changes (blue -> darker blue, green -> darker green)

- [ ] **Tailwind classes render correctly**
  - Check background colors are applied
  - Check text colors are applied
  - Check spacing/padding looks correct

---

## Backend API Testing Checklist

### Phase 1: Service Health

- [ ] **All services running**
  ```bash
  docker-compose ps
  # Expected: All containers show "Up" status
  ```

- [ ] **Admin API health**
  ```bash
  curl http://localhost:8081/health
  # Expected: {"status":"healthy","timestamp":"..."}
  ```

- [ ] **API Gateway health**
  ```bash
  curl http://localhost:8080/health
  # Expected: {"status":"healthy","timestamp":"..."}
  ```

- [ ] **Bot Manager health**
  ```bash
  curl http://localhost:8082/health
  # Expected: {"status":"healthy","timestamp":"..."}
  ```

### Phase 2: Admin API Tests

#### Test 2.1: Create User
```bash
curl -X POST http://localhost:8081/admin/users \
  -H "Content-Type: application/json" \
  -H "X-Admin-API-Key: admin_dev_secret_key_123" \
  -d '{"email":"test@example.com","name":"Test User","max_concurrent_bots":10}'
```
- [ ] Expected: 201 Created
- [ ] Expected: JSON response with user ID

#### Test 2.2: List Users
```bash
curl http://localhost:8081/admin/users?limit=10 \
  -H "X-Admin-API-Key: admin_dev_secret_key_123"
```
- [ ] Expected: 200 OK
- [ ] Expected: JSON with "users" array

#### Test 2.3: Generate Token
```bash
curl -X POST http://localhost:8081/admin/users/1/tokens \
  -H "X-Admin-API-Key: admin_dev_secret_key_123"
```
- [ ] Expected: 201 Created
- [ ] Expected: JSON with "token" field (starts with "vxa_")

#### Test 2.4: Delete User
```bash
curl -X DELETE http://localhost:8081/admin/users/1 \
  -H "X-Admin-API-Key: admin_dev_secret_key_123"
```
- [ ] Expected: 200 OK

### Phase 3: Recording API Tests

#### Test 3.1: Request Recording (Valid Token)
```bash
curl -X POST http://localhost:8080/recordings \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <generated_token>" \
  -d '{"platform":"google_meet","meeting_id":"abc-defg-hij","bot_name":"Test Bot"}'
```
- [ ] Expected: 201 Created
- [ ] Expected: JSON with meeting details

#### Test 3.2: Request Recording (Invalid Token)
```bash
curl -X POST http://localhost:8080/recordings \
  -H "Content-Type: application/json" \
  -H "X-API-Key: invalid_token_123" \
  -d '{"platform":"google_meet","meeting_id":"abc-defg-hij"}'
```
- [ ] Expected: 401 Unauthorized
- [ ] Expected: Error message

#### Test 3.3: Get Recording Status
```bash
curl http://localhost:8080/recordings/google_meet/abc-defg-hij \
  -H "X-API-Key: <generated_token>"
```
- [ ] Expected: 200 OK
- [ ] Expected: JSON with status field

#### Test 3.4: Stop Recording
```bash
curl -X DELETE http://localhost:8080/recordings/google_meet/abc-defg-hij \
  -H "X-API-Key: <generated_token>"
```
- [ ] Expected: 200 OK

---

## Bot Testing Checklist

### Phase 1: Bot Spawning

- [ ] **Bot container spawns**
  ```bash
  # After requesting recording
  docker ps | grep newar-bot
  # Expected: Container appears
  ```

- [ ] **Bot logs show progress**
  ```bash
  docker logs <container_id> --tail=50 -f
  # Expected: See initialization logs
  ```

### Phase 2: Meeting Join

- [ ] **Bot navigates to meeting URL**
  - Check logs for "Navigating to Google Meet"
  - Expected: No navigation errors

- [ ] **Bot fills name field**
  - Check logs for "Filling name field"
  - Expected: Success message

- [ ] **Bot requests admission**
  - Check logs for "Clicking Ask to join"
  - Expected: Admission requested

- [ ] **Bot is admitted (MANUAL)**
  - **REQUIRED**: Human manually admits bot in meeting
  - Check logs for "Bot was admitted"
  - Expected: Status changes to "active"

### Phase 3: Recording

- [ ] **MediaRecorder initialized**
  - Check logs for "MediaRecorder initialized"
  - Expected: No errors

- [ ] **Chunks recorded**
  - Wait 30+ seconds
  - Check logs for "Chunk uploaded"
  - Expected: Multiple chunks (at least 3)

- [ ] **Storage path correct**
  - Check storage/recordings/temp/<meeting_id>/
  - Expected: chunk_00000.webm, chunk_00001.webm, etc.

### Phase 4: Finalization

- [ ] **Recording stops gracefully**
  - Send DELETE request or wait for meeting end
  - Check logs for "Recording stopped"
  - Expected: No errors

- [ ] **Chunks concatenated**
  - Check bot-manager logs
  - Expected: "Concatenating chunks" message
  - Check storage/recordings/final/user_<id>/
  - Expected: final file exists

- [ ] **Final file is valid**
  ```bash
  ffmpeg -i storage/recordings/final/user_1/<meeting_id>.webm
  # Expected: Shows duration, codec info, no errors
  ```

---

## Integration Testing Checklist

### Test 1: Complete End-to-End Flow

1. [ ] Start all services: `make start`
2. [ ] Verify health: `make health`
3. [ ] Create user: `make init`
4. [ ] Generate token: `make token`
5. [ ] Copy token from response
6. [ ] Request recording with real Google Meet link
7. [ ] Wait for bot to spawn
8. [ ] Manually admit bot in meeting
9. [ ] Wait 30 seconds for chunks
10. [ ] Stop recording
11. [ ] Verify final file exists
12. [ ] Download file via API
13. [ ] Play file to verify audio (if captured)

### Test 2: Multiple Concurrent Bots

1. [ ] Request 3 recordings simultaneously
2. [ ] Expected: All 3 bots spawn
3. [ ] Expected: No conflicts
4. [ ] Expected: All recordings complete independently

### Test 3: Error Recovery

1. [ ] Request recording with invalid meeting ID
2. [ ] Expected: Bot fails gracefully
3. [ ] Expected: Meeting status = "failed"
4. [ ] Expected: Error message logged

### Test 4: Rate Limiting

1. [ ] Send 15 requests in 1 minute
2. [ ] Expected: First 10 succeed
3. [ ] Expected: Next 5 return 429 Too Many Requests

---

## Documentation Testing Checklist

- [ ] **README.md is accurate**
  - All commands work as documented
  - Setup steps are complete
  - No outdated information

- [ ] **API examples work**
  - All curl examples are copy-pasteable
  - All examples return expected results

- [ ] **Environment variables documented**
  - .env.example has all variables
  - Each variable has description

---

## Test Results Documentation

After running ALL tests, document results here:

### Test Date: [DATE]
### Tested By: [NAME]
### Version: [GIT COMMIT HASH]

#### Frontend Tests
- Build: ✅/❌
- Page Load: ✅/❌
- Create User: ✅/❌
- Generate Token: ✅/❌
- Delete User: ✅/❌
- Error Handling: ✅/❌

#### Backend Tests
- Health Checks: ✅/❌
- Admin API: ✅/❌
- Recording API: ✅/❌
- Bot Spawning: ✅/❌

#### Integration Tests
- End-to-End: ✅/❌
- Concurrent Bots: ✅/❌
- Error Recovery: ✅/❌

#### Issues Found:
1. [Issue description]
2. [Issue description]

#### All Tests Passed?: ✅ YES / ❌ NO

---

## MANDATORY RULE

**BEFORE saying "it's functional" or "it's working":**
1. ✅ Complete ALL applicable tests from this checklist
2. ✅ Document results in "Test Results Documentation" section
3. ✅ Fix ALL issues found
4. ✅ Re-run failed tests
5. ✅ Only then claim it works

**NO EXCEPTIONS.**
