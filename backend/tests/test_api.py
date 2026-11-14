"""Comprehensive end-to-end API test suite covering all modules."""

try:
    import pytest
    pytestmark = pytest.mark.asyncio
except ImportError:
    pass


async def test_health_endpoints(client):
    res = await client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"

    res_v1 = await client.get("/api/v1/health")
    assert res_v1.status_code == 200


async def test_dashboard_endpoint(client):
    res = await client.get("/api/v1/dashboard")
    assert res.status_code == 200
    data = res.json()
    assert "stats" in data
    assert "total_labs" in data["stats"]
    assert "total_devices" in data["stats"]


async def test_device_crud_lifecycle(client):
    # 1. Create a device
    dev_payload = {
        "name": "Test-Core-R1",
        "device_type": "router",
        "vendor": "cisco",
        "platform": "IOSv",
        "management_ip": "10.10.10.1",
    }
    create_res = await client.post("/api/v1/devices", json=dev_payload)
    assert create_res.status_code == 201
    dev = create_res.json()
    assert dev["name"] == "Test-Core-R1"
    dev_id = dev["id"]

    # 2. Get device details
    get_res = await client.get(f"/api/v1/devices/{dev_id}")
    assert get_res.status_code == 200
    detail = get_res.json()
    assert detail["id"] == dev_id
    assert len(detail["interfaces"]) >= 1

    # 3. List devices
    list_res = await client.get("/api/v1/devices")
    assert list_res.status_code == 200
    assert any(d["id"] == dev_id for d in list_res.json())

    # 4. Clean up / Delete device
    del_res = await client.delete(f"/api/v1/devices/{dev_id}")
    assert del_res.status_code == 200


async def test_topology_sync_lifecycle(client):
    topo_payload = {
        "name": "Automated-Test-Topology",
        "description": "Integration test topology",
        "topology_json": '{"nodes":[{"id":"R1","data":{"label":"R1","type":"router"},"position":{"x":100,"y":100}},{"id":"SW1","data":{"label":"SW1","type":"switch"},"position":{"x":300,"y":100}}],"edges":[{"source":"R1","target":"SW1"}]}',
    }
    create_res = await client.post("/api/v1/topologies", json=topo_payload)
    assert create_res.status_code == 201
    topo = create_res.json()
    assert topo["name"] == "Automated-Test-Topology"
    topo_id = topo["id"]

    # Retrieve topology
    get_res = await client.get(f"/api/v1/topologies/{topo_id}")
    assert get_res.status_code == 200

    # Delete topology
    del_res = await client.delete(f"/api/v1/topologies/{topo_id}")
    assert del_res.status_code == 200


async def test_execution_modes(client):
    # 1. Learning Mode (Explanation only, not executed)
    learn_res = await client.post(
        "/api/v1/executions",
        json={"device_id": 1, "commands": ["router ospf 1", "network 10.0.0.0 0.0.0.255 area 0"], "mode": "learning"},
    )
    assert learn_res.status_code == 200
    learn_data = learn_res.json()
    assert learn_data["executed"] is False
    assert len(learn_data["results"]) == 2
    assert "Learning Mode" in learn_data["explanation"]

    # 2. Assisted Mode (Requires approval for destructive/high-risk command)
    assist_res = await client.post(
        "/api/v1/executions",
        json={"device_id": 1, "commands": ["reload"], "mode": "assisted", "confirmed": False},
    )
    assert assist_res.status_code == 200
    assist_data = assist_res.json()
    assert assist_data["requires_approval"] is True
    assert "High-risk command detected" in assist_data["warning"]

    # 3. Autonomous Mode (Executes commands)
    auto_res = await client.post(
        "/api/v1/executions",
        json={"device_id": 1, "commands": ["show ip int brief"], "mode": "autonomous"},
    )
    assert auto_res.status_code == 200
    auto_data = auto_res.json()
    assert auto_data["executed"] is True
    assert "Interface" in auto_data["results"][0]["output"]


async def test_configuration_engine(client):
    # 1. Validate syntax
    val_res = await client.post(
        "/api/v1/configurations/validate",
        json={"config_text": "interface GigabitEthernet0/0\n ip address 10.0.0.1 255.255.255.0\n no shutdown"},
    )
    assert val_res.status_code == 200
    assert val_res.json()["valid"] is True

    # 2. Compute diff
    diff_res = await client.post(
        "/api/v1/configurations/diff",
        json={"source_text": "hostname R1\n", "target_text": "hostname R1\ninterface Gi0/0\n"},
    )
    assert diff_res.status_code == 200
    assert diff_res.json()["added_count"] >= 1


async def test_pcap_dissection(client):
    res = await client.get("/api/v1/packets/sample/ospf")
    assert res.status_code == 200
    data = res.json()
    assert data["total_packets"] >= 1
    assert "OSPF" in data["protocols"]


async def test_security_analyzer(client):
    insecure_config = "hostname R1\nline vty 0 4\n transport input telnet\n login\n!"
    res = await client.post("/api/v1/security/audit", json={"config_text": insecure_config})
    assert res.status_code == 200
    data = res.json()
    assert data["total_issues"] >= 1
    assert any("Telnet" in i["title"] for i in data["issues"])


async def test_academy_and_interview(client):
    trks = await client.get("/api/v1/learning/tracks")
    assert trks.status_code == 200
    assert len(trks.json()) >= 1

    less = await client.get("/api/v1/learning/lessons")
    assert less.status_code == 200
    assert len(less.json()) >= 1

    qs = await client.get("/api/v1/assessments/questions")
    assert qs.status_code == 200
    assert len(qs.json()) >= 1

    iqs = await client.get("/api/v1/assessments/interview/questions")
    assert iqs.status_code == 200
    assert len(iqs.json()) >= 1


async def test_documentation_and_reports(client):
    doc_res = await client.get("/api/v1/reports/documentation/1")
    assert doc_res.status_code == 200
    assert "Architecture Documentation" in doc_res.json()["title"]

    audit_res = await client.get("/api/v1/reports/audit-logs")
    assert audit_res.status_code == 200


async def test_multivendor_syntax_translation(client):
    cisco_snippet = (
        "hostname R1\n"
        "interface GigabitEthernet0/0\n"
        " ip address 10.1.1.1 255.255.255.0\n"
        "ip route 0.0.0.0 0.0.0.0 10.1.1.254\n"
    )
    # Translate to Juniper JunOS
    junos_res = await client.post(
        "/api/v1/configurations/translate",
        json={"source_vendor": "cisco_ios", "target_vendor": "juniper_junos", "config_text": cisco_snippet},
    )
    assert junos_res.status_code == 200
    junos_data = junos_res.json()
    assert "set system host-name R1" in junos_data["translated_config"] or "juniper" in junos_data["target_vendor"]

    # Translate to Linux
    linux_res = await client.post(
        "/api/v1/configurations/translate",
        json={"source_vendor": "cisco_ios", "target_vendor": "linux_iproute2", "config_text": cisco_snippet},
    )
    assert linux_res.status_code == 200
    assert "ip addr add" in linux_res.json()["translated_config"] or "ip route" in linux_res.json()["translated_config"]


async def test_iac_topology_exports(client):
    # 1. Create a test topology
    topo_payload = {
        "name": "IaC-Export-Topology",
        "description": "Integration test topology for IaC",
        "topology_json": '{"nodes":[{"id":"R1","data":{"label":"R1","type":"router"},"position":{"x":100,"y":100}},{"id":"SW1","data":{"label":"SW1","type":"switch"},"position":{"x":300,"y":100}}],"edges":[{"source":"R1","target":"SW1"}]}',
    }
    create_res = await client.post("/api/v1/topologies", json=topo_payload)
    assert create_res.status_code == 201
    tid = create_res.json()["id"]

    # Ansible export
    ans_res = await client.get(f"/api/v1/topologies/{tid}/export/ansible")
    assert ans_res.status_code == 200
    assert "all:" in ans_res.json()["content"]

    # Terraform export
    tf_res = await client.get(f"/api/v1/topologies/{tid}/export/terraform")
    assert tf_res.status_code == 200
    assert "terraform {" in tf_res.json()["content"]

    # EVE-NG XML export
    eve_res = await client.get(f"/api/v1/topologies/{tid}/export/eve-unl")
    assert eve_res.status_code == 200
    assert "<lab" in eve_res.json()["content"]

    # Netmiko python script export
    net_res = await client.get(f"/api/v1/topologies/{tid}/export/netmiko")
    assert net_res.status_code == 200
    assert "ConnectHandler" in net_res.json()["content"]

    # Cleanup
    del_res = await client.delete(f"/api/v1/topologies/{tid}")
    assert del_res.status_code == 200


async def test_automated_lab_grading(client):
    good_config = (
        "hostname R1-Core\n"
        "interface GigabitEthernet0/0\n"
        " ip address 10.10.10.1 255.255.255.0\n"
        " no shutdown\n"
        "router ospf 1\n"
        " router-id 1.1.1.1\n"
        " network 10.10.10.0 0.0.0.255 area 0\n"
        " default-information originate\n"
        "ip route 0.0.0.0 0.0.0.0 203.0.113.2\n"
        "service password-encryption\n"
        "line vty 0 4\n"
        " transport input ssh\n"
    )
    res = await client.post(
        "/api/v1/assessments/grade-lab",
        json={
            "task_title": "Enterprise OSPF & Hardening",
            "device_name": "R1-Core",
            "config_text": good_config,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["score_percent"] >= 70.0
    assert data["passed"] is True
    assert len(data["evaluation_breakdown"]) == 5


async def test_preflight_compliance_check(client):
    req_payload = {
        "nodes": [
            {"id": "R1", "data": {"label": "R1", "ip": "10.10.10.1/24"}},
            {"id": "R2", "data": {"label": "R2", "ip": "10.10.10.1/24"}},  # Duplicate IP
        ],
        "edges": [],
        "configurations": {"R1": "hostname R1\nline vty 0 4\n transport input telnet\n"},
    }
    res = await client.post("/api/v1/verification/preflight", json=req_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["health_score"] < 100
    assert any(f["category"] == "IP_CONFLICT" for f in data["findings"])
    assert any(f["category"] == "SECURITY_VULNERABILITY" for f in data["findings"])


async def test_copilot_autonomous_investigation(client):
    res = await client.post(
        "/api/v1/ai/copilot/investigate",
        json={
            "problem_statement": "OSPF neighbor adjacency stuck in EXSTART state due to MTU",
            "target_device_id": 1,
            "device_name": "R1-Core",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert "INC-" in data["incident_id"]
    assert len(data["steps"]) >= 4
    assert "MTU" in data["root_cause"]
    assert "SUCCESS" in data["verification_outcome"]


async def test_network_analytics_endpoint(client):
    res = await client.get("/api/v1/reports/network-analytics")
    assert res.status_code == 200
    data = res.json()
    assert data["total_devices"] >= 1
    assert "OSPF" in data["protocol_distribution"]
    assert "Core-WAN-Link1" in data["traffic_bandwidth_mbps"]
    assert data["mttr_minutes"] > 0


async def test_bgp_looking_glass_overview_and_trace(client):
    # 1. Overview
    res = await client.get("/api/v1/network/looking-glass/overview")
    assert res.status_code == 200
    data = res.json()
    assert data["local_asn"] in (65000, 65001)
    assert data["total_peers"] >= 1
    assert len(data["routes"]) >= 1

    # 2. Trace regular prefix
    trace_res = await client.get("/api/v1/network/looking-glass/trace?prefix=198.51.100.0/24")
    assert trace_res.status_code == 200
    trace = trace_res.json()
    assert trace["prefix"] == "198.51.100.0/24"
    assert len(trace["hops"]) >= 2
    assert "Private ASN" in trace["verdict"] or "valid" in trace["verdict"].lower()

    # 3. Trace multi-hop route
    trace_priv = await client.get("/api/v1/network/looking-glass/trace?prefix=10.0.0.0/24")
    assert trace_priv.status_code == 200
    priv_data = trace_priv.json()
    assert priv_data["bogon_as_detected"] is True
    assert len(priv_data["as_path"]) == 3


async def test_rbac_user_management(client):
    # 1. List users
    res = await client.get("/api/v1/users")
    assert res.status_code == 200
    users = res.json()
    assert len(users) >= 1
    assert any(u["role"] == "Super Admin" for u in users)

    # 2. Create new user
    new_user = {
        "username": "netsec_auditor",
        "email": "audit@netlab.internal",
        "full_name": "Security Auditor",
        "role": "Student / Auditor",
    }
    create_res = await client.post("/api/v1/users", json=new_user)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["username"] == "netsec_auditor"
    assert created["role"] == "Student / Auditor"
    user_id = created["id"]

    # 3. Update user role
    update_res = await client.put(f"/api/v1/users/{user_id}", json={"role": "NOC Engineer"})
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["role"] == "NOC Engineer"

    # 4. Delete user
    del_res = await client.delete(f"/api/v1/users/{user_id}")
    assert del_res.status_code == 200
    assert del_res.json()["success"] is True


async def test_config_rollback_and_golden(client):
    # 1. Create a configuration record to work with
    cfg_payload = {
        "device_id": 1,
        "config_text": "hostname R1\ninterface GigabitEthernet0/0\n ip address 10.0.0.1 255.255.255.0\n",
        "description": "Baseline v1 configuration",
        "created_by": "admin",
    }
    create_cfg = await client.post("/api/v1/configurations", json=cfg_payload)
    assert create_cfg.status_code == 201
    cfg = create_cfg.json()
    cfg_id = cfg["id"]

    # 2. Mark golden baseline
    golden_res = await client.put(f"/api/v1/configurations/{cfg_id}/golden")
    assert golden_res.status_code == 200
    golden_data = golden_res.json()
    assert golden_data["is_golden"] is True
    assert golden_data["config_id"] == cfg_id

    # 3. Rollback configuration
    rollback_res = await client.post(f"/api/v1/configurations/{cfg_id}/rollback")
    assert rollback_res.status_code == 200
    rb_data = rollback_res.json()
    assert rb_data["success"] is True
    assert rb_data["config_id"] == cfg_id
    assert "configure terminal" in rb_data["rollback_script"]


async def test_executive_dossier(client):
    res = await client.get("/api/v1/reports/executive-dossier")
    assert res.status_code == 200
    dossier = res.json()
    assert "NETLAB AI" in dossier["title"]
    assert dossier["health_score"] >= 80
    assert dossier["total_assets"] >= 1
    assert "NETLAB AI" in dossier["html_report"]
    assert "# NETLAB AI" in dossier["markdown_report"]

