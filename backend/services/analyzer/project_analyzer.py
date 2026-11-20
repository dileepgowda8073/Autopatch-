import re
from pathlib import Path
from backend.core.security import IGNORED_DIRS
from backend.schemas.project import TreeNode, ProjectTreeOut


def build_directory_tree(dir_path: Path, base_path: Path) -> list[TreeNode]:
    """Recursively construct hierarchical TreeNode list ignoring build artifacts."""
    nodes: list[TreeNode] = []

    try:
        entries = sorted(list(dir_path.iterdir()), key=lambda e: (not e.is_dir(), e.name.lower()))
    except (PermissionError, FileNotFoundError):
        return nodes

    for entry in entries:
        if entry.name in IGNORED_DIRS or entry.name.startswith("."):
            continue

        rel_path = str(entry.relative_to(base_path)).replace("\\", "/")

        if entry.is_dir():
            children = build_directory_tree(entry, base_path)
            nodes.append(
                TreeNode(
                    path=rel_path,
                    type="dir",
                    children=children,
                )
            )
        else:
            nodes.append(
                TreeNode(
                    path=rel_path,
                    type="file",
                    size_bytes=entry.stat().st_size,
                )
            )

    return nodes


def detect_entry_point(root_dir: Path, language: str) -> str | None:
    """Heuristic resolution of project entry point file."""
    candidates: list[str] = []

    if language == "python":
        candidates = [
            "main.py",
            "app.py",
            "run.py",
            "cli.py",
            "src/main.py",
            "src/app.py",
        ]
    elif language == "java":
        candidates = [
            "src/main/java/Main.java",
            "src/main/java/App.java",
            "Main.java",
            "App.java",
        ]

    for cand in candidates:
        if (root_dir / cand).exists():
            return cand

    # Fallback: scan for any file containing `if __name__ == '__main__':` or `public static void main`
    for path in root_dir.rglob("*.py"):
        if any(ign in path.parts for ign in IGNORED_DIRS):
            continue
        try:
            content = path.read_text(encoding="utf-8", errors="ignore")
            if "if __name__ == '__main__':" in content or 'if __name__ == "__main__":' in content:
                return str(path.relative_to(root_dir)).replace("\\", "/")
        except Exception:
            pass

    for path in root_dir.rglob("*.java"):
        if any(ign in path.parts for ign in IGNORED_DIRS):
            continue
        try:
            content = path.read_text(encoding="utf-8", errors="ignore")
            if "public static void main" in content:
                return str(path.relative_to(root_dir)).replace("\\", "/")
        except Exception:
            pass

    return None


def discover_test_files(root_dir: Path) -> list[str]:
    """Find all pytest and JUnit test files."""
    test_files: list[str] = []

    for path in root_dir.rglob("*"):
        if any(ign in path.parts for ign in IGNORED_DIRS) or not path.is_file():
            continue

        name = path.name.lower()
        if (
            name.startswith("test_")
            or name.endswith("_test.py")
            or name.endswith("test.java")
            or name.endswith("tests.java")
        ):
            test_files.append(str(path.relative_to(root_dir)).replace("\\", "/"))

    return sorted(test_files)


def parse_dependencies(root_dir: Path) -> list[str]:
    """Extract package requirements from requirements.txt or pom.xml."""
    deps: list[str] = []

    req_txt = root_dir / "requirements.txt"
    if req_txt.exists():
        for line in req_txt.read_text(encoding="utf-8", errors="ignore").splitlines():
            clean = line.strip()
            if clean and not clean.startswith("#"):
                deps.append(clean)

    pom_xml = root_dir / "pom.xml"
    if pom_xml.exists():
        content = pom_xml.read_text(encoding="utf-8", errors="ignore")
        # Extract <artifactId> inside <dependency> blocks
        artifacts = re.findall(r"<artifactId>([^<]+)</artifactId>", content)
        for art in artifacts:
            deps.append(art.strip())

    return deps


def analyze_project_workspace(project_id: str, root_path: Path, language: str) -> ProjectTreeOut:
    """Full architectural analysis of an extracted project workspace."""
    tree = build_directory_tree(root_path, root_path)
    entry_point = detect_entry_point(root_path, language)
    test_files = discover_test_files(root_path)
    deps = parse_dependencies(root_path)

    # Count source files
    source_count = 0
    for p in root_path.rglob("*"):
        if p.is_file() and not any(ign in p.parts for ign in IGNORED_DIRS):
            if p.suffix.lower() in {".py", ".java"}:
                source_count += 1

    return ProjectTreeOut(
        project_id=project_id,
        language=language,
        entry_point=entry_point,
        tree=tree,
        source_file_count=source_count,
        test_files=test_files,
        dependencies=deps,
        missing_dependencies=[],
    )
