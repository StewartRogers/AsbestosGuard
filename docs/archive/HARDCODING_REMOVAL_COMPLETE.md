# No More Hardcoded Defaults - Configuration Enforcement

## Summary
All hardcoded agent ID defaults have been removed. The application now **requires explicit configuration** in `.env.local` for all agents and endpoints.

## Files Updated

### 1. **agent-bridge-service.py**
**Change:** Removed fallback defaults and added validation
```python
# BEFORE
AGENT_1_ID = os.getenv('FOUNDRY_AGENT_1_ID', 'EFSAGENT')
AGENT_2_ID = os.getenv('FOUNDRY_AGENT_2_ID', 'APPRISKANALYSIS')
AGENT_3_ID = os.getenv('FOUNDRY_AGENT_3_ID', 'EMPWEBPROFILEAGENT')

# AFTER
AGENT_1_ID = os.getenv('FOUNDRY_AGENT_1_ID')  # No default
AGENT_2_ID = os.getenv('FOUNDRY_AGENT_2_ID')  # No default
AGENT_3_ID = os.getenv('FOUNDRY_AGENT_3_ID')  # No default

# With validation that raises error if missing
if not AGENT_1_ID:
    raise ValueError('❌ FOUNDRY_AGENT_1_ID must be set in .env.local')
```

**Startup Behavior:**
- ✅ If `.env.local` is complete, bridge service starts normally
- ❌ If any agent ID is missing, raises clear error with required variable name

---

### 2. **test-real-agent.ts**
**Change:** Removed fallback, added validation
```typescript
// BEFORE
const agentId = process.env.FOUNDRY_AGENT_1_ID || 'EFSAGENT';

// AFTER
const agentId = process.env.FOUNDRY_AGENT_1_ID;

if (!agentId) {
  console.error('❌ ERROR: FOUNDRY_AGENT_1_ID must be set in .env.local');
  console.error('   Example: FOUNDRY_AGENT_1_ID=EFSAGENT');
  process.exit(1);
}
```

---

### 3. **test-sdk-direct.py**
**Change:** Removed fallback, added validation
```python
# BEFORE
agent_id = os.getenv('FOUNDRY_AGENT_1_ID', 'EFSAGENT')

# AFTER
agent_id = os.getenv('FOUNDRY_AGENT_1_ID')

if not agent_id:
    print(f"❌ ERROR: FOUNDRY_AGENT_1_ID must be set in .env.local")
    exit(1)
```

---

### 4. **tools/get-agent-id.ts**
**Change:** Removed fallback, requires explicit argument
```typescript
// BEFORE
const agentName = process.argv[2] || 'EFSAGENT';

// AFTER
const agentName = process.argv[2];

if (!agentName) {
  console.error('❌ ERROR: Agent name must be provided as argument');
  console.error('   Usage: npx tsx tools/get-agent-id.ts <agent-name>');
  console.error('   Example: npx tsx tools/get-agent-id.ts EFSAGENT');
  process.exit(1);
}
```

**Usage:**
```bash
# Before: could run without argument (defaulted to EFSAGENT)
npx tsx tools/get-agent-id.ts

# After: requires agent name argument
npx tsx tools/get-agent-id.ts EFSAGENT
npx tsx tools/get-agent-id.ts APPRISKANALYSIS
npx tsx tools/get-agent-id.ts EMPWEBPROFILEAGENT
```

---

### 5. **node-bridge-service.ts**
**Change:** Removed fallback defaults, added validation
```typescript
// BEFORE
const AGENT_1 = process.env.FOUNDRY_AGENT_1_ID || 'EFSAGENT';
const AGENT_2 = process.env.FOUNDRY_AGENT_2_ID || 'APPRISKANALYSIS';
const AGENT_3 = process.env.FOUNDRY_AGENT_3_ID || 'EMPWEBPROFILEAGENT';

// AFTER
const AGENT_1 = process.env.FOUNDRY_AGENT_1_ID;
const AGENT_2 = process.env.FOUNDRY_AGENT_2_ID;
const AGENT_3 = process.env.FOUNDRY_AGENT_3_ID;

if (!AGENT_1) throw new Error('❌ FOUNDRY_AGENT_1_ID must be set in .env.local');
if (!AGENT_2) throw new Error('❌ FOUNDRY_AGENT_2_ID must be set in .env.local');
if (!AGENT_3) throw new Error('❌ FOUNDRY_AGENT_3_ID must be set in .env.local');
```

---

### 6. **tools/test-foundry-agent.ts**
**Change:** Removed defaults, requires explicit arguments
```typescript
// BEFORE
const agentKey = (process.argv[2] as 'agent1' | 'agent2' | 'agent3') || 'agent1';
const prompt = process.argv.slice(3).join(' ') || 'Say hello from Foundry agent.';

// AFTER
const agentKey = process.argv[2] as 'agent1' | 'agent2' | 'agent3';
const prompt = process.argv.slice(3).join(' ');

if (!agentKey) {
  console.error('❌ ERROR: Agent key must be provided as argument');
  console.error('   Usage: npx tsx tools/test-foundry-agent.ts <agent-key> <prompt>');
  process.exit(1);
}

if (!prompt) {
  console.error('❌ ERROR: Prompt must be provided as argument');
  process.exit(1);
}
```

**Usage:**
```bash
# Before: could run without args (used defaults)
npm run test:foundry

# After: requires arguments
npx tsx tools/test-foundry-agent.ts agent1 "Hello"
npx tsx tools/test-foundry-agent.ts agent2 "Analyze this"
```

---

## Required .env.local Configuration

All of these must now be explicitly set in `.env.local`:

```env
AZURE_AI_FOUNDRY_PROJECT_ENDPOINT=https://your-foundry-endpoint.services.ai.azure.com/api/projects/...
FOUNDRY_AGENT_1_ID=EFSAGENT
FOUNDRY_AGENT_2_ID=APPRISKANALYSIS
FOUNDRY_AGENT_3_ID=EMPWEBPROFILEAGENT
AGENT_BRIDGE_SERVICE_URL=http://127.0.0.1:8001
```

---

## Error Messages You'll See If Configuration is Missing

### Missing agent in agent-bridge-service.py
```
ValueError: ❌ FOUNDRY_AGENT_1_ID must be set in .env.local
```

### Missing agent in test-real-agent.ts
```
❌ ERROR: FOUNDRY_AGENT_1_ID must be set in .env.local
   Example: FOUNDRY_AGENT_1_ID=EFSAGENT
```

### Missing argument in tools/test-foundry-agent.ts
```
❌ ERROR: Agent key must be provided as argument
   Usage: npx tsx tools/test-foundry-agent.ts <agent-key> <prompt>
   Example: npx tsx tools/test-foundry-agent.ts agent1 "Hello"
```

---

## Benefits

✅ **No Hidden Defaults** - Configuration is always explicit
✅ **Clear Errors** - If something is missing, you know immediately what's wrong
✅ **No Surprises** - Can't accidentally use a fallback agent
✅ **Better for Team** - Everyone has same .env.local; no magic fallbacks
✅ **Easy to Debug** - Always clear which agents are configured

---

## Breaking Changes

| Before | After | Required Action |
|--------|-------|-----------------|
| No env vars = defaults to EFSAGENT | No env vars = error | Set FOUNDRY_AGENT_1_ID in .env.local |
| `npm run test:foundry` | Requires arguments | Use `npx tsx tools/test-foundry-agent.ts agent1 "prompt"` |
| `npx tsx tools/get-agent-id.ts` | Requires agent name | Use `npx tsx tools/get-agent-id.ts EFSAGENT` |

---

## Verification

To verify all configuration is correct:

```bash
# Check your .env.local has all required variables
cat .env.local | grep FOUNDRY_AGENT

# Start bridge service (will fail with clear error if config missing)
npm run agent-bridge

# Test an agent (requires explicit agent and prompt)
npm run test:real-agent
```

If anything is missing, you'll get a clear error message showing exactly what needs to be set.

