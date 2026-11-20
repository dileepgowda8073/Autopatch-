import io
import zipfile
import pytest
from pathlib import Path
from backend.core.security import (
    validate_and_extract_zip,
    sanitize_filename,
    is_safe_path,
)
from backend.core.errors import SecurityViolationError
from backend.services.upload.upload_service import detect_project_language
from backend.services.analyzer.project_analyzer import (
    build_directory_tree,
    detect_entry_point,
    discover_test_files,
    parse_dependencies,
)


def test_sanitize_filename():
    assert sanitize_filename("safe/path/file.py") == "safe/path/file.py"
    assert sanitize_filename("../../../etc/passwd") == "etc/passwd"
    assert sanitize_filename("..\\..\\windows\\system32") == "windows/system32"
    assert sanitize_filename("/absolute/path.py") == "absolute/path.py"


def test_is_safe_path(tmp_path: Path):
    base = tmp_path / "workspace"
    base.mkdir()

    safe_target = base / "src" / "main.py"
    assert is_safe_path(base, safe_target) is True

    unsafe_target = tmp_path / "outside.py"
    assert is_safe_path(base, unsafe_target) is False


def test_zip_slip_prevention(tmp_path: Path):
    dest = tmp_path / "extracted"
    zip_path = tmp_path / "evil.zip"

    # Create zip with zip-slip entry
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("../../evil.sh", "echo owned")
    zip_path.write_bytes(buf.getvalue())

    # Should raise SecurityViolationError or sanitize safely within dest
    # In our implementation sanitize_filename removes .., but if raw traversal occurs is_safe_path catches it
    extracted = validate_and_extract_zip(zip_path, dest)
    for p in extracted:
        assert dest in p.parents or dest == p


def test_language_detection(tmp_path: Path):
    # Python workspace
    py_ws = tmp_path / "py_ws"
    py_ws.mkdir()
    (py_ws / "main.py").write_text("print('hello')", encoding="utf-8")
    (py_ws / "requirements.txt").write_text("pytest", encoding="utf-8")
    res_py = detect_project_language(py_ws)
    assert res_py == "python"
    assert res_py.language == "python"
    assert isinstance(res_py.confidence, float)
    assert res_py.confidence == 1.0
    assert isinstance(res_py.reasons, list)
    assert any("requirements.txt" in r for r in res_py.reasons)
    assert any("Python source" in r for r in res_py.reasons)

    # Java workspace
    java_ws = tmp_path / "java_ws"
    java_ws.mkdir()
    (java_ws / "pom.xml").write_text("<project></project>", encoding="utf-8")
    (java_ws / "Main.java").write_text("public class Main {}", encoding="utf-8")
    res_java = detect_project_language(java_ws)
    assert res_java == "java"
    assert res_java.language == "java"
    assert isinstance(res_java.confidence, float)
    assert res_java.confidence == 1.0
    assert isinstance(res_java.reasons, list)
    assert any("pom.xml" in r for r in res_java.reasons)
    assert any("Java source" in r for r in res_java.reasons)


def test_project_analyzer(tmp_path: Path):
    ws = tmp_path / "sample"
    ws.mkdir()
    (ws / "main.py").write_text("if __name__ == '__main__': pass", encoding="utf-8")
    (ws / "requirements.txt").write_text("requests==2.31.0\npytest>=8.0\n", encoding="utf-8")

    tests_dir = ws / "tests"
    tests_dir.mkdir()
    (tests_dir / "test_main.py").write_text("def test_ok(): pass", encoding="utf-8")

    # Tree
    tree = build_directory_tree(ws, ws)
    assert len(tree) >= 2

    # Entry point
    entry = detect_entry_point(ws, "python")
    assert entry == "main.py"

    # Tests
    tests = discover_test_files(ws)
    assert "tests/test_main.py" in tests

    # Deps
    deps = parse_dependencies(ws)
    assert "requests==2.31.0" in deps
    assert "pytest>=8.0" in deps
