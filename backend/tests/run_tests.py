"""Standalone automated async test runner for NETLAB AI backend services."""

import asyncio
import os
import sys
import time

# Ensure pure Python execution to prevent Windows AppLocker policy blocks on cython modules
os.environ["DISABLE_SQLALCHEMY_CEXT"] = "1"
os.environ["APP_ENV"] = "test"

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from httpx import AsyncClient, ASGITransport
from app.core.database import init_db
from app.main import app
import tests.test_api as suite


async def run_all_tests():
    print("=" * 65)
    print("       NETLAB AI - Automated Test Suite & Quality Verification")
    print("=" * 65)

    await init_db()
    transport = ASGITransport(app=app)

    test_funcs = [
        ("test_health_endpoints", suite.test_health_endpoints),
        ("test_dashboard_endpoint", suite.test_dashboard_endpoint),
        ("test_device_crud_lifecycle", suite.test_device_crud_lifecycle),
        ("test_topology_sync_lifecycle", suite.test_topology_sync_lifecycle),
        ("test_execution_modes", suite.test_execution_modes),
        ("test_configuration_engine", suite.test_configuration_engine),
        ("test_pcap_dissection", suite.test_pcap_dissection),
        ("test_security_analyzer", suite.test_security_analyzer),
        ("test_academy_and_interview", suite.test_academy_and_interview),
        ("test_documentation_and_reports", suite.test_documentation_and_reports),
        ("test_multivendor_syntax_translation", suite.test_multivendor_syntax_translation),
        ("test_iac_topology_exports", suite.test_iac_topology_exports),
        ("test_automated_lab_grading", suite.test_automated_lab_grading),
        ("test_preflight_compliance_check", suite.test_preflight_compliance_check),
        ("test_copilot_autonomous_investigation", suite.test_copilot_autonomous_investigation),
        ("test_network_analytics_endpoint", suite.test_network_analytics_endpoint),
        ("test_bgp_looking_glass_overview_and_trace", suite.test_bgp_looking_glass_overview_and_trace),
        ("test_rbac_user_management", suite.test_rbac_user_management),
        ("test_config_rollback_and_golden", suite.test_config_rollback_and_golden),
        ("test_executive_dossier", suite.test_executive_dossier),
    ]

    passed = 0
    failed = 0

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        for name, func in test_funcs:
            t0 = time.perf_counter()
            try:
                await func(client)
                dur = (time.perf_counter() - t0) * 1000
                print(f"  [PASS] {name:<35} ({dur:.1f}ms)")
                passed += 1
            except Exception as e:
                dur = (time.perf_counter() - t0) * 1000
                print(f"  [FAIL] {name:<35} ({dur:.1f}ms) -> {e}")
                import traceback
                traceback.print_exc()
                failed += 1

    print("-" * 65)
    print(f"Results: {passed} passed, {failed} failed | Total: {len(test_funcs)}")
    print("=" * 65)

    if failed > 0:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(run_all_tests())

