# Parallel AI Agents Refactor

## Overview
Refactored the AI analysis system from **sequential execution** to **parallel agent execution** for improved performance and reliability.

## Architecture Changes

### Before (Sequential)
```
Task 1 (Fact Sheet) → Task 2 (Policy) → Task 3 (Web Search)
```
- Tasks ran one after another
- If Task 1 failed, Tasks 2 & 3 were skipped
- If Task 2 failed, Task 3 was skipped
- Total time: Sum of all three tasks (~3x longer)

### After (Parallel)
```
Agent 1 (Fact Sheet) ┐
Agent 2 (Policy)      ├→ Merge Results
Agent 3 (Web Search) ┘
```
- All three agents run concurrently using `Promise.all()`
- Each agent can succeed or fail independently
- Partial results are merged gracefully
- Total time: Max of the three tasks (~66% faster)

## Three Independent Agents

### **Agent 1: Fact Sheet Validator**
**Purpose**: Validates application against internal employer records

**Responsibilities**:
- Check if company exists in internal database
- Verify account numbers and financial compliance
- Detect overdue balances (>$500 = HIGH RISK)
- Compare application data with fact sheet records

**Output**:
```typescript
{
  internalRecordValidation: {
    recordFound: boolean,
    accountNumber: string | null,
    overdueBalance: number | null,
    statusMatch: boolean | null,
    concerns: string[]
  },
  riskScore: "LOW" | "MEDIUM" | "HIGH",
  recommendation: "APPROVE" | "REJECT" | "REQUEST_INFO"
}
```

### **Agent 2: Policy Compliance Analyzer**
**Purpose**: Checks compliance with WorkSafeBC policies and certification requirements

**Responsibilities**:
- Identify policy violations with specific citations
- Calculate worker certification ratios
- Verify 100% certification requirement is met
- Cross-reference application against policy documents

**Output**:
```typescript
{
  policyViolations: Array<{
    field: string,
    value: string,
    policy: string | null,
    clause: string | null,
    recommendation: string | null
  }>,
  certificationAnalysis: {
    totalWorkers: number | null,
    certifiedWorkers: number | null,
    complianceRatio: number | null,
    meetsRequirement: boolean | null
  },
  recommendation: "APPROVE" | "REJECT" | "REQUEST_INFO"
}
```

### **Agent 3: Web Presence Investigator**
**Purpose**: Validates company legitimacy through public web search

**Responsibilities**:
- Search for company existence in British Columbia
- Verify relevant industry (asbestos/construction/demolition)
- Check for safety violations or negative reviews
- Validate geographic location claims
- Collect web sources as evidence

**Output**:
```typescript
{
  webPresenceValidation: {
    companyFound: boolean,
    relevantIndustry: boolean,
    searchSummary: string
  },
  geographicValidation: {
    addressExistsInBC: boolean,
    addressConflicts: string[],
    verifiedLocation: string | null
  },
  sources: Array<{ title: string, uri: string }>
}
```

## Key Improvements

### 1. **Performance**
- **~66% faster execution** time (parallel vs sequential)
- Maximum time = slowest agent (not sum of all agents)
- Better resource utilization

### 2. **Reliability**
- **Graceful degradation**: If one agent fails, others still provide data
- No cascading failures
- Partial results are better than no results

### 3. **Error Handling**
- Each agent has independent error handling
- Failed agents log debug files separately
- Clear status reporting for each agent
- Merged concerns from all successful agents

### 4. **Risk Scoring**
- Uses **highest risk** from any successful agent
- Defaults to MEDIUM if all agents fail
- More conservative and safer approach

### 5. **Debugging**
- Per-agent debug information in `perStepDebug`
- Execution duration tracking for each agent
- Total duration = max(agent durations)
- Clear success/failure status for each agent

## Result Merging Strategy

The system intelligently merges results from all three agents:

1. **Internal Record Validation**: From Agent 1 (Fact Sheet)
2. **Policy Violations**: From Agent 2 (Policy)
3. **Certification Analysis**: From Agent 2 (Policy)
4. **Web Presence**: From Agent 3 (Web Search)
5. **Geographic Validation**: From Agent 3 (Web Search)
6. **Sources**: Merged from all agents
7. **Concerns**: Merged from all agents
8. **Risk Score**: Highest risk from any agent
9. **Recommendation**: Priority: Policy > Fact Sheet > Default

## Failure Handling

### All Agents Succeed
```
✓ Agent 1: Fact Sheet
✓ Agent 2: Policy
✓ Agent 3: Web Search
→ Full analysis with comprehensive data
```

### Partial Success
```
✓ Agent 1: Fact Sheet
✗ Agent 2: Policy (failed)
✓ Agent 3: Web Search
→ Partial analysis with fact sheet + web data
→ Warning added to concerns about policy failure
→ Risk score adjusted to MEDIUM (conservative)
```

### All Agents Fail
```
✗ Agent 1: Fact Sheet
✗ Agent 2: Policy
✗ Agent 3: Web Search
→ Fallback analysis with MANUAL_REVIEW_REQUIRED
→ Debug files logged for all three agents
→ Risk score: MEDIUM (conservative approach)
```

## Debug Output

Each agent logs separately on failure:
- `tmp/ai-failures/agent1-fact-raw-{timestamp}.txt`
- `tmp/ai-failures/agent1-fact-response-{timestamp}.json`
- `tmp/ai-failures/agent2-policy-raw-{timestamp}.txt`
- `tmp/ai-failures/agent2-policy-response-{timestamp}.json`
- `tmp/ai-failures/agent3-web-raw-{timestamp}.txt`
- `tmp/ai-failures/agent3-web-response-{timestamp}.json`

## Testing Recommendations

1. **Test all agents succeed**: Normal application flow
2. **Test Agent 1 fails**: Ensure policy and web still work
3. **Test Agent 2 fails**: Ensure fact sheet and web still work
4. **Test Agent 3 fails**: Ensure fact sheet and policy still work
5. **Test all agents fail**: Verify graceful fallback
6. **Test performance**: Compare execution time (should be ~66% faster)

## Migration Notes

- No changes to API interfaces or return types
- Backward compatible with existing code
- Debug output format enhanced but not breaking
- No database schema changes required
- Environment variables unchanged

## Future Enhancements

Potential improvements for the future:
1. Add timeout controls per agent
2. Implement retry logic for failed agents
3. Add agent-specific caching
4. Create agent priority/weighting system
5. Add circuit breaker pattern for failing agents
6. Implement agent result confidence scoring
