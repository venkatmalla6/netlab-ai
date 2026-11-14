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
