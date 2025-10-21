# AI Training System - Clarifications & Decisions

**Date:** October 21, 2025
**Time:** 1:25 PM EST

---

## User Decisions

### 1. Admin Review Approach ✅
**Decision:** Admin reviews proposals whenever they want (not all, not on schedule)

**Implications:**
- Proposals have status: `pending_review`, `reviewed`, `sent_without_review`
- Unedited proposals ≠ good proposals (might be average/below average)
- System should highlight which proposals need review
- Priority queue: show worst-performing ones first for review

**Implementation:**
```sql
ALTER TABLE proposals ADD COLUMN review_status TEXT DEFAULT 'pending_review';
-- Values: 'pending_review', 'reviewed', 'sent_without_review'

ALTER TABLE proposals ADD COLUMN needs_attention BOOLEAN DEFAULT false;
-- Flag proposals that might need review (low confidence, unusual job, etc.)
```

---

### 2. Learning Input ✅
**Decision:** AI learns from BOTH edits AND explicit feedback

**How it works:**
1. **Edits** (automatic learning):
   - System compares original vs edited text
   - Identifies what changed
   - Extracts diff patterns
   - Example: "AI said 'Hi there', admin changed to 'Hi [Name]'" → Learn to personalize greetings

2. **Feedback** (explicit learning):
   - Admin explains WHY they made changes
   - Provides context that AI can't infer from diffs alone
   - Example: "Changed because client mentioned tight deadline, so emphasized fast turnaround"

**Benefits of both:**
- Edits show WHAT to change
- Feedback shows WHY to change it
- Combined = deeper learning

---

### 3. Prompt Management ✅
**Decision:** Admin can do BOTH:
- Direct prompt editing (manual control)
- Feedback-driven improvements (automatic)

**Workflow:**

**Option A: Direct Editing**
```
Admin → Views current prompt → Edits directly → Saves as new version
Use when: Admin has specific improvement in mind
```

**Option B: Feedback-Driven**
```
Admin → Reviews proposals → Provides feedback → System suggests prompt improvements → Admin approves → New version created
Use when: Letting patterns emerge from data
```

**Interface:**
```
┌─────────────────────────────────────────────────┐
│ Prompt Management                               │
├─────────────────────────────────────────────────┤
│                                                  │
│ Current Active: v1.2 (28% win rate)             │
│                                                  │
│ [Edit Prompt Manually] [View AI Suggestions]    │
│                                                  │
│ AI Suggestions based on recent feedback:        │
│ ┌───────────────────────────────────────────┐  │
│ │ 1. Add instruction: "Always personalize   │  │
│ │    greeting with client name if available"│  │
│ │    Reason: 15 reviews mentioned this      │  │
│ │    [Apply] [Dismiss]                       │  │
│ │                                            │  │
│ │ 2. Emphasize: "Reference specific project │  │
│ │    requirements from job description"      │  │
│ │    Reason: High-rated proposals do this   │  │
│ │    [Apply] [Dismiss]                       │  │
│ └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

---

### 4. Pattern Approval - EXPLANATION ⚠️

**What is Pattern Approval?**

When AI generates a winning proposal, the system automatically identifies patterns:

**Example Pattern Extraction:**
```
Winning Proposal Opening: "Hi Sarah, I noticed your focus on improving user engagement by 40% - that's an ambitious and exciting goal!"

System identifies pattern:
- Type: "personalized_opening"
- Pattern: "Greet by name + acknowledge specific metric + express enthusiasm"
- Success rate: 85% (won 6 out of 7 proposals using this)
```

**The Question:**
Should the system automatically start using this pattern in future proposals, OR should admin approve it first?

**Option A: Auto-Apply (No Approval Needed)**
✅ Pros: Faster learning, AI improves immediately
❌ Cons: Might apply pattern incorrectly, less control

**Option B: Require Approval**
✅ Pros: Admin controls what patterns are used, quality gate
❌ Cons: Slower learning, admin overhead

**User's Answer Needed:**
- Auto-apply and admin can disable bad patterns later?
- OR admin must approve each pattern before AI uses it?

**Recommendation:** Start with approval required (safe), then move to auto-apply as trust builds

---

### 5. Training Examples - COST IMPLICATIONS 💰

**What are Training Examples?**
Including successful past proposals in the AI prompt to guide current generation.

**Example:**
```
Here are 3 examples of successful proposals for similar jobs:

Example 1: [Previous winning proposal - 500 tokens]
Example 2: [Previous winning proposal - 500 tokens]
Example 3: [Previous winning proposal - 500 tokens]

Now create a proposal for this new job: [Current job - 300 tokens]
```

**Cost Analysis:**

Using Groq (current):
- **Cost:** FREE (within limits)
- **Limit:** ~30 requests/minute
- **Token limit:** ~8000 tokens per request
- **Implications:** Include 3-5 examples = ~1500-2500 tokens. Still free, but might hit rate limits with many proposals.

If switching to paid model (e.g., OpenAI GPT-4):
- **Cost:** ~$0.01 per 1000 input tokens
- **No examples:** ~500 tokens = $0.005 per proposal
- **With 5 examples:** ~3000 tokens = $0.03 per proposal (6x more expensive)

**Cost per Month Scenarios:**

| Proposals/Month | No Examples | 3 Examples | 5 Examples |
|-----------------|-------------|------------|------------|
| 50              | $0.25       | $1.00      | $1.50      |
| 100             | $0.50       | $2.00      | $3.00      |
| 500             | $2.50       | $10.00     | $15.00     |

**With Groq (Free tier):**
- No cost impact
- But might need rate limiting (spread requests over time)

**Recommendation:**
- Start with 3 examples (good balance)
- Use Groq to keep it free
- If moving to paid API, 3-5 examples is still very cheap (<$15/month even at 500 proposals)

**Quality vs Cost Trade-off:**
- **0 examples:** Cheaper, but generic proposals
- **1-2 examples:** Slight improvement, minimal cost
- **3-5 examples:** Significant improvement, still affordable
- **10+ examples:** Diminishing returns, higher cost

**Decision Needed:** How many examples to include? (Recommend: 3)

---

### 6. Confidence Threshold ✅
**Decision:** NO - Low confidence proposals don't need admin review before sending

**Implications:**
- Employees can send any proposal AI generates
- Admin reviews proposals AFTER they're sent (or whenever)
- Focus on improving AI through feedback loop, not gatekeeping

**Benefits:**
- Faster workflow for employees
- More data (all proposals sent = more feedback)
- Admin focuses on training, not approving

---

## Updated System Design Based on Decisions

### Proposal Status Flow
```
1. Employee submits job post
   ↓
2. AI generates proposal (status: 'draft')
   ↓
3. Employee reviews & sends (status: 'sent', review_status: 'pending_review')
   ↓
4. Admin reviews when convenient:
   - Edits text
   - Provides ratings & feedback
   - Status: 'reviewed'
   ↓
5. Track outcome (won/lost)
   ↓
6. System learns from edits + feedback + outcome
```

### Admin Training Workflow
```
┌─────────────────────────────────────────────────┐
│ Proposals Needing Review (23)                   │
├─────────────────────────────────────────────────┤
│ Sort by: [Sent Date ▼] [Confidence] [Employee] │
│                                                  │
│ 🔴 High Priority (4)                            │
│ ┌───────────────────────────────────────────┐  │
│ │ ⚠️  "Full Stack Dev Needed" - Lost         │  │
│ │     Confidence: 3.2/5 · Sent 2 days ago   │  │
│ │     [Review] [Skip]                        │  │
│ └───────────────────────────────────────────┘  │
│                                                  │
│ 🟡 Medium Priority (8)                          │
│ 🟢 Sent, No Response Yet (11)                   │
└─────────────────────────────────────────────────┘
```

### Learning Architecture
```
Proposal Sent
    ↓
[Edit Detection] → Identifies what changed
    ↓
[Feedback Collection] → Admin explains why
    ↓
[Pattern Extraction] → System identifies patterns
    ↓
[Pattern Approval?] → DECISION NEEDED
    ↓
[Dynamic Prompt Building] → Includes patterns in future prompts
    ↓
Better Proposals
```

---

## Open Questions

### Q1: Pattern Auto-Apply or Approval?
Should successful patterns be:
- **A)** Auto-applied to future proposals (admin can disable later)
- **B)** Require admin approval before using

### Q2: How Many Training Examples?
How many successful examples to include in each prompt?
- **0** - Fastest, cheapest, but generic
- **1-2** - Minimal guidance
- **3** - Good balance (RECOMMENDED)
- **5** - Better guidance, still affordable
- **10+** - Maximum guidance, higher cost

### Q3: Review Priority Algorithm?
How should system decide which proposals admin should review first?
- Lost proposals (learn from failures)
- Low confidence proposals
- Proposals with unusual job requirements
- Random sample for quality control
- All of the above?

---

## Next Steps Once Clarified

1. Update main implementation plan with decisions
2. Design database schema with new fields
3. Create admin training interface mockups
4. Build pattern extraction logic
5. Implement learning pipeline
6. Start with MVP (basic feedback → prompt improvements)
7. Add advanced features (auto-pattern extraction, etc.)
