# AutoPatch — System Architecture & Workflow Diagrams

---

## 1. Layered Architecture & Trust Boundaries

```mermaid
flowchart TD
    subgraph BROWSER["LAYER 0 · Presentation (Browser - Untrusted)"]
        UI_3D["3D Hero & Pipeline Rail\n(React Three Fiber)"]
        UI_DIFF["Monaco Diff Viewer"]
        UI_TABLE["Test Matrix (4 Phases)"]
        UI_HIST["Change History"]
        UI_CHAT["Ask AutoPatch AI Drawer"]
        ZUSTAND["Zustand Stores"]
        SSE_CLIENT["SSE Stream Client"]
        UI_3D & UI_DIFF & UI_TABLE & UI_HIST & UI_CHAT --> ZUSTAND
        ZUSTAND --> SSE_CLIENT
    end

    TB1["━━━ TRUST BOUNDARY 1 — Public Internet / Gateway ━━━"]

    subgraph GATEWAY["LAYER 1 · API Gateway (FastAPI - Trusted)"]
        GW_VAL["Input Validation\n(Pydantic v2)"]
        GW_ERR["Error Envelope\n{code, message, details}"]
        GW_SSE["SSE Telemetry\n/api/v1/jobs/{id}/events"]
        GW_VAL --> GW_ERR
    end

    subgraph SERVICES["LAYER 2 · Service Layer (Trusted Process)"]
        UPLOAD["Upload Service\nSecure Unzip · Zip-Slip Guard\nLanguage Auto-Detection"]
        ANALYZER["Project Analyzer\nTree Walk · Entry Point\nDeps & Test Discovery"]
        ORCH["Pipeline Orchestrator\nFSM State Transitions"]
        
        subgraph DETECT["Detection Engine"]
            RUFF["Ruff & Bandit (Python)"]
            SPOTBUGS["SpotBugs & javac (Java)"]
            PYTEST["pytest / JUnit Tests"]
            LLM_PLUGIN["AI Reasoner"]
        end

        NORM["Finding Normalizer\n(Candidate Tag & Clamping)"]
        LLM_GW["LLM Gateway\nGemini / OpenAI Provider\nJSON Schema & Cache"]
        PATCH["Patch Engine\nMinimal difflib unified diff"]
        SANDBOX["Sandbox Runner\n4-Phase Docker Runner"]
        VALID["Validation Engine\nVerified / Failed / Not Verified"]
        HISTORY["History Service\nAsync SQLite DB"]
    end

    TB2["━━━ TRUST BOUNDARY 2 — Sandbox Wall ━━━"]

    subgraph DOCKER["LAYER 3 · Docker Sandbox (Untrusted Execution)"]
        DOCKER_EXEC["Read-Only Staged Mount\nNon-Root (nobody) · Network Disabled\nCPU & RAM Limited"]
    end

    TB3["━━━ TRUST BOUNDARY 3 — External APIs ━━━"]

    subgraph EXT["LAYER 4 · External AI APIs"]
        GEMINI["Gemini 1.5 Flash / OpenAI\nKeys kept in host env only"]
    end

    BROWSER -->|HTTPS REST + SSE| TB1 --> GATEWAY
    GATEWAY --> UPLOAD --> ANALYZER --> ORCH
    ORCH --> DETECT
    RUFF & SPOTBUGS & PYTEST & LLM_PLUGIN --> NORM
    LLM_PLUGIN --> LLM_GW
    NORM --> PATCH --> SANDBOX
    SANDBOX -->|stdout/stderr stream| TB2 --> DOCKER_EXEC
    SANDBOX --> VALID --> HISTORY
    ORCH --> GW_SSE
    LLM_GW -->|HTTPS| TB3 --> GEMINI
```

---

## 2. Pipeline State Machine

```mermaid
stateDiagram-v2
    [*] --> UPLOADED : POST /projects (file/ZIP accepted)
    UPLOADED --> ANALYZED : Analyzer parses tree, deps & entry point
    ANALYZED --> SCANNING : Detectors launch across 3 signal sources
    SCANNING --> FINDINGS_READY : Linters, tests & AI normalized

    FINDINGS_READY --> PATCH_GENERATING : User requests patch proposal
    PATCH_GENERATING --> PATCH_READY : Minimal diff synthesized on temp copy

    PATCH_READY --> VALIDATING : POST /patches/{id}/validate
    VALIDATING --> VERIFIED : All 4 phases succeed (exit code 0)
    VALIDATING --> FAILED : Test assertion errors encountered
    VALIDATING --> NOT_VERIFIED : Exit 5 (no tests), timeout, or compile error

    FAILED --> PATCH_GENERATING : Feedback retry (max 3 attempts)
    NOT_VERIFIED --> PATCH_GENERATING : Retry with failure feedback

    VERIFIED --> ACCEPTED : Developer commits accept
    VERIFIED --> REJECTED : Developer rejects patch
    VERIFIED --> NEEDS_REVIEW : Developer flags for review

    ACCEPTED --> ROLLED_BACK : Developer triggers rollback
    ROLLED_BACK --> [*]
    REJECTED --> [*]
    NEEDS_REVIEW --> [*]
```

---

## 3. Entity-Relationship Diagram (SQLAlchemy Models)

```mermaid
erDiagram
    projects {
        string id PK
        string name
        string language
        string root_path
        datetime created_at
    }

    scans {
        string id PK
        string project_id FK
        string status
        string job_id
        json tool_versions
        datetime started_at
        datetime finished_at
    }

    findings {
        string id PK
        string scan_id FK
        string file
        int line_start
        int line_end
        string title
        text description
        text trigger
        text repro_input
        text expected
        text actual
        text root_cause
        string source
        string severity
        text severity_reason
        float confidence_estimate
        boolean is_candidate
        string status
    }

    patches {
        string id PK
        string finding_id FK
        text diff
        text explanation
        int attempt
        json line_changes
        datetime created_at
    }

    test_runs {
        string id PK
        string patch_id FK
        string phase
        int exit_code
        int passed
        int failed
        string status
        text reason
        text raw_output
        int duration_ms
    }

    decisions {
        string id PK
        string patch_id FK
        string decision
        text note
        datetime decided_at
    }

    chat_messages {
        string id PK
        string finding_id FK
        string role
        text content
        datetime created_at
    }

    projects ||--o{ scans : "has"
    scans ||--o{ findings : "contains"
    findings ||--o{ patches : "has"
    findings ||--o{ chat_messages : "discussed in"
    patches ||--o{ test_runs : "tested by"
    patches ||--o| decisions : "decided via"
```

---

## 4. End-to-End Bug → Patch → Verify Sequence

```mermaid
sequenceDiagram
    actor Dev as Developer
    participant UI as Frontend (React / 3D)
    participant GW as FastAPI Gateway
    participant DE as Detection Engine
    participant LLM as LLM Gateway
    participant PE as Patch Engine
    participant SR as Sandbox Runner (Docker)
    participant DB as SQLite Database

    Dev->>UI: Upload ZIP or single source file
    UI->>GW: POST /api/v1/projects (multipart)
    GW->>GW: Sanitize, verify Zip-Slip, detect language
    GW->>DB: INSERT project record
    GW-->>UI: 201 { project_id, tree }

    Dev->>UI: Click "Start Bug Detection"
    UI->>GW: POST /api/v1/projects/{id}/scan
    GW->>DB: INSERT scan (status=SCANNING)
    GW-->>UI: 202 { job_id, stream_url }

    UI->>GW: GET /api/v1/jobs/{job_id}/events (SSE open)
    par Signal Sources
        GW->>DE: Run Static Analyzers (Ruff, Bandit, SpotBugs)
        and
        GW->>DE: Run Existing Tests (pytest, JUnit)
        and
        GW->>LLM: Run AI Heuristic Diagnostics
    end

    DE->>DB: INSERT normalized findings
    GW-->>UI: SSE job.findings_ready { total, critical_count }

    Dev->>UI: Select finding, click "Synthesize Minimal Patch"
    UI->>GW: POST /api/v1/findings/{id}/patch
    GW->>PE: Synthesize minimal unified diff
    PE->>DB: INSERT patch (attempt=1)
    GW-->>UI: 201 { patch_id, diff, line_changes }

    Dev->>UI: Review diff & click "Run Validation"
    UI->>GW: POST /api/v1/patches/{id}/validate
    
    loop 4 Phases: Baseline, Targeted, Boundary, Regression
        GW->>SR: docker run --rm --network none --read-only ...
        SR-->>GW: exit_code, stdout, duration
        GW->>DB: INSERT test_run record
        GW-->>UI: SSE job.test_phase { phase, status }
    end

    GW-->>UI: 200 { overall_status: "verified", phases }

    Dev->>UI: Click "Accept Patch"
    UI->>GW: POST /api/v1/patches/{id}/decision { decision: "accept" }
    GW->>DB: INSERT decision record (audit trail)
    GW-->>UI: 200 { download_url }
```
