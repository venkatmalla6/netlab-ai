# NETLAB AI – Comprehensive Manual Test Suite & Verification Matrix

This manual test suite provides step-by-step test procedures for testing every single module of NETLAB AI (Phases 1 through 9).

---

## 🛠️ Test Environment Setup & Prerequisites

Before beginning manual verification:
1. **Launch the Application**:
   - Run `start.bat` (or in separate terminals):
     - **Backend:** `cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload`
     - **Frontend:** `cd frontend && npm run dev`
2. **Access URLs**:
   - Web App UI: [http://localhost:5173](http://localhost:5173)
   - Interactive OpenAPI Docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
3. **Verified Accounts**:
   - Default Super Admin: `admin` (`Super Admin` role)
   - Architect: `sarah.chen` (`Network Architect` role)

---

## 📋 Comprehensive Module-by-Module Test Cases

### 1. Dashboard (`/`)
- **Test ID:** `TC-01-DASHBOARD`
- **Goal:** Verify real-time database counts and audit trail stream.
- **Steps:**
  1. Navigate to `/`.
  2. Inspect the **Total Labs**, **Active Devices**, **Interfaces**, and **Health Score** KPI cards.
  3. Verify that stats are populated with non-zero counts (fetched directly from SQLite `netlab.db`).
  4. Scroll to **Recent Audit Trail** and verify live timestamped system operations.
  5. Click any quick action pill (e.g., *Launch Topology Builder*).
- **Expected Result:**
  - KPI cards display real numbers from the database (zero dummy static values).
  - Quick action links route smoothly to their respective pages.

---

### 2. AI Assistant (`/assistant`)
- **Test ID:** `TC-02-AI-ASSISTANT`
- **Goal:** Verify Groq AI network reasoning, voice dictation, and speech readout.
- **Steps:**
  1. Navigate to `/assistant`.
  2. In the chat prompt box, type: `"Explain OSPF DR/BDR election and calculate default dead intervals"` and press Enter.
  3. Observe the streaming response.
  4. Click the **Microphone (Voice Input)** icon, allow browser mic permission, speak `"Configure VLAN 10 and 20"`, and click Send.
  5. Click the **Audio / Speaker** icon on the AI response bubble.
- **Expected Result:**
  - Groq AI provides technically accurate RFC-compliant network reasoning.
  - Speech-to-text populates the input field cleanly.
  - Text-to-speech reads the response aloud using the Web Speech API.

---

### 3. Topology Builder (`/topology`)
- **Test ID:** `TC-03-TOPOLOGY-BUILDER`
- **Goal:** Verify canvas drag-and-drop, port cabling, pre-flight audit, IaC exports, and DB sync.
- **Steps:**
  1. Navigate to `/topology`.
  2. Drag a **Router** and a **Switch** from the left hardware palette onto the canvas.
  3. Connect a link from the Router's port handle to the Switch's port handle.
  4. Click **Pre-Flight Check** button on the toolbar.
  5. Click **Export IaC** dropdown and select **Ansible Inventory**, **Terraform HCL**, and **Netmiko Script**.
  6. Click **Save Topology** and name it `"Enterprise-Test-Topo"`.
  7. Navigate to `/devices` to verify the new devices were synced to the database.
- **Expected Result:**
  - Nodes drop cleanly, snap to grid, and display auto-negotiated interface labels (`Gi0/0 <-> Gi0/1`).
  - Pre-flight compliance validator inspects topology and returns an instant health score and category findings.
  - IaC exporter downloads or previews clean syntax files without syntax errors.
  - Device Inventory reflects the newly created canvas nodes immediately.

---

### 4. Image-to-Topology Vision AI (`/vision`)
- **Test ID:** `TC-04-VISION-AI`
- **Goal:** Verify diagram analysis and 1-click topology synthesis.
- **Steps:**
  1. Navigate to `/vision`.
  2. Either upload a network diagram image (PNG/JPG) or click one of the provided pre-built sample network diagram presets.
  3. Click **Analyze Diagram with Vision AI**.
  4. Inspect the extracted device roster, subnets, and link map.
  5. Click **Import into Topology Builder**.
- **Expected Result:**
  - Vision AI extracts hostnames, vendor types, and CIDR subnets.
  - Canvas opens with the extracted nodes and links auto-rendered in place.

---

### 5. EVE-NG Lab Manager (`/eve-ng`)
- **Test ID:** `TC-05-EVENG-MANAGER`
- **Goal:** Verify EVE-NG hypervisor integration and IP configuration.
- **Steps:**
  1. Navigate to `/eve-ng`.
  2. Review the hypervisor connection status card.
  3. Enter your EVE-NG VM IP (or test fallback `192.168.1.100`), username, and password, then click **Update Hypervisor Settings**.
  4. Click **Fetch Labs** or **Create New EVE-NG Lab**.
  5. Click **Start All Nodes** / **Stop All Nodes**.
- **Expected Result:**
  - Connection status reflects real reachability (online or simulation fallback banner if hypervisor VM is stopped).
  - Changes to hypervisor IP persist in backend settings.

---

### 6. VMware Manager (`/vmware`)
- **Test ID:** `TC-06-VMWARE-MANAGER`
- **Goal:** Verify VMware ESXi / Workstation status polling and control.
- **Steps:**
  1. Navigate to `/vmware`.
  2. Check the ESXi host connection panel.
  3. Toggle VM power state or test API reachability.
  4. Update VMware API credentials and click **Save Settings**.
- **Expected Result:**
  - VMware telemetry cards reflect active host status or fallback mode with clear error handling.

---

### 7. Device Inventory (`/devices`)
- **Test ID:** `TC-07-DEVICE-INVENTORY`
- **Goal:** Verify database CRUD for physical and virtual hardware assets.
- **Steps:**
  1. Navigate to `/devices`.
  2. Click **+ Add Device**.
  3. Fill in:
     - Name: `Core-Sw-01`
     - Vendor: `Cisco`
     - Platform: `IOSv-L2`
     - Device Type: `Switch`
     - Management IP: `10.10.20.1`
  4. Click **Save Device**.
  5. Find `Core-Sw-01` in the table, click its row to inspect interfaces.
  6. Click **Terminal** or **Configure** action button on the device row.
- **Expected Result:**
  - Modal saves device to SQLite; device appears immediately in the table with an auto-provisioned management interface.
  - Action buttons open direct management routes for that specific device ID.

---

### 8. Device Configuration & Multi-Vendor Translation (`/device-config`)
- **Test ID:** `TC-08-DEVICE-CONFIG`
- **Goal:** Verify AI configuration generation, syntax validation, diff viewer, and cross-vendor translation.
- **Steps:**
  1. Navigate to `/device-config`.
  2. Select an existing device (e.g., `Router-1`).
  3. Select protocols: **OSPF** and **ACL**.
  4. Click **Generate Configuration**.
  5. Inspect the generated Cisco IOS configuration text and syntax check pass badge.
  6. Modify a line in the configuration text and click **Compute Diff**.
  7. Click **Translate Syntax** button, select Target Vendor: **Juniper JunOS** (or Arista EOS / Linux `iproute2`), and click **Translate**.
- **Expected Result:**
  - Cisco IOS configuration generates with proper interface blocks, router ospf, and ACLs.
  - Diff viewer displays unified additions (green `+`) and deletions (red `-`).
  - Multi-vendor translator outputs idiomatic Juniper `set` commands or Arista syntax.

---

### 9. Interactive VTY & WebSocket Terminal (`/terminal`)
- **Test ID:** `TC-09-DEVICE-TERMINAL`
- **Goal:** Verify stateful Cisco IOS VTY session, bidirectional WebSocket, and command parsing.
- **Steps:**
  1. Navigate to `/terminal`.
  2. Select a target device from the top dropdown (e.g., `Test-Core-R1`).
  3. Type `enable` and press Enter.
  4. Type `show ip interface brief` and press Enter.
  5. Type `show ip route` and press Enter.
  6. Type `configure terminal` and observe prompt changes to `(config)#`.
  7. Type `interface GigabitEthernet0/0` and observe `(config-if)#`.
  8. Type `?` for context-sensitive help.
  9. Press the **Up Arrow** key to recall the previous command from the history buffer.
- **Expected Result:**
  - Terminal displays realistic Cisco IOS ASCII banner.
  - Prompts change statefully (`>` $\to$ `#` $\to$ `(config)#`).
  - Interface tables and routing tables parse cleanly.
  - Up/Down history buffer cycles through previous commands.

---

### 10. Network Monitoring & Telemetry (`/monitoring`)
- **Test ID:** `TC-10-MONITORING`
- **Goal:** Verify operational metrics, interface up/down status, and telemetry polling.
- **Steps:**
  1. Navigate to `/monitoring`.
  2. Observe overall device health percentage and interface state distribution.
  3. Toggle **Auto-Refresh (10s)** switch ON.
  4. Review active warning / alert tiles.
  5. Click **Inspect** on any device card.
- **Expected Result:**
  - Live device status updates without page reload.
  - Interface UP/DOWN counts reflect current database device interface tables.

---

### 11. AI Troubleshooting & Autonomous Copilot (`/troubleshooting`)
- **Test ID:** `TC-11-AI-TROUBLESHOOTING`
- **Goal:** Verify 5-stage agentic loop (Perception $\to$ Reasoning $\to$ Remediation $\to$ Verification).
- **Steps:**
  1. Navigate to `/troubleshooting`.
  2. In the problem description box, enter: `"OSPF adjacency between R1 and R2 stuck in EXSTART state due to MTU mismatch"`.
  3. Select Target Device: `Router-1`.
  4. Click **Launch Autonomous Investigation**.
  5. Watch the step-by-step investigation stepper:
     - Stage 1: Problem Perception & Symptom Ingestion
     - Stage 2: Diagnostic Command Execution
     - Stage 3: Root Cause Isolation
     - Stage 4: Surgical Remediation Dispatch
     - Stage 5: Final State Verification
  6. Inspect the generated Incident Report and remediation command log.
- **Expected Result:**
  - Copilot autonomously progresses through all 5 stages.
  - Root cause identifies MTU mismatch and applies `ip ospf mtu-ignore` or MTU alignment with terminal verification output.

---

### 12. PCAP Deep Packet Dissector (`/packets`)
- **Test ID:** `TC-12-PCAP-ANALYZER`
- **Goal:** Verify binary libpcap frame parsing and protocol inspection.
- **Steps:**
  1. Navigate to `/packets`.
  2. Click **Load Sample Capture** and select **OSPF Hello Adjacency** (or upload your own `.pcap`).
  3. Inspect the packet stream table (Time, Source IP, Dest IP, Protocol, Length, Info).
  4. Click on any **OSPF** packet row.
  5. In the bottom frame inspector, expand **Ethernet II**, **IPv4**, and **OSPF Header**.
- **Expected Result:**
  - True binary PCAP parses without errors.
  - Multi-layer dissection reveals real header flags (Area ID, Hello/Dead interval, DR/BDR IPs).

---

### 13. Security Hardening & CIS Benchmarks (`/security`)
- **Test ID:** `TC-13-SECURITY-ANALYZER`
- **Goal:** Verify CIS benchmark auditing and 1-click hardening dispatch.
- **Steps:**
  1. Navigate to `/security`.
  2. Select an existing device configuration or click **Load Vulnerable CIS Scenario**.
  3. Click **Run Security Audit**.
  4. Inspect the Compliance Score (e.g., 45%) and findings list:
     - Missing `service password-encryption`
     - Telnet enabled instead of SSHv2
     - Missing `login block-for` anti-bruteforce
     - Unprotected SNMP community strings
  5. Click **Apply 1-Click Hardening Fix**.
  6. Re-run audit to verify score increases to 95%+.
- **Expected Result:**
  - Audit generates clear severity badges (High, Medium, Low) and CIS rule IDs.
  - Hardening fix dispatches commands through the safety engine and commits to the audit trail.

---

### 14. Configuration Backup (`/backup`)
- **Test ID:** `TC-14-CONFIG-BACKUP`
- **Goal:** Verify configuration snapshot creation and download.
- **Steps:**
  1. Navigate to `/backup`.
  2. Select a device and click **Create Instant Backup**.
  3. Enter description: `"Pre-maintenance change backup"`.
  4. Verify the new backup appears in the table with an auto-incremented version number.
  5. Click **Download Backup** (.cfg).
- **Expected Result:**
  - Snapshot is saved to database `configurations` table and downloaded as a plaintext `.cfg` file.

---

### 15. Configuration History & Rollback (`/history`)
- **Test ID:** `TC-15-CONFIG-ROLLBACK`
- **Goal:** Verify historical snapshot diffs, Golden Standard Baselines, and emergency rollback.
- **Steps:**
  1. Navigate to `/history`.
  2. Select a device with multiple versions.
  3. Click **Set as Golden Baseline** on version 1.
  4. Verify the `[GOLDEN BASELINE]` badge appears.
  5. Click **Emergency Rollback** on an earlier version.
  6. Confirm the rollback modal.
- **Expected Result:**
  - Golden baseline is marked in DB and highlighted with a star icon.
  - Rollback synthesizes a reverse Cisco IOS command sequence and logs a `CONFIGURATION_ROLLBACK` event to audit logs.

---

### 16. Networking Academy (`/academy`)
- **Test ID:** `TC-16-NETWORKING-ACADEMY`
- **Goal:** Verify curriculum modules, lesson reading, and lab canvas loading.
- **Steps:**
  1. Navigate to `/academy`.
  2. Select **CCNA 200-301 Track** or **CCNP Enterprise**.
  3. Click on module: **OSPFv2 Routing Mechanics**.
  4. Read lesson text and inspect the network diagram.
  5. Click **Load Lab Topology on Canvas**.
- **Expected Result:**
  - Academy lesson loads formatted markdown, formulas, and architecture guidelines.
  - "Load Lab Topology on Canvas" routes directly to `/topology` with the lab nodes pre-populated.

---

### 17. Practical Exams & Automated Lab Grading (`/exams`)
- **Test ID:** `TC-17-PRACTICAL-EXAMS`
- **Goal:** Verify timed hands-on exams and automated configuration grading.
- **Steps:**
  1. Navigate to `/exams`.
  2. Select exam: **CCNA Final Lab: Multi-Area OSPF & VLAN Segmentation**.
  3. Review rubric requirements (IP Addressing, OSPF convergence, ACL security).
  4. In the Student Solution Configuration box, paste candidate Cisco IOS config text (or click **Load Sample Student Configuration**).
  5. Click **Grade Lab with Automated Rubric Engine**.
- **Expected Result:**
  - Scorecard generates with percentage score (e.g., 85/100), Passed/Failed badge, and line-by-line rubric breakdown with point deductions and constructive tips.

---

### 18. Technical Interview Simulator (`/interview`)
- **Test ID:** `TC-18-INTERVIEW-SIMULATOR`
- **Goal:** Verify AI architecture interview questions, voice response, and scoring.
- **Steps:**
  1. Navigate to `/interview`.
  2. Select Interview Level: **Senior Network Architect**.
  3. Click **Generate Technical Question**.
  4. Review question (e.g., BGP route reflectors and path loops).
  5. Type your answer (or click the microphone icon to dictate via voice).
  6. Click **Submit Answer for AI Evaluation**.
  7. Click the **Listen to Feedback** audio button.
- **Expected Result:**
  - AI scores the answer (0–100%), highlights key strengths, points out omitted RFC concepts, and provides a model answer.

---

### 19. Learning Roadmap (`/roadmap`)
- **Test ID:** `TC-19-LEARNING-ROADMAP`
- **Goal:** Verify progressive certification path tracking and module milestones.
- **Steps:**
  1. Navigate to `/roadmap`.
  2. Select track: **CCNA 200-301 $\to$ CCNP Enterprise $\to$ CCIE Infrastructure**.
  3. Toggle milestone status checkboxes.
  4. Verify completion percentage bar updates dynamically.
- **Expected Result:**
  - Milestone progression updates smoothly and reflects completion percentage.

---

### 20. Chaos Failure Simulator (`/failure-sim`)
- **Test ID:** `TC-20-FAILURE-SIMULATOR`
- **Goal:** Verify deliberate network fault injection and baseline recovery.
- **Steps:**
  1. Navigate to `/failure-sim`.
  2. Select Target Device: `Router-1`.
  3. Choose fault scenario:
     - Scenario A: **MTU Mismatch (OSPF EXSTART Lock)**
     - Scenario B: **Native VLAN Trunk Mismatch (CDP Flapping)**
     - Scenario C: **ACL Blackhole (Deny Management)**
  4. Click **Inject Network Chaos**.
  5. Verify terminal output shows failure injection commands.
  6. Click **1-Click Baseline Recovery**.
- **Expected Result:**
  - Failure commands are dispatched with live CLI output.
  - Baseline recovery dispatches corrective commands and restores normal operation.

---

### 21. Dynamic Network Documentation (`/docs-gen`)
- **Test ID:** `TC-21-DOCS-GENERATOR`
- **Goal:** Verify automatic Markdown network documentation and AI enrichment.
- **Steps:**
  1. Navigate to `/docs-gen`.
  2. Click **Generate Live Architecture Document**.
  3. Inspect generated tables: Monitored Devices, Interface IP Plans, Subnet Allocations.
  4. Click **AI HA & Capacity Planning Enrichment**.
  5. Click **Download Markdown (.md)**.
- **Expected Result:**
  - Dynamic Markdown reflects actual devices and interfaces stored in `netlab.db`.
  - AI enrichment appends high availability and capacity planning recommendations.

---

### 22. AI Whiteboard & Sketch Canvas (`/whiteboard`)
- **Test ID:** `TC-22-AI-WHITEBOARD`
- **Goal:** Verify freehand drawing, hardware symbol stamping, and Vision AI export.
- **Steps:**
  1. Navigate to `/whiteboard`.
  2. Select the **Pencil tool**, choose a color, and draw interconnecting links.
  3. Click the **Router Stamp** tool and click canvas to place router circles.
  4. Click the **Switch Stamp** tool to place switch boxes.
  5. Click **Export Canvas as PNG** to verify image download.
  6. Click **Send to Vision AI for Synthesis**.
- **Expected Result:**
  - Drawing is smooth and responsive on the HTML5 canvas.
  - "Send to Vision AI" caches the drawing and routes to `/vision` for instant topology extraction.

---

### 23. Interactive BGP Looking Glass (`/looking-glass`)
- **Test ID:** `TC-23-LOOKING-GLASS`
- **Goal:** Verify live BGP routing table, AS-Path tracing, and bogon leak detection.
- **Steps:**
  1. Navigate to `/looking-glass`.
  2. Inspect the **Local Autonomous System** badge (`AS65000`), Router ID (`1.1.1.1`), and established peer counts.
  3. Review the **BGP Routing Table** (Prefix, Next Hop, MED, LocPrf, AS-Path, Community).
  4. In the AS-Path Tracer input, enter prefix: `198.51.100.0/24` and click **Trace AS-Path**.
  5. Observe the AS hop graph (`Origin` $\to$ `Transit` $\to$ `Edge`).
  6. In the tracer, enter private prefix `10.0.0.0/8` and click **Trace AS-Path**.
- **Expected Result:**
  - BGP table displays active prefixes with standard Cisco `*> (Best)` status markers.
  - AS-Path tracer renders hop badges with geolocation and organization names.
  - Bogon/RFC 6996 alert flags private ASNs and warns before public Internet advertisement.

---

### 24. Enterprise Analytics & Health Matrix (`/analytics`)
- **Test ID:** `TC-24-ENTERPRISE-ANALYTICS`
- **Goal:** Verify network health telemetry, protocol distribution, and executive dossier.
- **Steps:**
  1. Navigate to `/analytics`.
  2. Review the **Overall Fabric Health Score** (e.g., 95%).
  3. Inspect the **Protocol Distribution Matrix** (OSPF, BGP, VLANs, NAT).
  4. Review **Core Link Throughput Bandwidth** (WAN Link 1, Trunk A, Trunk B).
  5. Review the **MTTR (Mean Time to Resolution)** counter.
  6. Click **Download Executive Audit Dossier**.
- **Expected Result:**
  - Health scores and protocol distribution calculate directly from active devices and configurations.
  - Executive dossier downloads with compliance grade and CIS benchmark alignment.

---

### 25. Role-Based Access Control & User Management (`/users`)
- **Test ID:** `TC-25-USER-MANAGEMENT`
- **Goal:** Verify multi-tenant RBAC roster, role assignment, and user creation.
- **Steps:**
  1. Navigate to `/users`.
  2. Review the account roster and role metric summary cards (Super Admin, Architect, NOC Engineer, Student).
  3. Click **+ Add Engineer**.
  4. Enter:
     - Username: `david.noc`
     - Full Name: `David Miller`
     - Email: `d.miller@netlab.local`
     - Role: `NOC Engineer`
  5. Click **Create Account**.
  6. Find `david.noc` in the table and change his role dropdown to `Network Architect`.
  7. Click the **Delete** icon on `david.noc` to remove the test account.
- **Expected Result:**
  - New user is provisioned with default role permissions.
  - Updating role updates assigned capability scopes immediately.
  - Deleting account cleans up the roster; default `admin` account is protected from deletion.

---

### 26. System Settings & Hypervisor Configuration (`/settings`)
- **Test ID:** `TC-26-SYSTEM-SETTINGS`
- **Goal:** Verify persistent configuration of AI models, hypervisor IPs, and theme preferences.
- **Steps:**
  1. Navigate to `/settings`.
  2. Change Groq Model selection (e.g., `qwen-2.5-32b` or `llama-3.3-70b-versatile`).
  3. Modify EVE-NG IP address and VMware Workstation path.
  4. Toggle Theme from **Dark** to **Light** mode and back.
  5. Click **Save System Configuration**.
  6. Reload the browser page (`F5`).
- **Expected Result:**
  - Theme switches instantly with proper high-contrast UI tokens.
  - Saved settings persist after page refresh.

---

## 🔄 End-to-End Cross-Module Integration Workflow

- **Test ID:** `TC-E2E-LIFECYCLE`
- **Goal:** Verify complete lifecycle across 7 interconnected modules.
- **Workflow Steps:**
  1. **Whiteboard (`/whiteboard`)**: Sketch a 2-router topology and click *"Send to Vision AI"*.
  2. **Vision AI (`/vision`)**: Click *"Import into Topology Builder"*.
  3. **Topology Builder (`/topology`)**: Run *"Pre-Flight Check"*, confirm 0 errors, and click *"Save Topology"*.
  4. **Device Inventory (`/devices`)**: Confirm newly imported devices appear in the database.
  5. **Device Configuration (`/device-config`)**: Generate OSPF config, validate syntax, and translate to Juniper JunOS.
  6. **Device Terminal (`/terminal`)**: Open terminal session on Router-1 and run `show ip interface brief`.
  7. **Failure Simulator (`/failure-sim`)**: Inject MTU mismatch fault, observe failure, and click *"1-Click Baseline Recovery"*.
  8. **Config History (`/history`)**: Flag running config as *"Golden Baseline"*.
- **Expected Result:**
  - All 7 modules seamlessly pass data through SQLite and internal state without page crashes or lost context.

---

## ✅ Verification Sign-Off Checklist

| Test ID | Module | Status (Pass/Fail) | Verified By | Date |
|---|---|:---:|:---:|:---:|
| `TC-01-DASHBOARD` | Dashboard | [ ] | | |
| `TC-02-AI-ASSISTANT` | AI Assistant | [ ] | | |
| `TC-03-TOPOLOGY-BUILDER` | Topology Builder | [ ] | | |
| `TC-04-VISION-AI` | Image-to-Topology | [ ] | | |
| `TC-05-EVENG-MANAGER` | EVE-NG Lab Manager | [ ] | | |
| `TC-06-VMWARE-MANAGER` | VMware Manager | [ ] | | |
| `TC-07-DEVICE-INVENTORY` | Device Inventory | [ ] | | |
| `TC-08-DEVICE-CONFIG` | Device Configuration | [ ] | | |
| `TC-09-DEVICE-TERMINAL` | VTY Terminal | [ ] | | |
| `TC-10-MONITORING` | Telemetry & Monitoring | [ ] | | |
| `TC-11-AI-TROUBLESHOOTING` | Copilot Troubleshooting | [ ] | | |
| `TC-12-PCAP-ANALYZER` | PCAP Dissector | [ ] | | |
| `TC-13-SECURITY-ANALYZER` | Security & CIS Hardening | [ ] | | |
| `TC-14-CONFIG-BACKUP` | Config Backup | [ ] | | |
| `TC-15-CONFIG-ROLLBACK` | Config History & Rollback | [ ] | | |
| `TC-16-NETWORKING-ACADEMY` | Networking Academy | [ ] | | |
| `TC-17-PRACTICAL-EXAMS` | Practical Lab Exams | [ ] | | |
| `TC-18-INTERVIEW-SIMULATOR` | Interview Simulator | [ ] | | |
| `TC-19-LEARNING-ROADMAP` | Learning Roadmap | [ ] | | |
| `TC-20-FAILURE-SIMULATOR` | Chaos Failure Simulator | [ ] | | |
| `TC-21-DOCS-GENERATOR` | Network Documentation | [ ] | | |
| `TC-22-AI-WHITEBOARD` | AI Sketch Whiteboard | [ ] | | |
| `TC-23-LOOKING-GLASS` | BGP Looking Glass | [ ] | | |
| `TC-24-ENTERPRISE-ANALYTICS`| Enterprise Analytics | [ ] | | |
| `TC-25-USER-MANAGEMENT` | User Management & RBAC | [ ] | | |
| `TC-26-SYSTEM-SETTINGS` | Settings & Hypervisors | [ ] | | |
| `TC-E2E-LIFECYCLE` | Cross-Module End-to-End | [ ] | | |
