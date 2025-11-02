[38;2;253;151;31m#[0m[38;2;253;151;31m [0m[38;2;253;151;31mMemAI Backend - Claude Code Instructions[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mFor Claude Code Agents: Leverage Your Strengths[0m[1;38;2;249;38;114m**[0m

[1;38;2;255;255;255m---[0m

[38;2;253;151;31m##[0m[38;2;253;151;31m [0m[38;2;253;151;31m🎯 How Claude Code Should Approach This Codebase[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mYou have unique strengths:[0m[1;38;2;249;38;114m**[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m [0m[38;2;255;255;255mDeep contextual understanding[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Ability to reason through complex systems[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Excellent at planning before executing[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Strong architectural thinking[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Can handle nuanced instructions[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mUse them:[0m[1;38;2;249;38;114m**[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m1. [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mAlways Think Before Acting[0m[1;38;2;249;38;114m**[0m
[38;2;255;255;255m```[0m
[38;2;255;255;255mUser Request → Understand Context → Research Patterns → Plan Approach → Execute[0m
[38;2;255;255;255m```[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mExample Workflow:[0m[1;38;2;249;38;114m**[0m
[38;2;255;255;255m```[0m
[38;2;255;255;255mRequest: "Add a feature to track bookmark views"[0m

[38;2;255;255;255m1. UNDERSTAND: Read existing bookmark code, check database schema[0m
[38;2;255;255;255m2. RESEARCH: Grep for similar tracking features, check analytics patterns[0m
[38;2;255;255;255m3. PLAN: Design data model, API, and update flow[0m
[38;2;255;255;255m4. EXECUTE: Implement with proper types, tests, and validation[0m
[38;2;255;255;255m```[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31m2. [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mUse Task Tool for Complex Research[0m[1;38;2;249;38;114m**[0m
[38;2;255;255;255mWhen exploring unfamiliar patterns:[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255m// ❌ Don't: Guess the pattern[0m
[38;2;255;255;255m// ✅ Do: Use Task tool with subagent_type=Explore[0m
[38;2;255;255;255m"Find all places where user events are tracked"[0m
[38;2;255;255;255m```[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31m3. [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mValidate Assumptions[0m[1;38;2;249;38;114m**[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mbash[0m
[38;2;124;120;101m#[0m[38;2;124;120;101m Before implementing, verify:[0m
[38;2;255;255;255mRead[0m[38;2;255;255;255m existing similar features[0m
[38;2;255;255;255mGrep[0m[38;2;255;255;255m for usage patterns[0m
[38;2;255;255;255mCheck[0m[38;2;255;255;255m types exist[0m
[38;2;255;255;255mRun[0m[38;2;255;255;255m type check after changes[0m
[38;2;255;255;255m```[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31m4. [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mExplain Your Reasoning[0m[1;38;2;249;38;114m**[0m
[38;2;255;255;255mWhen making architectural decisions, explain WHY:[0m
[38;2;255;255;255m```[0m
[38;2;255;255;255m"Using a separate processor for this because:[0m
[38;2;255;255;255m1. Isolation: Failures won't affect main flow[0m
[38;2;255;255;255m2. Scalability: Can scale independently[0m
[38;2;255;255;255m3. Retry: Can retry failed operations[0m
[38;2;255;255;255m```[0m

[1;38;2;255;255;255m---[0m

[38;2;253;151;31m##[0m[38;2;253;151;31m [0m[38;2;253;151;31m📚 Documentation Strategy for Claude Code[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mRead in this order:[0m[1;38;2;249;38;114m**[0m

[38;2;255;255;255m1[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mThis file (CLAUDE.md)[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m - Project-specific guidelines[0m
[38;2;255;255;255m2[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mllm.txt[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m - Complete Encore.ts framework reference[0m
[38;2;255;255;255m3[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mDEVELOPER_GUIDE.md[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m - Quick reference[0m
[38;2;255;255;255m4[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mREADME.md[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m - CORS troubleshooting and architecture[0m
[38;2;255;255;255m5[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114magents.md[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m - Platform-agnostic patterns[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mWhen to use each:[0m[1;38;2;249;38;114m**[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mPlanning[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Read CLAUDE.md + DEVELOPER_GUIDE.md[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mEncore.ts questions[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Read llm.txt[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mQuick command[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Check Makefile[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mCORS issues[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Check README.md[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mTesting patterns[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Check DEVELOPER_GUIDE.md + test files[0m

[1;38;2;255;255;255m---[0m

[38;2;253;151;31m##[0m[38;2;253;151;31m [0m[38;2;253;151;31m🧠 Deep Understanding: Why This Architecture?[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31mWhy Two Separate Deployments? (Frontend + Backend)[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mDecision[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Deploy frontend to Vercel, backend to Encore Cloud separately.[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mReasoning:[0m[1;38;2;249;38;114m**[0m
[38;2;255;255;255m1[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mScaling[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Frontend (static) scales differently than backend (compute)[0m
[38;2;255;255;255m2[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mDeployment Speed[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Frontend changes don't require backend redeploy[0m
[38;2;255;255;255m3[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mCost Optimization[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Static hosting (Vercel) is cheaper than compute (Encore)[0m
[38;2;255;255;255m4[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mTechnology Fit[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Vercel excels at SPAs, Encore excels at TypeScript microservices[0m
[38;2;255;255;255m5[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mTeam Workflow[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Frontend/backend teams can deploy independently[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mTrade-off[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Requires CORS configuration and two deployment processes.[0m
[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mMitigation[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Wildcard CORS patterns + Makefile automation.[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31mWhy Multi-Stage Pub/Sub Pipeline?[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mDecision[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: 3-stage pipeline instead of single processor.[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mReasoning:[0m[1;38;2;249;38;114m**[0m
[38;2;255;255;255m```[0m
[38;2;255;255;255mStage 1: YouTube Download (Expensive, Unreliable)[0m
[38;2;255;255;255m  ↓ Persist: Audio in Object Storage[0m
[38;2;255;255;255mStage 2: Transcription (Expensive API Call)[0m
[38;2;255;255;255m  ↓ Persist: Transcript in PostgreSQL[0m
[38;2;255;255;255mStage 3: Summary (Cheap API Call)[0m
[38;2;255;255;255m  ↓ Persist: Summary in PostgreSQL[0m
[38;2;255;255;255m```[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mWhy Each Stage Persists Data:[0m[1;38;2;249;38;114m**[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m [0m[38;2;255;255;255mIf Stage 2 fails, Stage 1's expensive YouTube download is saved[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m If Stage 3 fails, Stage 2's expensive transcription is saved[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Can retry any stage without re-doing previous work[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Each stage is idempotent and independently scalable[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mAlternative Considered[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Single processor doing all steps.[0m
[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mRejected Because[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: One failure means re-doing all expensive operations.[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31mWhy Encore Object Storage for Audio?[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mDecision[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Use Encore Bucket, not filesystem.[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mReasoning:[0m[1;38;2;249;38;114m**[0m
[38;2;255;255;255m1[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mDistributed-Safe[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Processors might run on different machines[0m
[38;2;255;255;255m2[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mDurable[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Survives process restarts[0m
[38;2;255;255;255m3[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mCloud-Ready[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Works in production without changes[0m
[38;2;255;255;255m4[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mAutomatic Cleanup[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Easy to delete after processing[0m
[38;2;255;255;255m5[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mScalable[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: No disk space constraints[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mAlternative Considered[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Temporary filesystem.[0m
[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mRejected Because[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Doesn't work in distributed/cloud environments.[0m

[1;38;2;255;255;255m---[0m

[38;2;253;151;31m##[0m[38;2;253;151;31m [0m[38;2;253;151;31m🔬 Testing Philosophy: Why Transaction Isolation?[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mEncore Decision[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Each service call in tests = separate transaction.[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mWhy Encore Does This:[0m[1;38;2;249;38;114m**[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m [0m[38;2;255;255;255mTests should mirror production behavior[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m In production, each API call is independent[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Prevents test pollution (one test affecting another)[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Forces proper test architecture[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mImplication for You:[0m[1;38;2;249;38;114m**[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255m// This WILL fail:[0m
[38;2;255;255;255mawait repo.create(user);        // Transaction A[0m
[38;2;255;255;255mconst result = await api.getUser(id);  // Transaction B[0m
[38;2;255;255;255m// Transaction B can't see Transaction A's uncommitted data![0m

[38;2;255;255;255m// Solutions:[0m
[38;2;255;255;255m// 1. Stay at one layer (all DB or all service calls)[0m
[38;2;255;255;255m// 2. Use service calls that commit (webhooks, API endpoints)[0m
[38;2;255;255;255m```[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mWhy This Matters:[0m[1;38;2;249;38;114m**[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m [0m[38;2;255;255;255mForces you to write tests that match production reality[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Prevents "works in tests, fails in production"[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Makes test architecture explicit[0m

[1;38;2;255;255;255m---[0m

[38;2;253;151;31m#[0m[38;2;253;151;31m [0m[38;2;253;151;31mMemAI Backend - Claude Code Instructions[0m

[38;2;253;151;31m##[0m[38;2;253;151;31m [0m[38;2;253;151;31mProject Overview[0m

[38;2;255;255;255mThis is an [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mEncore.ts backend[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m for the MemAI application, handling bookmarks with YouTube video transcription using Deepgram (Nova-3) and OpenAI (GPT-4.1-mini).[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mStack:[0m[1;38;2;249;38;114m**[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m [0m[38;2;255;255;255mFramework: Encore.ts (TypeScript backend framework)[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Database: PostgreSQL (via Encore's SQLDatabase)[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Transcription: Deepgram API (Nova-3 model with Audio Intelligence)[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m AI Summary: OpenAI Responses API (GPT-4.1-mini)[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Pub/Sub: Encore's built-in Pub/Sub for async processing[0m

[1;38;2;255;255;255m---[0m

[38;2;253;151;31m##[0m[38;2;253;151;31m [0m[38;2;253;151;31mCRITICAL: Before You Start[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31m1. [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mAlways Read [0m[1;38;2;236;53;51m`[0m[1;38;2;236;53;51m/llm.txt[0m[1;38;2;236;53;51m`[0m[1;38;2;249;38;114m First[0m[1;38;2;249;38;114m**[0m
[38;2;255;255;255mThe [0m[38;2;236;53;51m`[0m[38;2;236;53;51m/llm.txt[0m[38;2;236;53;51m`[0m[38;2;255;255;255m file contains comprehensive Encore.ts framework knowledge including:[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m [0m[38;2;255;255;255mAPI endpoint patterns[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Database operations (query, queryRow, exec)[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Pub/Sub implementation[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Service structure[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Error handling patterns[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m ALL Encore.ts domain knowledge[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mDO NOT write Encore.ts code without consulting [0m[1;38;2;236;53;51m`[0m[1;38;2;236;53;51m/llm.txt[0m[1;38;2;236;53;51m`[0m[1;38;2;249;38;114m first![0m[1;38;2;249;38;114m**[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31m2. [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mUse All Available Tools[0m[1;38;2;249;38;114m**[0m
[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mNEVER assume or guess.[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m Always:[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m [0m[38;2;255;255;255m✅ Use [0m[38;2;236;53;51m`[0m[38;2;236;53;51mRead[0m[38;2;236;53;51m`[0m[38;2;255;255;255m to check existing files before creating new ones[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m ✅ Use [0m[38;2;236;53;51m`[0m[38;2;236;53;51mGlob[0m[38;2;236;53;51m`[0m[38;2;255;255;255m to find files by pattern ([0m[38;2;236;53;51m`[0m[38;2;236;53;51m**/*.ts[0m[38;2;236;53;51m`[0m[38;2;255;255;255m, etc.)[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m ✅ Use [0m[38;2;236;53;51m`[0m[38;2;236;53;51mGrep[0m[38;2;236;53;51m`[0m[38;2;255;255;255m to search for code usage, types, patterns[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m ✅ Use [0m[38;2;236;53;51m`[0m[38;2;236;53;51mWebSearch[0m[38;2;236;53;51m`[0m[38;2;255;255;255m to research APIs, best practices, latest docs[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m ✅ Use [0m[38;2;236;53;51m`[0m[38;2;236;53;51mWebFetch[0m[38;2;236;53;51m`[0m[38;2;255;255;255m to get official documentation[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m ✅ Use [0m[38;2;236;53;51m`[0m[38;2;236;53;51mBash[0m[38;2;236;53;51m`[0m[38;2;255;255;255m to verify structure, check databases, run tests[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31m3. [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mWhen Unclear: Research, Don't Guess[0m[1;38;2;249;38;114m**[0m
[38;2;255;255;255mIf requirements are ambiguous:[0m
[38;2;255;255;255m1[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mAsk clarifying questions[0m[1;38;2;249;38;114m**[0m
[38;2;255;255;255m2[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mSearch for documentation[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m (WebSearch/WebFetch)[0m
[38;2;255;255;255m3[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mCheck existing code[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m (Read/Grep for patterns)[0m
[38;2;255;255;255m4[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mVerify assumptions[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m (test with Bash commands)[0m
[38;2;255;255;255m5[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mMake a plan, then execute[0m[1;38;2;249;38;114m**[0m

[1;38;2;255;255;255m---[0m

[38;2;253;151;31m##[0m[38;2;253;151;31m [0m[38;2;253;151;31mCommon Bash Commands[0m

[38;2;255;255;255m```[0m[38;2;190;132;255mbash[0m
[38;2;124;120;101m#[0m[38;2;124;120;101m Development[0m
[38;2;255;255;255mencore[0m[38;2;255;255;255m run                    [0m[38;2;124;120;101m#[0m[38;2;124;120;101m Start the dev server[0m
[38;2;255;255;255mencore[0m[38;2;255;255;255m run[0m[38;2;253;151;31m --[0m[38;2;253;151;31mdebug           [0m[38;2;124;120;101m#[0m[38;2;124;120;101m Start with debugging enabled[0m

[38;2;124;120;101m#[0m[38;2;124;120;101m Database[0m
[38;2;255;255;255mencore[0m[38;2;255;255;255m db conn-uri bookmarks [0m[38;2;124;120;101m#[0m[38;2;124;120;101m Get database connection string[0m
[38;2;255;255;255mencore[0m[38;2;255;255;255m db shell bookmarks    [0m[38;2;124;120;101m#[0m[38;2;124;120;101m Open psql shell[0m
[38;2;255;255;255mencore[0m[38;2;255;255;255m db reset bookmarks    [0m[38;2;124;120;101m#[0m[38;2;124;120;101m Reset database (careful!)[0m
[38;2;255;255;255mpsql[0m[38;2;255;255;255m [0m[38;2;255;255;255m"[0m[38;2;255;255;255m$[0m[38;2;230;219;116m([0m[38;2;255;255;255mencore[0m[38;2;230;219;116m db conn-uri bookmarks[0m[38;2;230;219;116m)[0m[38;2;255;255;255m"[0m[38;2;253;151;31m -[0m[38;2;253;151;31mc[0m[38;2;255;255;255m [0m[38;2;255;255;255m"[0m[38;2;230;219;116m\d transcriptions[0m[38;2;255;255;255m"[0m[38;2;255;255;255m  [0m[38;2;124;120;101m#[0m[38;2;124;120;101m Check schema[0m

[38;2;124;120;101m#[0m[38;2;124;120;101m Type checking[0m
[38;2;255;255;255mnpx[0m[38;2;255;255;255m tsc[0m[38;2;253;151;31m --[0m[38;2;253;151;31mnoEmit            [0m[38;2;124;120;101m#[0m[38;2;124;120;101m Check TypeScript types[0m

[38;2;124;120;101m#[0m[38;2;124;120;101m Project structure[0m
[38;2;255;255;255mtree[0m[38;2;255;255;255m bookmarks[0m[38;2;253;151;31m -[0m[38;2;253;151;31mL[0m[38;2;255;255;255m 2[0m[38;2;253;151;31m -[0m[38;2;253;151;31mI[0m[38;2;255;255;255m [0m[38;2;255;255;255m'[0m[38;2;230;219;116mnode_modules[0m[38;2;255;255;255m'[0m[38;2;255;255;255m  [0m[38;2;124;120;101m#[0m[38;2;124;120;101m View directory structure[0m
[38;2;255;255;255mls[0m[38;2;253;151;31m -[0m[38;2;253;151;31mla[0m[38;2;255;255;255m bookmarks/           [0m[38;2;124;120;101m#[0m[38;2;124;120;101m List files in bookmarks service[0m

[38;2;124;120;101m#[0m[38;2;124;120;101m Git[0m
[38;2;255;255;255mgit[0m[38;2;255;255;255m status                  [0m[38;2;124;120;101m#[0m[38;2;124;120;101m Check current state[0m
[38;2;255;255;255mgit[0m[38;2;255;255;255m diff                    [0m[38;2;124;120;101m#[0m[38;2;124;120;101m View changes[0m
[38;2;255;255;255m```[0m

[1;38;2;255;255;255m---[0m

[38;2;253;151;31m##[0m[38;2;253;151;31m [0m[38;2;253;151;31mFramework: Encore.ts Essentials[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31m⚠️ Reference [0m[38;2;236;53;51m`[0m[38;2;236;53;51m/llm.txt[0m[38;2;236;53;51m`[0m[38;2;253;151;31m for Complete Framework Knowledge[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mKey Points from [0m[1;38;2;236;53;51m`[0m[1;38;2;236;53;51m/llm.txt[0m[1;38;2;236;53;51m`[0m[1;38;2;249;38;114m:[0m[1;38;2;249;38;114m**[0m

[38;2;253;151;31m####[0m[38;2;253;151;31m [0m[38;2;253;151;31mDatabase Operations (ONLY these methods exist)[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255m// ✅ CORRECT - From llm.txt[0m
[38;2;255;255;255mconst row = await db.queryRow<Type>`SELECT * FROM table WHERE id = ${id}`;[0m
[38;2;255;255;255mconst rows = await db.query<Type>`SELECT * FROM table`;[0m
[38;2;255;255;255mawait db.exec`INSERT INTO table (field) VALUES (${value})`;[0m

[38;2;255;255;255m// ❌ WRONG - These don't exist in Encore[0m
[38;2;255;255;255mdb.all()   // NO[0m
[38;2;255;255;255mdb.get()   // NO[0m
[38;2;255;255;255mdb.run()   // NO[0m
[38;2;255;255;255m```[0m

[38;2;253;151;31m####[0m[38;2;253;151;31m [0m[38;2;253;151;31mAPI Endpoint Pattern[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255mimport { api, APIError } from "encore.dev/api";[0m

[38;2;255;255;255mexport const endpoint = api([0m
[38;2;255;255;255m  { expose: true, method: "POST", path: "/resource" },[0m
[38;2;255;255;255m  async (req: RequestType): Promise<ResponseType> => {[0m
[38;2;255;255;255m    if (!req.required) {[0m
[38;2;255;255;255m      throw APIError.invalidArgument("field required");[0m
[38;2;255;255;255m    }[0m
[38;2;255;255;255m    return { data };[0m
[38;2;255;255;255m  }[0m
[38;2;255;255;255m);[0m
[38;2;255;255;255m```[0m

[38;2;253;151;31m####[0m[38;2;253;151;31m [0m[38;2;253;151;31mPub/Sub Pattern[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255mimport { Topic, Subscription } from "encore.dev/pubsub";[0m

[38;2;255;255;255m// Topic (package-level variable)[0m
[38;2;255;255;255mexport const topic = new Topic<EventType>("topic-name", {[0m
[38;2;255;255;255m  deliveryGuarantee: "at-least-once",[0m
[38;2;255;255;255m});[0m

[38;2;255;255;255m// Subscription (use _ for unused variable)[0m
[38;2;255;255;255mconst _ = new Subscription(topic, "handler-name", {[0m
[38;2;255;255;255m  handler: async (event) => { /* logic */ },[0m
[38;2;255;255;255m});[0m
[38;2;255;255;255m```[0m

[1;38;2;255;255;255m---[0m

[38;2;253;151;31m##[0m[38;2;253;151;31m [0m[38;2;253;151;31mProject Architecture[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31mService Structure[0m
[38;2;255;255;255m```[0m
[38;2;255;255;255mbookmarks/[0m
[38;2;255;255;255m├── encore.service.ts    # Service registration (imports processors!)[0m
[38;2;255;255;255m├── api.ts              # REST API endpoints[0m
[38;2;255;255;255m├── db.ts               # Database initialization[0m
[38;2;255;255;255m├── events/             # Pub/Sub topics (multi-stage pipeline)[0m
[38;2;255;255;255m│   ├── youtube-download.events.ts        # Stage 1: YouTube download[0m
[38;2;255;255;255m│   ├── audio-transcription.events.ts     # Stage 2: Audio transcription[0m
[38;2;255;255;255m│   └── summary-generation.events.ts      # Stage 3: Summary generation[0m
[38;2;255;255;255m├── types/              # Organized type definitions[0m
[38;2;255;255;255m│   ├── domain.types.ts      # Core domain models[0m
[38;2;255;255;255m│   ├── api.types.ts         # API request/response types[0m
[38;2;255;255;255m│   ├── event.types.ts       # Pub/Sub event types[0m
[38;2;255;255;255m│   ├── deepgram.types.ts    # Deepgram API types[0m
[38;2;255;255;255m│   └── index.ts             # Re-exports[0m
[38;2;255;255;255m├── config/             # Centralized configuration[0m
[38;2;255;255;255m│   └── transcription.config.ts[0m
[38;2;255;255;255m├── repositories/       # Database access ONLY[0m
[38;2;255;255;255m│   ├── bookmark.repository.ts[0m
[38;2;255;255;255m│   └── transcription.repository.ts[0m
[38;2;255;255;255m├── services/           # Business logic[0m
[38;2;255;255;255m│   ├── youtube-downloader.service.ts[0m
[38;2;255;255;255m│   ├── deepgram.service.ts[0m
[38;2;255;255;255m│   └── openai.service.ts[0m
[38;2;255;255;255m├── processors/         # Pub/Sub handlers (multi-stage pipeline)[0m
[38;2;255;255;255m│   ├── youtube-download.processor.ts         # Stage 1[0m
[38;2;255;255;255m│   ├── audio-transcription.processor.ts      # Stage 2[0m
[38;2;255;255;255m│   └── summary-generation.processor.ts       # Stage 3[0m
[38;2;255;255;255m├── utils/             # Pure utility functions[0m
[38;2;255;255;255m│   ├── youtube-url.util.ts[0m
[38;2;255;255;255m│   ├── file-cleanup.util.ts[0m
[38;2;255;255;255m│   └── deepgram-extractor.util.ts[0m
[38;2;255;255;255m└── migrations/        # SQL migrations (numbered)[0m
[38;2;255;255;255m    ├── 1_create_bookmarks.up.sql[0m
[38;2;255;255;255m    ├── 2_create_transcriptions.up.sql[0m
[38;2;255;255;255m    ├── 3_add_audio_intelligence.up.sql[0m
[38;2;255;255;255m    └── 4_add_audio_metadata.up.sql[0m
[38;2;255;255;255m```[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31mArchitecture Principles[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114m1. Single Responsibility[0m[1;38;2;249;38;114m**[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m [0m[38;2;255;255;255mOne file = One purpose[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Repositories: Database operations ONLY[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Services: Business logic, use repositories[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Processors: Pub/Sub handlers, coordinate services[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Utils: Pure functions, no side effects[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114m2. Dependency Injection[0m[1;38;2;249;38;114m**[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255m// ✅ GOOD: Injectable[0m
[38;2;255;255;255mclass Service {[0m
[38;2;255;255;255m  constructor([0m
[38;2;255;255;255m    private readonly repo: Repository,[0m
[38;2;255;255;255m    private readonly api: ExternalAPI[0m
[38;2;255;255;255m  ) {}[0m
[38;2;255;255;255m}[0m

[38;2;255;255;255m// ❌ BAD: Hard-coded[0m
[38;2;255;255;255mclass Service {[0m
[38;2;255;255;255m  private repo = new Repository(); // Not testable[0m
[38;2;255;255;255m}[0m
[38;2;255;255;255m```[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114m3. Centralized Configuration[0m[1;38;2;249;38;114m**[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255m// config/feature.config.ts[0m
[38;2;255;255;255mexport const CONFIG = {[0m
[38;2;255;255;255m  model: "gpt-4.1-mini" as const,[0m
[38;2;255;255;255m  timeout: 30000,[0m
[38;2;255;255;255m} as const;[0m

[38;2;255;255;255m// ❌ NEVER hardcode in services[0m
[38;2;255;255;255m```[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31mMulti-Stage Pub/Sub Pipeline[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mArchitecture:[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m YouTube transcription uses a 3-stage pipeline for fault tolerance and data persistence at each step.[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mFlow:[0m[1;38;2;249;38;114m**[0m
[38;2;255;255;255m```[0m
[38;2;255;255;255mAPI creates bookmark[0m
[38;2;255;255;255m  ↓[0m
[38;2;255;255;255m  Publish YouTubeDownloadEvent[0m
[38;2;255;255;255m  ↓[0m
[38;2;255;255;255mStage 1: YouTube Download Processor[0m
[38;2;255;255;255m  - Downloads audio from YouTube to temp file[0m
[38;2;255;255;255m  - Uploads to Encore Object Storage bucket[0m
[38;2;255;255;255m  - Deletes temp file[0m
[38;2;255;255;255m  - Publishes AudioTranscriptionEvent (with bucket key)[0m
[38;2;255;255;255m  ↓[0m
[38;2;255;255;255mStage 2: Audio Transcription Processor[0m
[38;2;255;255;255m  - Downloads audio from bucket[0m
[38;2;255;255;255m  - Transcribes with Deepgram[0m
[38;2;255;255;255m  - Stores transcript + metadata in DB[0m
[38;2;255;255;255m  - Deletes audio from bucket[0m
[38;2;255;255;255m  - Publishes SummaryGenerationEvent[0m
[38;2;255;255;255m  ↓[0m
[38;2;255;255;255mStage 3: Summary Generation Processor[0m
[38;2;255;255;255m  - Generates OpenAI summary[0m
[38;2;255;255;255m  - Stores summary in DB[0m
[38;2;255;255;255m  - Marks transcription as completed[0m
[38;2;255;255;255m```[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mBenefits:[0m[1;38;2;249;38;114m**[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m [0m[38;2;255;255;255m✅ [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mFault Isolation[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Each stage can fail independently without losing previous work[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m ✅ [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mObject Storage[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Uses Encore Bucket instead of temp files (cloud-ready, distributed-safe)[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m ✅ [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mData Persistence[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Each stage writes its data immediately to DB[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m ✅ [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mRetry Safety[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Can retry any stage without redoing previous stages[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m ✅ [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mObservability[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Can track which stage failed and why[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m ✅ [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mScalability[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Can scale each stage independently[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m ✅ [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mAutomatic Cleanup[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Audio files deleted from bucket after transcription[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mExample: Stage 1 Processor (with Encore Bucket)[0m[1;38;2;249;38;114m**[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255mimport { Subscription } from "encore.dev/pubsub";[0m
[38;2;255;255;255mimport { youtubeDownloadTopic } from "../events/youtube-download.events";[0m
[38;2;255;255;255mimport { audioTranscriptionTopic } from "../events/audio-transcription.events";[0m
[38;2;255;255;255mimport { audioFilesBucket } from "../storage";[0m

[38;2;255;255;255masync function handleYouTubeDownload(event: YouTubeDownloadEvent) {[0m
[38;2;255;255;255m  try {[0m
[38;2;255;255;255m    // Download audio and upload to bucket[0m
[38;2;255;255;255m    const audioBucketKey = await youtubeDownloader.downloadAndUpload([0m
[38;2;255;255;255m      videoId,[0m
[38;2;255;255;255m      bookmarkId[0m
[38;2;255;255;255m    );[0m

[38;2;255;255;255m    // Publish to next stage with bucket key[0m
[38;2;255;255;255m    await audioTranscriptionTopic.publish({[0m
[38;2;255;255;255m      bookmarkId,[0m
[38;2;255;255;255m      audioBucketKey, // Pass bucket key instead of file path[0m
[38;2;255;255;255m      videoId,[0m
[38;2;255;255;255m    });[0m
[38;2;255;255;255m  } catch (error) {[0m
[38;2;255;255;255m    await transcriptionRepo.markAsFailed(bookmarkId, error.message);[0m
[38;2;255;255;255m  }[0m
[38;2;255;255;255m}[0m

[38;2;255;255;255mexport const youtubeDownloadSubscription = new Subscription([0m
[38;2;255;255;255m  youtubeDownloadTopic,[0m
[38;2;255;255;255m  "youtube-download-processor",[0m
[38;2;255;255;255m  { handler: handleYouTubeDownload }[0m
[38;2;255;255;255m);[0m
[38;2;255;255;255m```[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mExample: Stage 2 Processor (downloads from bucket)[0m[1;38;2;249;38;114m**[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255masync function handleAudioTranscription(event: AudioTranscriptionEvent) {[0m
[38;2;255;255;255m  const { bookmarkId, audioBucketKey, videoId } = event;[0m

[38;2;255;255;255m  try {[0m
[38;2;255;255;255m    // Download from bucket[0m
[38;2;255;255;255m    const audioBuffer = await audioFilesBucket.download(audioBucketKey);[0m

[38;2;255;255;255m    // Transcribe[0m
[38;2;255;255;255m    const deepgramResponse = await deepgramService.transcribe([0m
[38;2;255;255;255m      audioBuffer,[0m
[38;2;255;255;255m      audioBucketKey[0m
[38;2;255;255;255m    );[0m

[38;2;255;255;255m    // Store data[0m
[38;2;255;255;255m    await transcriptionRepo.updateTranscriptionData(bookmarkId, data);[0m

[38;2;255;255;255m    // Delete from bucket[0m
[38;2;255;255;255m    await audioFilesBucket.remove(audioBucketKey);[0m

[38;2;255;255;255m    // Publish next stage[0m
[38;2;255;255;255m    await summaryGenerationTopic.publish({ bookmarkId, transcript });[0m
[38;2;255;255;255m  } catch (error) {[0m
[38;2;255;255;255m    // Clean up bucket on failure[0m
[38;2;255;255;255m    try {[0m
[38;2;255;255;255m      await audioFilesBucket.remove(audioBucketKey);[0m
[38;2;255;255;255m    } catch {}[0m
[38;2;255;255;255m    await transcriptionRepo.markAsFailed(bookmarkId, error.message);[0m
[38;2;255;255;255m  }[0m
[38;2;255;255;255m}[0m
[38;2;255;255;255m```[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mKey Patterns:[0m[1;38;2;249;38;114m**[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mObject Storage[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Use Encore Bucket for temp audio files (not filesystem)[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mEach processor[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Process → Store Data → Cleanup → Publish Next Event[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mEach stage is idempotent[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Safe to retry without side effects[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mAutomatic cleanup[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Audio deleted from bucket after Stage 2 completes[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mBucket keys[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Format: [0m[38;2;236;53;51m`[0m[38;2;236;53;51maudio-{bookmarkId}-{videoId}.mp3[0m[38;2;236;53;51m`[0m

[1;38;2;255;255;255m---[0m

[38;2;253;151;31m##[0m[38;2;253;151;31m [0m[38;2;253;151;31mDeepgram Integration[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31m⚠️ CRITICAL: Deepgram Uses PLURAL Keys[0m

[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255m// ❌ WRONG - This key doesn't exist![0m
[38;2;255;255;255mresponse.results.sentiment[0m

[38;2;255;255;255m// ✅ CORRECT - Note the 's' at the end[0m
[38;2;255;255;255mresponse.results.sentiments[0m
[38;2;255;255;255mresponse.results.intents[0m
[38;2;255;255;255mresponse.results.topics[0m
[38;2;255;255;255mresponse.results.summary[0m
[38;2;255;255;255m```[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31mConfiguration (config/transcription.config.ts)[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255mexport const DEEPGRAM_CONFIG = {[0m
[38;2;255;255;255m  model: "nova-3" as const,        // Latest model (2025)[0m
[38;2;255;255;255m  smart_format: true,[0m
[38;2;255;255;255m  paragraphs: true,[0m
[38;2;255;255;255m  punctuate: true,[0m
[38;2;255;255;255m  diarize: true,[0m
[38;2;255;255;255m  sentiment: true,                  // Enable sentiment analysis[0m
[38;2;255;255;255m  summarize: "v2" as const,        // Use V2 summarization[0m
[38;2;255;255;255m  intents: true,                    // Enable intent recognition[0m
[38;2;255;255;255m  topics: true,                     // Enable topic detection[0m
[38;2;255;255;255m  language: "en" as const,         // Required for audio intelligence[0m
[38;2;255;255;255m} as const;[0m
[38;2;255;255;255m```[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31mService Pattern[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255mexport class DeepgramService {[0m
[38;2;255;255;255m  constructor(private readonly apiKey: string) {}[0m

[38;2;255;255;255m  async transcribe(audioPath: string): Promise<DeepgramResponse> {[0m
[38;2;255;255;255m    const deepgram = createClient(this.apiKey);[0m
[38;2;255;255;255m    const audioBuffer = fs.readFileSync(audioPath);[0m

[38;2;255;255;255m    const { result, error } = await deepgram.listen.prerecorded.transcribeFile([0m
[38;2;255;255;255m      audioBuffer,[0m
[38;2;255;255;255m      DEEPGRAM_CONFIG[0m
[38;2;255;255;255m    );[0m

[38;2;255;255;255m    if (error) {[0m
[38;2;255;255;255m      throw new Error(`Deepgram API error: ${error.message}`);[0m
[38;2;255;255;255m    }[0m

[38;2;255;255;255m    // Cast to custom type with audio intelligence[0m
[38;2;255;255;255m    return result as unknown as DeepgramResponse;[0m
[38;2;255;255;255m  }[0m
[38;2;255;255;255m}[0m
[38;2;255;255;255m```[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31mData Extraction[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255m// ✅ Access PLURAL keys with fallbacks[0m
[38;2;255;255;255mconst sentiment = response.results.sentiments?.average?.sentiment || null;[0m
[38;2;255;255;255mconst sentimentScore = response.results.sentiments?.average?.sentiment_score || null;[0m
[38;2;255;255;255mconst summary = response.results.summary?.short || null;[0m
[38;2;255;255;255m```[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mResources:[0m[1;38;2;249;38;114m**[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m [0m[38;2;255;255;255mDocs: [0m[4;38;2;166;226;46mhttps://developers.deepgram.com[0m[4;38;2;166;226;46m/docs/[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Model: Nova-3 (2025)[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Features: Sentiment, Summarization V2, Intents, Topics[0m

[1;38;2;255;255;255m---[0m

[38;2;253;151;31m##[0m[38;2;253;151;31m [0m[38;2;253;151;31mOpenAI Integration[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31m⚠️ Use Responses API (Not Chat Completions)[0m

[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255m// ✅ CORRECT: Responses API (2025 standard)[0m
[38;2;255;255;255mimport OpenAI from "openai";[0m

[38;2;255;255;255mconst openai = new OpenAI({ apiKey });[0m

[38;2;255;255;255mconst response = await openai.responses.create({[0m
[38;2;255;255;255m  model: "gpt-4.1-mini",[0m
[38;2;255;255;255m  instructions: "System prompt here",[0m
[38;2;255;255;255m  input: "User input here",[0m
[38;2;255;255;255m  temperature: 0.7,[0m
[38;2;255;255;255m  max_output_tokens: 500,[0m
[38;2;255;255;255m});[0m

[38;2;255;255;255mconst text = response.output_text;[0m

[38;2;255;255;255m// ❌ WRONG: Old Chat Completions API[0m
[38;2;255;255;255mconst response = await openai.chat.completions.create({ ... });[0m
[38;2;255;255;255m```[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31mConfiguration (config/transcription.config.ts)[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255mexport const OPENAI_CONFIG = {[0m
[38;2;255;255;255m  model: "gpt-4.1-mini" as const,[0m
[38;2;255;255;255m  temperature: 0.7,[0m
[38;2;255;255;255m  maxOutputTokens: 500,[0m
[38;2;255;255;255m  instructions: "You are a helpful assistant...",[0m
[38;2;255;255;255m} as const;[0m
[38;2;255;255;255m```[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31mService Pattern[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255mexport class OpenAIService {[0m
[38;2;255;255;255m  private readonly client: OpenAI;[0m

[38;2;255;255;255m  constructor(apiKey: string) {[0m
[38;2;255;255;255m    this.client = new OpenAI({ apiKey });[0m
[38;2;255;255;255m  }[0m

[38;2;255;255;255m  async generateSummary(transcript: string): Promise<string> {[0m
[38;2;255;255;255m    try {[0m
[38;2;255;255;255m      const response = await this.client.responses.create({[0m
[38;2;255;255;255m        model: OPENAI_CONFIG.model,[0m
[38;2;255;255;255m        instructions: OPENAI_CONFIG.instructions,[0m
[38;2;255;255;255m        input: `Summarize: ${transcript}`,[0m
[38;2;255;255;255m        temperature: OPENAI_CONFIG.temperature,[0m
[38;2;255;255;255m        max_output_tokens: OPENAI_CONFIG.maxOutputTokens,[0m
[38;2;255;255;255m      });[0m

[38;2;255;255;255m      return response.output_text || "No summary available";[0m
[38;2;255;255;255m    } catch (error) {[0m
[38;2;255;255;255m      log.error(error, "OpenAI summary generation failed");[0m
[38;2;255;255;255m      throw new Error(`OpenAI error: ${error.message}`);[0m
[38;2;255;255;255m    }[0m
[38;2;255;255;255m  }[0m
[38;2;255;255;255m}[0m
[38;2;255;255;255m```[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mResources:[0m[1;38;2;249;38;114m**[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m [0m[38;2;255;255;255mDocs: [0m[4;38;2;166;226;46mhttps://platform.openai.com[0m[4;38;2;166;226;46m/docs/api-reference/responses[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Model: GPT-4.1-mini (2025)[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m API: Responses API (new standard)[0m

[1;38;2;255;255;255m---[0m

[38;2;253;151;31m##[0m[38;2;253;151;31m [0m[38;2;253;151;31mDatabase Best Practices[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31m1. Repository Pattern (Always)[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255mexport class FeatureRepository {[0m
[38;2;255;255;255m  constructor(private readonly db: SQLDatabase) {}[0m

[38;2;255;255;255m  async create(data: Data): Promise<Entity> {[0m
[38;2;255;255;255m    const row = await this.db.queryRow<Entity>`[0m
[38;2;255;255;255m      INSERT INTO table (field) VALUES (${data.field})[0m
[38;2;255;255;255m      RETURNING *[0m
[38;2;255;255;255m    `;[0m
[38;2;255;255;255m    if (!row) throw new Error("Failed to create");[0m
[38;2;255;255;255m    return row;[0m
[38;2;255;255;255m  }[0m

[38;2;255;255;255m  async findById(id: number): Promise<Entity | null> {[0m
[38;2;255;255;255m    return await this.db.queryRow<Entity>`[0m
[38;2;255;255;255m      SELECT * FROM table WHERE id = ${id}[0m
[38;2;255;255;255m    ` || null;[0m
[38;2;255;255;255m  }[0m

[38;2;255;255;255m  async list(): Promise<Entity[]> {[0m
[38;2;255;255;255m    const results: Entity[] = [];[0m
[38;2;255;255;255m    for await (const row of this.db.query<Entity>`SELECT * FROM table`) {[0m
[38;2;255;255;255m      results.push(row);[0m
[38;2;255;255;255m    }[0m
[38;2;255;255;255m    return results;[0m
[38;2;255;255;255m  }[0m
[38;2;255;255;255m}[0m
[38;2;255;255;255m```[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31m2. ⚠️ JSONB Handling[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255m// ❌ WRONG: Double-stringification[0m
[38;2;255;255;255mdeepgram_response = ${JSON.stringify(data)}[0m

[38;2;255;255;255m// ✅ CORRECT: Let Encore handle it[0m
[38;2;255;255;255mdeepgram_response = ${data}  // Encore auto-serializes to JSONB[0m
[38;2;255;255;255m```[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31m3. Migrations[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m [0m[38;2;255;255;255mNumber sequentially: [0m[38;2;236;53;51m`[0m[38;2;236;53;51m1_[0m[38;2;236;53;51m`[0m[38;2;255;255;255m, [0m[38;2;236;53;51m`[0m[38;2;236;53;51m2_[0m[38;2;236;53;51m`[0m[38;2;255;255;255m, [0m[38;2;236;53;51m`[0m[38;2;236;53;51m3_[0m[38;2;236;53;51m`[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Descriptive names[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Must end with [0m[38;2;236;53;51m`[0m[38;2;236;53;51m.up.sql[0m[38;2;236;53;51m`[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Place in service's [0m[38;2;236;53;51m`[0m[38;2;236;53;51mmigrations/[0m[38;2;236;53;51m`[0m[38;2;255;255;255m directory[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Applied automatically by Encore on startup[0m

[1;38;2;255;255;255m---[0m

[38;2;253;151;31m##[0m[38;2;253;151;31m [0m[38;2;253;151;31mCode Quality Standards[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31m1. No Dead Code[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255m// ❌ BAD[0m
[38;2;255;255;255mconst unused = [];  // Never used[0m

[38;2;255;255;255m// ✅ GOOD[0m
[38;2;255;255;255m// Only declare what you use[0m
[38;2;255;255;255m```[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31m2. Error Messages[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255m// ❌ BAD[0m
[38;2;255;255;255mthrow new Error("Error");[0m

[38;2;255;255;255m// ✅ GOOD[0m
[38;2;255;255;255mthrow new Error(`Failed to transcribe ${audioPath}: file not found`);[0m
[38;2;255;255;255mthrow APIError.notFound(`Bookmark ${id} not found`);[0m
[38;2;255;255;255m```[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31m3. Structured Logging[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255mimport log from "encore.dev/log";[0m

[38;2;255;255;255m// ✅ GOOD[0m
[38;2;255;255;255mlog.info("Processing bookmark", { bookmarkId, url });[0m
[38;2;255;255;255mlog.error(error, "Process failed", { bookmarkId, error: error.message });[0m

[38;2;255;255;255m// ❌ BAD[0m
[38;2;255;255;255mconsole.log("Processing...");[0m
[38;2;255;255;255m```[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31m4. File Naming[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255m// ✅ GOOD[0m
[38;2;255;255;255mfeature.repository.ts[0m
[38;2;255;255;255mfeature.service.ts[0m
[38;2;255;255;255mfeature.types.ts[0m
[38;2;255;255;255mfeature.config.ts[0m

[38;2;255;255;255m// ❌ BAD[0m
[38;2;255;255;255mFeatureRepository.ts  // No PascalCase[0m
[38;2;255;255;255mfeature_repository.ts // No snake_case[0m
[38;2;255;255;255mfeatureRepo.ts        // No abbreviations[0m
[38;2;255;255;255m```[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31m5. Type Safety[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255m// ✅ GOOD[0m
[38;2;255;255;255mtype Status = "pending" | "processing" | "completed" | "failed";[0m

[38;2;255;255;255m// ❌ BAD[0m
[38;2;255;255;255mtype Status = string;  // Too generic[0m
[38;2;255;255;255mdata: any;             // Never use 'any'[0m
[38;2;255;255;255m```[0m

[1;38;2;255;255;255m---[0m

[38;2;253;151;31m##[0m[38;2;253;151;31m [0m[38;2;253;151;31mCommon Pitfalls [0m[38;2;253;151;31m&[0m[38;2;253;151;31m Solutions[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31m1. Deepgram Keys[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255m// ❌ WRONG[0m
[38;2;255;255;255mresponse.results.sentiment  // Doesn't exist[0m

[38;2;255;255;255m// ✅ CORRECT[0m
[38;2;255;255;255mresponse.results.sentiments // Note the 's'[0m
[38;2;255;255;255m```[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31m2. JSONB Serialization[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255m// ❌ WRONG[0m
[38;2;255;255;255mdeepgram_response = ${JSON.stringify(data)} // Double-stringified[0m

[38;2;255;255;255m// ✅ CORRECT[0m
[38;2;255;255;255mdeepgram_response = ${data} // Auto-serialized[0m
[38;2;255;255;255m```[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31m3. Database Methods[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255m// ❌ WRONG - These don't exist[0m
[38;2;255;255;255mdb.get(), db.all(), db.run()[0m

[38;2;255;255;255m// ✅ CORRECT - From llm.txt[0m
[38;2;255;255;255mdb.queryRow(), db.query(), db.exec()[0m
[38;2;255;255;255m```[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31m4. Service Registration[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255m// ❌ WRONG - Processor not imported[0m
[38;2;255;255;255m// File exists but not loaded[0m

[38;2;255;255;255m// ✅ CORRECT - Import in encore.service.ts[0m
[38;2;255;255;255mimport "./processors/feature.processor";[0m
[38;2;255;255;255m```[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31m5. Type Casting[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255m// ❌ WRONG[0m
[38;2;255;255;255msource: req.source // Type error: string vs enum[0m

[38;2;255;255;255m// ✅ CORRECT[0m
[38;2;255;255;255msource: req.source as BookmarkSource | undefined[0m
[38;2;255;255;255m```[0m

[1;38;2;255;255;255m---[0m

[38;2;253;151;31m##[0m[38;2;253;151;31m [0m[38;2;253;151;31mWorkflow: Making Changes[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31mStep 1: Gather Context[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mbash[0m
[38;2;124;120;101m#[0m[38;2;124;120;101m Read existing files[0m
[38;2;255;255;255mRead[0m[38;2;255;255;255m bookmarks/api.ts[0m

[38;2;124;120;101m#[0m[38;2;124;120;101m Search for patterns[0m
[38;2;255;255;255mGrep[0m[38;2;255;255;255m [0m[38;2;255;255;255m"[0m[38;2;230;219;116mqueryRow[0m[38;2;255;255;255m"[0m[38;2;255;255;255m bookmarks/[0m

[38;2;124;120;101m#[0m[38;2;124;120;101m Check structure[0m
[38;2;255;255;255mtree[0m[38;2;255;255;255m bookmarks[0m[38;2;253;151;31m -[0m[38;2;253;151;31mL[0m[38;2;255;255;255m 2[0m

[38;2;124;120;101m#[0m[38;2;124;120;101m Consult llm.txt[0m
[38;2;255;255;255mRead[0m[38;2;255;255;255m llm.txt[0m
[38;2;255;255;255m```[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31mStep 2: Plan[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m [0m[38;2;255;255;255mWhat files need changes?[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m What dependencies are affected?[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Do types need updating?[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Are there database changes?[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Will this break existing code?[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31mStep 3: Implement[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m [0m[38;2;255;255;255mFollow established patterns[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Use existing utilities[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Maintain consistency[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Add proper logging[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Handle errors gracefully[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31mStep 4: Validate[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mbash[0m
[38;2;124;120;101m#[0m[38;2;124;120;101m Type check[0m
[38;2;255;255;255mnpx[0m[38;2;255;255;255m tsc[0m[38;2;253;151;31m --[0m[38;2;253;151;31mnoEmit[0m

[38;2;124;120;101m#[0m[38;2;124;120;101m Check structure[0m
[38;2;255;255;255mtree[0m[38;2;255;255;255m bookmarks[0m

[38;2;124;120;101m#[0m[38;2;124;120;101m Test database[0m
[38;2;255;255;255mpsql[0m[38;2;255;255;255m [0m[38;2;255;255;255m"[0m[38;2;255;255;255m$[0m[38;2;230;219;116m([0m[38;2;255;255;255mencore[0m[38;2;230;219;116m db conn-uri bookmarks[0m[38;2;230;219;116m)[0m[38;2;255;255;255m"[0m[38;2;253;151;31m -[0m[38;2;253;151;31mc[0m[38;2;255;255;255m [0m[38;2;255;255;255m"[0m[38;2;230;219;116m\d table_name[0m[38;2;255;255;255m"[0m

[38;2;124;120;101m#[0m[38;2;124;120;101m Run server[0m
[38;2;255;255;255mencore[0m[38;2;255;255;255m run[0m
[38;2;255;255;255m```[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31mStep 5: Document[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255m/**[0m
[38;2;255;255;255m * Transcribes audio using Deepgram Nova-3[0m
[38;2;255;255;255m * @param audioPath - Path to audio file[0m
[38;2;255;255;255m * @returns Transcription with audio intelligence[0m
[38;2;255;255;255m * @throws Error if transcription fails[0m
[38;2;255;255;255m */[0m
[38;2;255;255;255m```[0m

[1;38;2;255;255;255m---[0m

[38;2;253;151;31m##[0m[38;2;253;151;31m [0m[38;2;253;151;31mCode Style[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31mTypeScript[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m [0m[38;2;255;255;255mUse ES6+ syntax (import/export, not require)[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Use [0m[38;2;236;53;51m`[0m[38;2;236;53;51minterface[0m[38;2;236;53;51m`[0m[38;2;255;255;255m for object shapes[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Use [0m[38;2;236;53;51m`[0m[38;2;236;53;51mtype[0m[38;2;236;53;51m`[0m[38;2;255;255;255m for unions, intersections, primitives[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Prefer const over let[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Use async/await, not callbacks/promises.then()[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31mImports[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255m// ✅ GOOD: Centralized imports[0m
[38;2;255;255;255mimport { Type1, Type2 } from "./types";[0m

[38;2;255;255;255m// ❌ BAD: Scattered imports[0m
[38;2;255;255;255mimport { Type1 } from "./types/domain.types";[0m
[38;2;255;255;255mimport { Type2 } from "./types/api.types";[0m
[38;2;255;255;255m```[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31mError Handling[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255mtry {[0m
[38;2;255;255;255m  const result = await operation();[0m
[38;2;255;255;255m  log.info("Success", { context });[0m
[38;2;255;255;255m  return result;[0m
[38;2;255;255;255m} catch (error) {[0m
[38;2;255;255;255m  log.error(error, "Operation failed", { context });[0m
[38;2;255;255;255m  throw new Error(`Failed: ${error.message}`);[0m
[38;2;255;255;255m}[0m
[38;2;255;255;255m```[0m

[1;38;2;255;255;255m---[0m

[38;2;253;151;31m##[0m[38;2;253;151;31m [0m[38;2;253;151;31mTesting[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31mEncore.ts Testing Workflow[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mCore Principle[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Always run tests via [0m[38;2;236;53;51m`[0m[38;2;236;53;51mencore test[0m[38;2;236;53;51m`[0m[38;2;255;255;255m (never direct vitest). Encore provisions optimized test databases with fsync disabled and in-memory filesystem for fast integration tests.[0m

[38;2;253;151;31m####[0m[38;2;253;151;31m [0m[38;2;253;151;31mSetup Requirements[0m

[38;2;255;255;255m1[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mvitest.config.ts[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m - Encore alias and parallel settings[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255mexport default defineConfig({[0m
[38;2;255;255;255m  resolve: {[0m
[38;2;255;255;255m    alias: {[0m
[38;2;255;255;255m      "~encore": path.resolve(__dirname, "./encore.gen"),[0m
[38;2;255;255;255m    },[0m
[38;2;255;255;255m  },[0m
[38;2;255;255;255m  test: {[0m
[38;2;255;255;255m    fileParallelism: false,  // Required for DB tests locally[0m
[38;2;255;255;255m    environment: "node",[0m
[38;2;255;255;255m    globals: true,[0m
[38;2;255;255;255m  },[0m
[38;2;255;255;255m});[0m
[38;2;255;255;255m```[0m

[38;2;255;255;255m2[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mpackage.json[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m - Test script[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mjson[0m
[38;2;255;255;255m{[0m
[38;2;255;255;255m  [0m[38;2;253;151;31m"[0m[38;2;253;151;31mscripts[0m[38;2;253;151;31m"[0m[38;2;255;255;255m:[0m[38;2;255;255;255m [0m[38;2;255;255;255m{[0m
[38;2;255;255;255m    [0m[38;2;253;151;31m"[0m[38;2;253;151;31mtest[0m[38;2;253;151;31m"[0m[38;2;255;255;255m:[0m[38;2;255;255;255m [0m[38;2;230;219;116m"[0m[38;2;230;219;116mvitest[0m[38;2;230;219;116m"[0m
[38;2;255;255;255m  [0m[38;2;255;255;255m}[0m
[38;2;255;255;255m}[0m
[38;2;255;255;255m```[0m

[38;2;255;255;255m3[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mRunning Tests[0m[1;38;2;249;38;114m**[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mbash[0m
[38;2;124;120;101m#[0m[38;2;124;120;101m Local (uses fileParallelism: false from config)[0m
[38;2;255;255;255mencore[0m[38;2;255;255;255m test[0m

[38;2;124;120;101m#[0m[38;2;124;120;101m CI (override for speed)[0m
[38;2;255;255;255mencore[0m[38;2;255;255;255m test[0m[38;2;253;151;31m --[0m[38;2;253;151;31mfileParallelism[0m[38;2;249;38;114m=[0m[38;2;255;255;255mtrue[0m

[38;2;124;120;101m#[0m[38;2;124;120;101m Specific files[0m
[38;2;255;255;255mencore[0m[38;2;255;255;255m test bookmarks/__tests__/bookmark.repository.test.ts[0m
[38;2;255;255;255m```[0m

[38;2;253;151;31m####[0m[38;2;253;151;31m [0m[38;2;253;151;31mHow to Write Tests[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mCall endpoints directly[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m (no HTTP required):[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255mimport { createBookmark, getBookmark } from "./api";[0m

[38;2;255;255;255mit("should create and fetch bookmark", async () => {[0m
[38;2;255;255;255m  const created = await createBookmark({ url, source, client_time });[0m
[38;2;255;255;255m  const fetched = await getBookmark({ id: created.id });[0m
[38;2;255;255;255m  expect(fetched.url).toBe(url);[0m
[38;2;255;255;255m});[0m
[38;2;255;255;255m```[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mService-to-service calls with auth override[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m:[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255mimport { usersTestClient } from "~encore/clients";[0m

[38;2;255;255;255mit("should return user profile", async () => {[0m
[38;2;255;255;255m  // Setup test data via repository[0m
[38;2;255;255;255m  await userRepo.create({ id, email, name });[0m

[38;2;255;255;255m  // Call service with auth override[0m
[38;2;255;255;255m  const result = await usersTestClient.me([0m
[38;2;255;255;255m    undefined,  // No request body[0m
[38;2;255;255;255m    {[0m
[38;2;255;255;255m      authData: { userID: id, email }  // Override auth[0m
[38;2;255;255;255m    }[0m
[38;2;255;255;255m  );[0m

[38;2;255;255;255m  expect(result.user.email).toBe(email);[0m
[38;2;255;255;255m});[0m
[38;2;255;255;255m```[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mMock external dependencies[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m (APIs, etc.):[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255m// At top of test file, before imports[0m
[38;2;255;255;255mvi.mock("@deepgram/sdk", () => ({[0m
[38;2;255;255;255m  createClient: vi.fn(() => ({[0m
[38;2;255;255;255m    listen: {[0m
[38;2;255;255;255m      prerecorded: {[0m
[38;2;255;255;255m        transcribeFile: mockTranscribeFile,[0m
[38;2;255;255;255m      },[0m
[38;2;255;255;255m    },[0m
[38;2;255;255;255m  })),[0m
[38;2;255;255;255m}));[0m
[38;2;255;255;255m```[0m

[38;2;253;151;31m####[0m[38;2;253;151;31m [0m[38;2;253;151;31mTesting Best Practices[0m

[38;2;255;255;255m1[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mNever mock Encore primitives globally[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m (log, database, etc.)[0m
[38;2;255;255;255m   [0m[38;2;119;119;119m-[0m[38;2;255;255;255m Mock only in specific tests that need to verify behavior[0m
[38;2;255;255;255m   [0m[38;2;119;119;119m-[0m[38;2;255;255;255m Use [0m[38;2;236;53;51m`[0m[38;2;236;53;51mvi.hoisted()[0m[38;2;236;53;51m`[0m[38;2;255;255;255m for test-specific mocks[0m

[38;2;255;255;255m2[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mDatabases are automatic[0m[1;38;2;249;38;114m**[0m
[38;2;255;255;255m   [0m[38;2;119;119;119m-[0m[38;2;255;255;255m Encore creates optimized test databases automatically[0m
[38;2;255;255;255m   [0m[38;2;119;119;119m-[0m[38;2;255;255;255m Migrations applied automatically[0m
[38;2;255;255;255m   [0m[38;2;119;119;119m-[0m[38;2;255;255;255m No manual setup needed[0m

[38;2;255;255;255m3[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mPub/Sub Testing[0m[1;38;2;249;38;114m**[0m
[38;2;255;255;255m   [0m[38;2;119;119;119m-[0m[38;2;255;255;255m Unit test: Export handler and call directly[0m
[38;2;255;255;255m   [0m[38;2;119;119;119m-[0m[38;2;255;255;255m Integration: Mock topic.publish() calls[0m
[38;2;255;255;255m   [0m[38;2;119;119;119m-[0m[38;2;255;255;255m Test processor logic, not Encore's pub/sub system[0m

[38;2;255;255;255m4[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mSecrets in Tests[0m[1;38;2;249;38;114m**[0m
[38;2;255;255;255m   [0m[38;2;119;119;119m-[0m[38;2;255;255;255m Set via [0m[38;2;236;53;51m`[0m[38;2;236;53;51mencore secret set --type local Key[0m[38;2;236;53;51m`[0m
[38;2;255;255;255m   [0m[38;2;119;119;119m-[0m[38;2;255;255;255m Or use [0m[38;2;236;53;51m`[0m[38;2;236;53;51m.secrets.local.cue[0m[38;2;236;53;51m`[0m[38;2;255;255;255m file[0m
[38;2;255;255;255m   [0m[38;2;119;119;119m-[0m[38;2;255;255;255m Encore validates secrets exist before tests run[0m

[38;2;255;255;255m5[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mVS Code Integration[0m[1;38;2;249;38;114m**[0m
[38;2;255;255;255m   [0m[38;2;119;119;119m-[0m[38;2;255;255;255m Set [0m[38;2;236;53;51m`[0m[38;2;236;53;51m"vitest.commandLine": "encore test"[0m[38;2;236;53;51m`[0m[38;2;255;255;255m in settings.json[0m
[38;2;255;255;255m   [0m[38;2;119;119;119m-[0m[38;2;255;255;255m Provide [0m[38;2;236;53;51m`[0m[38;2;236;53;51mENCORE_RUNTIME_LIB[0m[38;2;236;53;51m`[0m[38;2;255;255;255m in [0m[38;2;236;53;51m`[0m[38;2;236;53;51mvitest.nodeEnv[0m[38;2;236;53;51m`[0m[38;2;255;255;255m if needed[0m

[38;2;253;151;31m####[0m[38;2;253;151;31m [0m[38;2;253;151;31mCI Configuration[0m

[38;2;255;255;255m```[0m[38;2;190;132;255myaml[0m
[38;2;255;255;255m# .github/workflows/test.yml[0m
[38;2;255;255;255m- name: Run tests[0m
[38;2;255;255;255m  run: encore test --fileParallelism=true[0m

[38;2;255;255;255m# With coverage[0m
[38;2;255;255;255m- name: Run tests with coverage[0m
[38;2;255;255;255m  run: encore test --fileParallelism=true --coverage[0m
[38;2;255;255;255m```[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31m⚠️ CRITICAL: Test Architecture Principles[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mSee [0m[1;38;2;236;53;51m`[0m[1;38;2;236;53;51musers/__tests__/TESTING_ARCHITECTURE.md[0m[1;38;2;236;53;51m`[0m[1;38;2;249;38;114m for complete testing guide.[0m[1;38;2;249;38;114m**[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31mTest Layer Separation (MUST FOLLOW)[0m

[38;2;255;255;255mEncore.ts has [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mtransaction isolation[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m in test mode. Each service call runs in its own isolated transaction. This means:[0m

[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255m// ❌ WRONG - This will FAIL due to transaction isolation[0m
[38;2;255;255;255mawait userRepo.create({ id, email });  // Transaction A[0m
[38;2;255;255;255mconst result = await userApi.getMe(token);  // Transaction B (can't see A)[0m
[38;2;255;255;255m// Result: 404 - user not found![0m

[38;2;255;255;255m// ✅ CORRECT - Stay at one layer[0m
[38;2;255;255;255m// Option 1: All DB operations[0m
[38;2;255;255;255mawait userRepo.create({ id, email });[0m
[38;2;255;255;255mconst found = await userRepo.findById(id);  // Same transaction, works![0m

[38;2;255;255;255m// Option 2: All service calls[0m
[38;2;255;255;255mawait webhookApi.userCreated(payload);  // Service call commits[0m
[38;2;255;255;255mconst result = await userApi.getMe(token);  // Service call sees committed data[0m
[38;2;255;255;255m```[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31mTest Layers (Organized by Responsibility)[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mLayer 1: Repository Tests[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m - Database operations only[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255m// users/__tests__/user.repository.test.ts[0m
[38;2;255;255;255mdescribe("UserRepository", () => {[0m
[38;2;255;255;255m  it("should create and find user", async () => {[0m
[38;2;255;255;255m    const user = await userRepo.create({ id, email, name });[0m
[38;2;255;255;255m    const found = await userRepo.findById(id);[0m
[38;2;255;255;255m    expect(found).toBeDefined();[0m
[38;2;255;255;255m  });[0m
[38;2;255;255;255m});[0m
[38;2;255;255;255m```[0m
[38;2;255;255;255m✅ [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mPattern[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: All DB operations (no service calls)[0m
[38;2;255;255;255m✅ [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mPurpose[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Test data access layer[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mLayer 2: Webhook Tests[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m - External integration points[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255m// users/__tests__/webhooks.test.ts[0m
[38;2;255;255;255mdescribe("Webhook: userCreated", () => {[0m
[38;2;255;255;255m  it("should sync user from Supabase", async () => {[0m
[38;2;255;255;255m    const payload = createSupabasePayload({ id, email });[0m
[38;2;255;255;255m    const response = await webhookApi.userCreated(payload);[0m

[38;2;255;255;255m    expect(response.claims.local_db_synced).toBe(true);[0m
[38;2;255;255;255m    const user = await userRepo.findById(id);[0m
[38;2;255;255;255m    expect(user).toBeDefined();[0m
[38;2;255;255;255m  });[0m
[38;2;255;255;255m});[0m
[38;2;255;255;255m```[0m
[38;2;255;255;255m✅ [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mPattern[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Test the webhook endpoint itself[0m
[38;2;255;255;255m✅ [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mPurpose[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Test integration with external systems (Supabase)[0m
[38;2;255;255;255m❌ [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mNEVER[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Use webhooks to set up other tests (they're not test helpers!)[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mLayer 3: API Handler Tests[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m - Business logic[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255m// users/__tests__/api-handlers.test.ts[0m
[38;2;255;255;255mdescribe("API Handlers", () => {[0m
[38;2;255;255;255m  it("should return user profile", async () => {[0m
[38;2;255;255;255m    // Setup: Direct DB write (test fixture)[0m
[38;2;255;255;255m    await userRepo.create({ id, email, name });[0m

[38;2;255;255;255m    // Test: Call handler with mock auth[0m
[38;2;255;255;255m    const token = await generateTestJWT(id, email);[0m
[38;2;255;255;255m    const result = await usersTestClient.me([0m
[38;2;255;255;255m      undefined,[0m
[38;2;255;255;255m      createAuthOpts(token)[0m
[38;2;255;255;255m    );[0m

[38;2;255;255;255m    expect(result.user.email).toBe(email);[0m
[38;2;255;255;255m  });[0m
[38;2;255;255;255m});[0m
[38;2;255;255;255m```[0m
[38;2;255;255;255m✅ [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mPattern[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: DB setup + service call for testing[0m
[38;2;255;255;255m✅ [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mPurpose[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Test API business logic[0m
[38;2;255;255;255m✅ [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mKey[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Use [0m[38;2;236;53;51m`[0m[38;2;236;53;51mcreateAuthOpts()[0m[38;2;236;53;51m`[0m[38;2;255;255;255m to pass auth context[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mLayer 4: E2E Tests[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m - Critical production flows (minimal)[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255m// users/__tests__/e2e.test.ts[0m
[38;2;255;255;255mdescribe("E2E: User Lifecycle", () => {[0m
[38;2;255;255;255m  it("should handle signup → profile → update flow", async () => {[0m
[38;2;255;255;255m    // Simulate Supabase webhook[0m
[38;2;255;255;255m    await webhookApi.userCreated(payload);[0m

[38;2;255;255;255m    // User logs in and fetches profile[0m
[38;2;255;255;255m    const token = await generateTestJWT(id, email);[0m
[38;2;255;255;255m    const profile = await userApi.getMe(token);[0m

[38;2;255;255;255m    // User updates profile[0m
[38;2;255;255;255m    await userApi.updateMe({ name: "New" }, token);[0m

[38;2;255;255;255m    // Verify persistence[0m
[38;2;255;255;255m    const updated = await userApi.getMe(token);[0m
[38;2;255;255;255m    expect(updated.data.user.name).toBe("New");[0m
[38;2;255;255;255m  });[0m
[38;2;255;255;255m});[0m
[38;2;255;255;255m```[0m
[38;2;255;255;255m✅ [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mPattern[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: All service calls (webhook → API)[0m
[38;2;255;255;255m✅ [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mPurpose[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Test complete production workflows[0m
[38;2;255;255;255m✅ [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mKey[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Keep minimal (3-5 tests), test critical flows only[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31mCritical Testing Rules[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114m1. Never Mix Layers[0m[1;38;2;249;38;114m**[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255m// ❌ WRONG: Mixing DB and service calls[0m
[38;2;255;255;255mawait userRepo.create({ ... });  // DB operation[0m
[38;2;255;255;255mawait userApi.getMe(token);      // Service call[0m
[38;2;255;255;255m// → Transaction isolation breaks this![0m

[38;2;255;255;255m// ✅ CORRECT: Stay at one layer[0m
[38;2;255;255;255mawait userRepo.create({ ... });  // DB operation[0m
[38;2;255;255;255mawait userRepo.findById(id);     // DB operation[0m
[38;2;255;255;255m```[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114m2. Webhooks Are NOT Test Helpers[0m[1;38;2;249;38;114m**[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255m// ❌ WRONG: Using webhook for API test setup[0m
[38;2;255;255;255mawait webhookApi.userCreated(payload);  // External integration[0m
[38;2;255;255;255mawait userApi.updateMe({ name }, token);  // Testing API logic[0m
[38;2;255;255;255m// → Conflates concerns[0m

[38;2;255;255;255m// ✅ CORRECT: Use direct DB for API test setup[0m
[38;2;255;255;255mawait userRepo.create({ id, email });  // Test fixture[0m
[38;2;255;255;255mawait userApi.updateMe({ name }, token);  // Testing API logic[0m
[38;2;255;255;255m```[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114m3. Each Test Layer Has ONE Purpose[0m[1;38;2;249;38;114m**[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m [0m[38;2;255;255;255mRepository tests → Test data access[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Webhook tests → Test external integrations[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m API Handler tests → Test business logic[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m E2E tests → Test critical workflows[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31mRunning Tests[0m

[38;2;255;255;255m```[0m[38;2;190;132;255mbash[0m
[38;2;124;120;101m#[0m[38;2;124;120;101m Run all tests[0m
[38;2;255;255;255mencore[0m[38;2;255;255;255m test[0m

[38;2;124;120;101m#[0m[38;2;124;120;101m Run specific service tests[0m
[38;2;255;255;255mencore[0m[38;2;255;255;255m test users/__tests__/[0m
[38;2;255;255;255mencore[0m[38;2;255;255;255m test bookmarks/__tests__/[0m

[38;2;124;120;101m#[0m[38;2;124;120;101m Run specific test file[0m
[38;2;255;255;255mencore[0m[38;2;255;255;255m test users/__tests__/user.repository.test.ts[0m
[38;2;255;255;255mencore[0m[38;2;255;255;255m test users/__tests__/api-handlers.test.ts[0m

[38;2;124;120;101m#[0m[38;2;124;120;101m Type check before testing[0m
[38;2;255;255;255mnpx[0m[38;2;255;255;255m tsc[0m[38;2;253;151;31m --[0m[38;2;253;151;31mnoEmit[0m
[38;2;255;255;255m```[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31mBefore Committing[0m

[38;2;255;255;255m1[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[38;2;255;255;255m✅ Run [0m[38;2;236;53;51m`[0m[38;2;236;53;51mnpx tsc --noEmit[0m[38;2;236;53;51m`[0m[38;2;255;255;255m - Check TypeScript types[0m
[38;2;255;255;255m2[0m[38;2;119;119;119m.[0m[38;2;255;255;255m ✅ Run [0m[38;2;236;53;51m`[0m[38;2;236;53;51mencore test[0m[38;2;236;53;51m`[0m[38;2;255;255;255m - Verify all tests pass[0m
[38;2;255;255;255m3[0m[38;2;119;119;119m.[0m[38;2;255;255;255m ✅ Run [0m[38;2;236;53;51m`[0m[38;2;236;53;51mencore run[0m[38;2;236;53;51m`[0m[38;2;255;255;255m - Verify server starts[0m
[38;2;255;255;255m4[0m[38;2;119;119;119m.[0m[38;2;255;255;255m ✅ Check logs for warnings[0m
[38;2;255;255;255m5[0m[38;2;119;119;119m.[0m[38;2;255;255;255m ✅ Verify migrations apply cleanly[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31mManual Testing[0m

[38;2;255;255;255m```[0m[38;2;190;132;255mbash[0m
[38;2;124;120;101m#[0m[38;2;124;120;101m Create a bookmark[0m
[38;2;255;255;255mcurl[0m[38;2;253;151;31m -[0m[38;2;253;151;31mX[0m[38;2;255;255;255m POST http://localhost:4000/bookmarks [0m[38;2;255;255;255m\[0m
[38;2;253;151;31m  -[0m[38;2;253;151;31mH[0m[38;2;255;255;255m [0m[38;2;255;255;255m"[0m[38;2;230;219;116mContent-Type: application/json[0m[38;2;255;255;255m"[0m[38;2;255;255;255m [0m[38;2;255;255;255m\[0m
[38;2;253;151;31m  -[0m[38;2;253;151;31md[0m[38;2;255;255;255m [0m[38;2;255;255;255m'[0m[38;2;230;219;116m{[0m
[38;2;230;219;116m    "url": "https://youtube.com/watch?v=VIDEO_ID",[0m
[38;2;230;219;116m    "source": "youtube",[0m
[38;2;230;219;116m    "client_time": "2025-01-01T00:00:00Z"[0m
[38;2;230;219;116m  }[0m[38;2;255;255;255m'[0m

[38;2;124;120;101m#[0m[38;2;124;120;101m Check transcription status[0m
[38;2;255;255;255mpsql[0m[38;2;255;255;255m [0m[38;2;255;255;255m"[0m[38;2;255;255;255m$[0m[38;2;230;219;116m([0m[38;2;255;255;255mencore[0m[38;2;230;219;116m db conn-uri bookmarks[0m[38;2;230;219;116m)[0m[38;2;255;255;255m"[0m[38;2;253;151;31m -[0m[38;2;253;151;31mc[0m[38;2;255;255;255m [0m[38;2;255;255;255m"[0m
[38;2;230;219;116m  SELECT id, status, sentiment, sentiment_score[0m
[38;2;230;219;116m  FROM transcriptions[0m
[38;2;230;219;116m  ORDER BY created_at DESC[0m
[38;2;230;219;116m  LIMIT 5;[0m
[38;2;255;255;255m"[0m

[38;2;124;120;101m#[0m[38;2;124;120;101m Test user API[0m
[38;2;255;255;255mTOKEN[0m[38;2;249;38;114m=[0m[38;2;255;255;255m"[0m[38;2;230;219;116myour-jwt-token[0m[38;2;255;255;255m"[0m
[38;2;255;255;255mcurl[0m[38;2;253;151;31m -[0m[38;2;253;151;31mX[0m[38;2;255;255;255m GET http://localhost:4000/users/me [0m[38;2;255;255;255m\[0m
[38;2;253;151;31m  -[0m[38;2;253;151;31mH[0m[38;2;255;255;255m [0m[38;2;255;255;255m"[0m[38;2;230;219;116mAuthorization: Bearer [0m[38;2;255;255;255m$[0m[38;2;255;255;255mTOKEN[0m[38;2;255;255;255m"[0m
[38;2;255;255;255m```[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31mCommon Testing Mistakes[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mMistake 1[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Using webhooks for API test setup[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255m// ❌ WRONG[0m
[38;2;255;255;255mawait webhookApi.userCreated(payload);  // Webhook is external integration[0m
[38;2;255;255;255mconst response = await userApi.updateMe({ name }, token);[0m

[38;2;255;255;255m// ✅ CORRECT[0m
[38;2;255;255;255mawait userRepo.create({ id, email });  // Direct DB fixture[0m
[38;2;255;255;255mconst response = await userApi.updateMe({ name }, token);[0m
[38;2;255;255;255m```[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mMistake 2[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Mixing DB writes with service calls[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255m// ❌ WRONG - Transaction isolation[0m
[38;2;255;255;255mawait userRepo.create({ id, email });  // Transaction A[0m
[38;2;255;255;255mconst result = await userApi.getMe(token);  // Transaction B (404!)[0m

[38;2;255;255;255m// ✅ CORRECT - Stay at one layer[0m
[38;2;255;255;255mawait userRepo.create({ id, email });[0m
[38;2;255;255;255mconst found = await userRepo.findById(id);  // Same transaction[0m
[38;2;255;255;255m```[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mMistake 3[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Too many E2E tests[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mtypescript[0m
[38;2;255;255;255m// ❌ WRONG - E2E for every scenario[0m
[38;2;255;255;255mdescribe("E2E", () => {[0m
[38;2;255;255;255m  it("test scenario 1", ...);[0m
[38;2;255;255;255m  it("test scenario 2", ...);[0m
[38;2;255;255;255m  it("test scenario 3", ...);[0m
[38;2;255;255;255m  // ... 20 more tests[0m
[38;2;255;255;255m});[0m

[38;2;255;255;255m// ✅ CORRECT - E2E for critical flows only[0m
[38;2;255;255;255mdescribe("E2E", () => {[0m
[38;2;255;255;255m  it("complete user lifecycle", ...);  // Critical flow[0m
[38;2;255;255;255m  it("webhook idempotency", ...);      // Critical flow[0m
[38;2;255;255;255m  it("auth failures", ...);            // Critical flow[0m
[38;2;255;255;255m  // Keep to 3-5 tests[0m
[38;2;255;255;255m});[0m
[38;2;255;255;255m```[0m

[1;38;2;255;255;255m---[0m

[38;2;253;151;31m##[0m[38;2;253;151;31m [0m[38;2;253;151;31mKey Reminders[0m

[38;2;255;255;255m1[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mRead [0m[1;38;2;236;53;51m`[0m[1;38;2;236;53;51m/llm.txt[0m[1;38;2;236;53;51m`[0m[1;38;2;249;38;114m first[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m - Contains all Encore.ts patterns[0m
[38;2;255;255;255m2[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mUse all available tools[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m - Don't guess, verify[0m
[38;2;255;255;255m3[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mMulti-stage pipeline[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m - YouTube processing uses 3-stage Pub/Sub for fault tolerance[0m
[38;2;255;255;255m4[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mDeepgram uses plural keys[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m - [0m[38;2;236;53;51m`[0m[38;2;236;53;51msentiments[0m[38;2;236;53;51m`[0m[38;2;255;255;255m, [0m[38;2;236;53;51m`[0m[38;2;236;53;51mintents[0m[38;2;236;53;51m`[0m[38;2;255;255;255m, [0m[38;2;236;53;51m`[0m[38;2;236;53;51mtopics[0m[38;2;236;53;51m`[0m
[38;2;255;255;255m5[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mOpenAI Responses API[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m - Not Chat Completions[0m
[38;2;255;255;255m6[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mJSONB auto-serializes[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m - No [0m[38;2;236;53;51m`[0m[38;2;236;53;51mJSON.stringify()[0m[38;2;236;53;51m`[0m[38;2;255;255;255m needed[0m
[38;2;255;255;255m7[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mRepositories are simple[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m - Database operations only[0m
[38;2;255;255;255m8[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mEach stage persists data[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m - Store results immediately before publishing next event[0m
[38;2;255;255;255m9[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mConfig is centralized[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m - Never hardcode[0m
[38;2;255;255;255m10[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mTypes are organized[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m - Separate domain/API/external/events[0m
[38;2;255;255;255m11[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mOne file, one job[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m - Single Responsibility always[0m
[38;2;255;255;255m12[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mTest layer separation[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m - Never mix DB writes with service calls (transaction isolation)[0m
[38;2;255;255;255m13[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mWebhooks are integration points[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m - NOT test helpers[0m
[38;2;255;255;255m14[0m[38;2;119;119;119m.[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mEach test layer has ONE purpose[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m - Repository, Webhook, API Handler, E2E[0m

[1;38;2;255;255;255m---[0m

[38;2;253;151;31m##[0m[38;2;253;151;31m [0m[38;2;253;151;31mWhen to Use Which Tool[0m

[38;2;119;119;119m-[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mRead[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Check existing files, understand current implementation[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mGlob[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Find files by pattern ([0m[38;2;236;53;51m`[0m[38;2;236;53;51m**/*.ts[0m[38;2;236;53;51m`[0m[38;2;255;255;255m, [0m[38;2;236;53;51m`[0m[38;2;236;53;51m**/migrations/*.sql[0m[38;2;236;53;51m`[0m[38;2;255;255;255m)[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mGrep[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Search for usage, patterns across codebase[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mWebSearch[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Research APIs, check for updates, find best practices[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mWebFetch[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Get official documentation, API references[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mBash[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Verify structure, check database, run type checks[0m

[1;38;2;255;255;255m---[0m

[38;2;253;151;31m##[0m[38;2;253;151;31m [0m[38;2;253;151;31mEmergency Debugging[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31mServer won't start[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mbash[0m
[38;2;255;255;255mencore[0m[38;2;255;255;255m daemon restart    [0m[38;2;124;120;101m#[0m[38;2;124;120;101m Restart Encore daemon[0m
[38;2;255;255;255mencore[0m[38;2;255;255;255m run[0m[38;2;253;151;31m --[0m[38;2;253;151;31mdebug      [0m[38;2;124;120;101m#[0m[38;2;124;120;101m Run with debugging[0m
[38;2;255;255;255m```[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31mDatabase issues[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mbash[0m
[38;2;255;255;255mencore[0m[38;2;255;255;255m db reset bookmarks        [0m[38;2;124;120;101m#[0m[38;2;124;120;101m Reset database[0m
[38;2;255;255;255mencore[0m[38;2;255;255;255m db shell bookmarks        [0m[38;2;124;120;101m#[0m[38;2;124;120;101m Open psql shell[0m
[38;2;255;255;255m```[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31mType errors[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mbash[0m
[38;2;255;255;255mnpx[0m[38;2;255;255;255m tsc[0m[38;2;253;151;31m --[0m[38;2;253;151;31mnoEmit[0m[38;2;255;255;255m [0m[38;2;249;38;114m|[0m[38;2;255;255;255m [0m[38;2;255;255;255mgrep[0m[38;2;255;255;255m bookmarks  [0m[38;2;124;120;101m#[0m[38;2;124;120;101m Check TypeScript errors[0m
[38;2;255;255;255m```[0m

[38;2;253;151;31m###[0m[38;2;253;151;31m [0m[38;2;253;151;31mCheck logs[0m
[38;2;255;255;255m```[0m[38;2;190;132;255mbash[0m
[38;2;255;255;255mencore[0m[38;2;255;255;255m logs[0m[38;2;253;151;31m --[0m[38;2;253;151;31menv[0m[38;2;249;38;114m=[0m[38;2;255;255;255mlocal     [0m[38;2;124;120;101m#[0m[38;2;124;120;101m View application logs[0m
[38;2;255;255;255m```[0m

[1;38;2;255;255;255m---[0m

[38;2;253;151;31m##[0m[38;2;253;151;31m [0m[38;2;253;151;31mResources[0m

[38;2;119;119;119m-[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mEncore.ts Docs[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: [0m[4;38;2;166;226;46mhttps://encore.dev[0m[4;38;2;166;226;46m/docs/ts[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mDeepgram Docs[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: [0m[4;38;2;166;226;46mhttps://developers.deepgram.com[0m[4;38;2;166;226;46m/docs/[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mOpenAI Responses API[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: [0m[4;38;2;166;226;46mhttps://platform.openai.com[0m[4;38;2;166;226;46m/docs/api-reference/responses[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mProject llm.txt[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: [0m[38;2;236;53;51m`[0m[38;2;236;53;51m/llm.txt[0m[38;2;236;53;51m`[0m[38;2;255;255;255m (ALWAYS reference this first!)[0m

[1;38;2;255;255;255m---[0m

[38;2;253;151;31m##[0m[38;2;253;151;31m [0m[38;2;253;151;31mSummary: Golden Rules[0m

[38;2;255;255;255m✅ [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mDO:[0m[1;38;2;249;38;114m**[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m [0m[38;2;255;255;255mRead [0m[38;2;236;53;51m`[0m[38;2;236;53;51m/llm.txt[0m[38;2;236;53;51m`[0m[38;2;255;255;255m before coding Encore.ts features[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Use all available tools (Read, Grep, Glob, WebSearch, etc.)[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Follow established patterns in existing code[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Verify assumptions with tools, never guess[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Write modular code (SRP, DI, centralized config)[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Use structured logging with context[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Handle errors gracefully with specific messages[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Type everything properly, avoid [0m[38;2;236;53;51m`[0m[38;2;236;53;51many[0m[38;2;236;53;51m`[0m

[38;2;255;255;255m❌ [0m[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mDON'T:[0m[1;38;2;249;38;114m**[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m [0m[38;2;255;255;255mSkip reading existing code before changes[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Assume API structure without checking[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Hardcode configuration values[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Use deprecated APIs (Chat Completions, etc.)[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Double-stringify JSONB fields[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Mix concerns (business logic in repositories)[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Leave dead code or unused variables[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Use generic error messages[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Mix DB writes with service calls in tests (transaction isolation!)[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Use webhooks as test helpers (they're external integrations)[0m
[38;2;119;119;119m-[0m[38;2;255;255;255m Write too many E2E tests (keep to 3-5 critical flows)[0m

[1;38;2;249;38;114m**[0m[1;38;2;249;38;114mRemember[0m[1;38;2;249;38;114m**[0m[38;2;255;255;255m: Quality over speed. Understand first, code second. Use tools to verify everything.[0m

[38;2;248;248;242m**⚠️ CRITICAL: Frontend Repository Separation**[0m

[38;2;248;248;242mThe frontend directory is **NOT tracked** in this repository's git.[0m

[38;2;248;248;242m**Why:**[0m
[38;2;248;248;242m- Encore Cloud tries to compile ALL TypeScript files during backend builds[0m
[38;2;248;248;242m- Frontend uses Vite with `@vitejs/plugin-react` which aren't backend dependencies  [0m
[38;2;248;248;242m- Including frontend causes build failures: "unable to resolve module @vitejs/plugin-react"[0m

[38;2;248;248;242m**Solution:**[0m
[38;2;248;248;242m- Frontend is in `.gitignore` and excluded from git tracking[0m
[38;2;248;248;242m- Frontend deploys separately to Vercel (independent workflow)[0m
[38;2;248;248;242m- Backend and frontend are completely decoupled in version control[0m

[38;2;248;248;242m**DO NOT** add frontend back to git! Keep separation:[0m
[38;2;248;248;242m```bash[0m
[38;2;248;248;242m# Frontend remains local only[0m
[38;2;248;248;242mfrontend/  # ← in .gitignore[0m

[38;2;248;248;242m# Backend only in git[0m
[38;2;248;248;242mbookmarks/[0m
[38;2;248;248;242musers/[0m
[38;2;248;248;242mdaily_digest/[0m
[38;2;248;248;242m```[0m

[38;2;248;248;242mIf you need to track frontend changes, use a separate repository.[0m

[38;2;248;248;242m---[0m

