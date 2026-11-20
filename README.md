# AutoPatch — Autonomous Software Bug Detection and Repair System
> **INNOVEDGE Hackathon — Problem Statement 02**  
> *"Upload buggy code, understand the problem, review a focused fix, and see test results before accepting it."*

---

## 🌟 Vision & Key Principle

AutoPatch is an autonomous AI debugging assistant that **shows evidence that the fix works**.
- **Human-in-the-loop decision:** The human developer always makes the final decision (**Accept**, **Reject**, **Needs Review**, or **Roll Back**).
- **Workspace isolation:** The original project source code is **never modified automatically**. Patches are evaluated against an isolated, temporary session copy.
- **Honest verification:** Test runs report strictly separated statuses (**Verified**, **Failed**, or **Not Verified**). Pytest exit code 5 (no tests collected) is always marked **"Not Verified"**, never a pass.
- **Candidate labeling:** AI findings are explicitly labeled as **Candidates**, with confidence presented as an estimate rather than an empirical probability.

---

## 🏛️ The Eight Official Capabilities

1. **Code Analysis:** Workspace tree parsing, entry point detection, and dependency inspection.
2. **Bug Detection:** Tri-signal detection correlating static analysis (Ruff, Bandit, SpotBugs, Checkstyle), existing test failures (pytest, JUnit), and strict JSON AI heuristics.
3. **Root-Cause Analysis:** Pydantic-validated diagnostic schema outlining failure triggers, reproduction inputs, and expected vs. actual outcomes.
4. **Automatic Patch Generation:** Minimal atomic patch generation using unified diffs (`difflib`) with plain-language rationale.
5. **Testing & Validation:** 4-phase Docker sandbox matrix (pre-patch baseline, targeted bug test, boundary matrix, and full regression).
6. **Explanation & Review:** Side-by-side Monaco diff inspection with per-line change breakdowns and interactive "Ask AutoPatch AI" drawer.
7. **Bug Prioritization:** Smart severity tiering (Critical, High, Medium, Low) with written justifications and project health dashboards.
8. **Safe Change History:** Persistent SQLite audit trail recording all findings, diffs, test runs, and rollback decisions.

---

## 🔒 Security & Sandbox Boundary

> [!WARNING]
> **Production Boundary Note:** Default Docker containerization provides namespace and cgroup isolation (non-root user, read-only rootfs, network disabled, CPU/memory limits, output size caps). However, container runtimes do not constitute a full virtualization boundary against kernel privilege escalation. Truly untrusted multi-tenant execution requires **gVisor (`runsc`)** or **Firecracker microVMs**.
>
> In hackathon demonstrations, execution is performed strictly on trusted sample projects.

- **Host Secrets Protection:** API keys (`GEMINI_API_KEY`, `OPENAI_API_KEY`) are kept in environment variables on the trusted backend host process and are **never passed into the Docker sandbox**.
- **Archive Ingestion Protection:** Zip-slip path traversal guards, symlink stripping, file count thresholds, and 50MB uncompressed bomb limits.

---

## 🚀 Quickstart Guide

### 1. Frontend Development (React + 3D UI)

```powershell
cd frontend
npm install --legacy-peer-deps
npm run dev
```
Open **`http://localhost:5173`** in your browser.  
*(By default, `VITE_MOCK_MODE=true` is enabled in `frontend/.env.local`, allowing you to test the complete 3D interactive user interface immediately).*

To connect to the live Python backend:
Set `VITE_MOCK_MODE=false` in `frontend/.env.local` and restart Vite.

---

### 2. Backend API (FastAPI + Async SQLAlchemy)

```powershell
# From project root
pip install -r backend/requirements.txt

# Run the API server
uvicorn backend.api.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation & Swagger UI: **`http://localhost:8000/docs`**

---

### 3. Docker Compose (Full Stack)

```bash
docker compose up --build
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- SQLite Database: `data/autopatch.db`

---

## 🧪 Demo Data & Validation Moment

We include two sample projects with intentional defects:
- **Python:** `sample_projects/python_marks/` (`marks/calculator.py`)
- **Java:** `sample_projects/java_marks/` (`marks/Calculator.java`)

### The Demonstration:
Function `average_marks(marks)` returns `sum(marks) / len(marks)`:
- **Bug 1:** Empty list `[]` raises `ZeroDivisionError`.
- **Bug 2:** Accepts negative marks or marks > 100 without raising `ValueError`.

**Test Suite Behavior:**
```bash
cd sample_projects/python_marks
pytest tests/ -v
```
- **Before Patch:** 4 valid tests PASS; 4 invalid boundary tests **FAIL**.
- **After Patch:** All 8 tests **PASS** cleanly without regressions!
