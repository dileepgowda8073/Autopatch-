# AutoPatch Security Architecture & Isolation Model

AutoPatch executes developer-submitted source code and automated test suites. Because user-supplied code is inherently untrusted, the platform enforces strict layered defense mechanisms.

---

## 1. Trust Boundaries

```
[ UNTRUSTED ]
- Uploaded archives (.zip)
- User source files (.py, .java)
- Test suite files
- LLM outputs (treated strictly as un-executed raw data)

────── Boundary 1: API Gateway (Sanitization & Pydantic Validation) ──────

[ TRUSTED ]
- FastAPI backend process
- SQLite database (`data/autopatch.db`)
- Host environment secrets (`GEMINI_API_KEY`, `OPENAI_API_KEY`)

────── Boundary 2: Ephemeral Sandbox Isolation ──────

[ CONFINED UNTRUSTED ]
- Disposable Docker test execution environment
```

---

## 2. Archive & Ingestion Defense

Every incoming file or ZIP archive is subjected to deterministic sanitization:
1. **Zip-Slip Prevention:** Target paths are resolved and verified against the temporary session directory (`is_safe_path`). Any entry attempting traversal (`../` or absolute paths) is rejected with `SecurityViolationError`.
2. **Symlink Stripping:** Symbolic link entries (UNIX mode `0o120000`) are rejected immediately to prevent symlink traversal to host files.
3. **Zip-Bomb Protection:** Total uncompressed byte threshold is capped at 200MB, and maximum file count is capped at 500 entries.
4. **Filename Sanitization:** All filenames are sanitized to prevent shell injection or control-character exploitation.

---

## 3. Ephemeral Sandbox Execution

All test commands (`pytest`, `mvn test`) run inside disposable Docker containers with tight constraints:
- **Zero Network Access:** Container is launched with `--network none`.
- **Read-Only Root Filesystem:** Root filesystem is mounted read-only (`--read-only`).
- **Non-Root Execution:** Code runs under the unprivileged `nobody` user (`--user nobody`).
- **No Privileges:** Launched with `--security-opt=no-new-privileges` and without `--privileged`.
- **Resource Limits:** CPU shares capped at 0.5 cores; memory capped at 256MB.
- **Timeouts & Output Caps:** Executions timeout after 120 seconds; captured logs are capped at 1MB per phase.
- **Ephemeral Lifecycle:** Containers are destroyed immediately upon test completion (`--rm`).

---

## 4. Production Security Boundary Disclosure

> [!WARNING]
> Standard Linux containerization (Docker/cgroups) shares the host kernel. While suitable for hackathon demonstrations on trusted sample projects, container runtimes do not constitute a cryptographic hardware boundary against kernel vulnerabilities.
> 
> In a production multi-tenant deployment processing arbitrary untrusted third-party code, AutoPatch's `SandboxRunner` interface is designed to be backed by **gVisor (`runsc`)** or **Firecracker microVMs**.
