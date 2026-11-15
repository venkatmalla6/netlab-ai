"""EVE-NG integration endpoints with deployment and lab management."""

from __future__ import annotations

from typing import Any, Dict, List, Optional
import urllib.parse

from fastapi import APIRouter, HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

from app.integrations.eve_ng.client import eve_ng_client

router = APIRouter(prefix="/eve-ng", tags=["EVE-NG"])


class EVEConfigRequest(BaseModel):
    host: str
    username: str = "admin"
    password: str = "eve"


class EVELabCreateRequest(BaseModel):
    name: str
    nodes: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    edges: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    description: Optional[str] = "Created by NETLAB AI"


class EVEDeployTopologyRequest(BaseModel):
    name: str
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]


@router.get("/status")
async def eve_status():
    available = await eve_ng_client.available()
    return {"available": available, "host": eve_ng_client._host or "Not configured"}


@router.post("/config")
async def eve_update_config(req: EVEConfigRequest):
    eve_ng_client.update_config(host=req.host, username=req.username, password=req.password)
    available = await eve_ng_client.available()
    return {
        "success": True,
        "host": req.host,
        "available": available,
        "message": "EVE-NG hypervisor address updated successfully." if available else "Address saved, but EVE-NG host is currently unreachable.",
    }


@router.post("/login")
async def eve_login():
    ok = await eve_ng_client.login()
    if not ok:
        raise HTTPException(status_code=502, detail="Failed to login to EVE-NG")
    return {"message": "Logged in to EVE-NG"}


@router.get("/labs")
async def eve_list_labs():
    labs = await eve_ng_client.list_labs()
    return {"labs": labs}


@router.post("/labs")
async def eve_create_or_deploy_lab(req: EVELabCreateRequest):
    """Deploy or create a lab with nodes on EVE-NG."""
    res = await eve_ng_client.deploy_topology(
        name=req.name,
        nodes=req.nodes or [],
        edges=req.edges or [],
    )
    return res


@router.post("/deploy")
async def eve_deploy_topology(req: EVEDeployTopologyRequest):
    """Directly deploy canvas topology to EVE-NG."""
    res = await eve_ng_client.deploy_topology(
        name=req.name,
        nodes=req.nodes,
        edges=req.edges,
    )
    return res


@router.get("/labs/{lab_path:path}/nodes")
async def eve_lab_nodes(lab_path: str):
    nodes = await eve_ng_client.get_lab_nodes(lab_path)
    return {"nodes": nodes}


@router.get("/labs/{lab_path:path}/topology")
async def eve_lab_topology(lab_path: str):
    topo = await eve_ng_client.get_lab_topology(lab_path)
    return {"topology": topo}


@router.get("/labs/{lab_path:path}/visualize")
async def eve_visualize_lab(lab_path: str):
    """Fetch nodes and topology from EVE-NG and convert to React Flow topology format."""
    clean_path = lab_path.lstrip("/")
    if not clean_path.endswith(".unl"):
        clean_path = f"{clean_path}.unl"

    raw_nodes = await eve_ng_client.get_lab_nodes(clean_path)
    raw_topo = await eve_ng_client.get_lab_topology(clean_path)

    # Map device types
    def map_type(template: str, name: str) -> str:
        t = (template or "").lower()
        n = (name or "").lower()
        if "switch" in n or "l2" in t or "viosl2" in t:
            return "switch"
        elif "router" in n or "vios" in t or "csr" in t or "7200" in t:
            return "router"
        elif "firewall" in n or "asa" in t or "forti" in t:
            return "firewall"
        elif "server" in n or "linux" in t:
            return "server"
        elif "win" in n or "vpc" in t:
            return "host"
        return "router"

    flow_nodes = []
    if isinstance(raw_nodes, dict):
        for nid, n in raw_nodes.items():
            name = n.get("name") or f"Node{nid}"
            template = n.get("template") or ""
            dev_type = map_type(template, name)
            flow_nodes.append({
                "id": f"node{nid}",
                "name": name,
                "label": name,
                "type": dev_type,
                "platform": template.upper() or "IOSv",
                "position": {
                    "x": int(n.get("left", 100)),
                    "y": int(n.get("top", 100)),
                },
                "status": "running" if n.get("status") == 2 else "stopped",
                "ip": n.get("ip") or "",
            })

    flow_links = []
    if isinstance(raw_topo, list):
        for idx, edge in enumerate(raw_topo):
            flow_links.append({
                "id": f"eve-edge-{idx}",
                "source": edge.get("source"),
                "target": edge.get("destination"),
                "source_interface": edge.get("source_label") or "eth0",
                "target_interface": edge.get("destination_label") or "eth0",
            })

    lab_title = clean_path.replace(".unl", "").replace("%20", " ")
    return {
        "lab_name": lab_title,
        "nodes": flow_nodes,
        "links": flow_links,
        "raw_node_count": len(flow_nodes),
        "raw_link_count": len(flow_links),
    }


@router.get("/labs/{lab_path:path}/open-console", response_class=HTMLResponse)
async def eve_open_console(lab_path: str):
    """
    Session-priming launcher that sets the active lab in EVE-NG
    before redirecting to the legacy topology view.
    """
    clean_path = lab_path.lstrip("/")
    if not clean_path.endswith(".unl"):
        clean_path = f"{clean_path}.unl"

    # Backend primes its active session as well
    try:
        await eve_ng_client.get_lab_topology(clean_path)
    except Exception:
        pass

    eve_host = eve_ng_client._host or "192.168.106.129"
    encoded_path = urllib.parse.quote(f"/{clean_path}")
    api_url = f"http://{eve_host}/api/labs{encoded_path}/topology"
    target_url = f"http://{eve_host}/legacy{encoded_path}/topology"
    lab_display_name = clean_path.replace(".unl", "").replace("%20", " ")

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Opening {lab_display_name} - EVE-NG</title>
  <style>
    body {{
      background: #090d16;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      user-select: none;
    }}
    .box {{
      background: #0f172a;
      border: 1px solid #1e293b;
      padding: 32px 40px;
      border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
      text-align: center;
      max-width: 480px;
      width: 90%;
    }}
    .spinner {{
      width: 44px;
      height: 44px;
      border: 3px solid rgba(59, 130, 246, 0.15);
      border-top-color: #3b82f6;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin: 0 auto 20px auto;
    }}
    @keyframes spin {{
      to {{ transform: rotate(360deg); }}
    }}
    h2 {{
      font-size: 1.15rem;
      font-weight: 600;
      margin: 0 0 8px 0;
      color: #f8fafc;
    }}
    .badge {{
      display: inline-block;
      padding: 3px 10px;
      background: rgba(16, 185, 129, 0.1);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.25);
      border-radius: 9999px;
      font-size: 11px;
      font-family: monospace;
      margin-bottom: 14px;
    }}
    p {{
      font-size: 0.85rem;
      color: #94a3b8;
      line-height: 1.5;
      margin: 0 0 20px 0;
    }}
    a.btn {{
      display: inline-block;
      background: #2563eb;
      color: white;
      text-decoration: none;
      padding: 9px 18px;
      border-radius: 8px;
      font-size: 0.825rem;
      font-weight: 500;
      transition: background 0.15s ease;
    }}
    a.btn:hover {{
      background: #1d4ed8;
    }}
  </style>
</head>
<body>
  <div class="box">
    <div class="spinner"></div>
    <h2>Activating EVE-NG Session</h2>
    <div class="badge">{lab_display_name}</div>
    <p>Binding EVE-NG hypervisor session to <strong>{lab_display_name}</strong> and loading topology...</p>
    <div>
      <a href="{target_url}" class="btn" id="manualBtn">Continue to Web Console &rarr;</a>
    </div>
  </div>

  <iframe id="primer" src="{api_url}" style="display:none;" width="0" height="0"></iframe>

  <script>
    const target = "{target_url}";
    const api = "{api_url}";

    try {{
      fetch(api, {{ mode: 'no-cors', credentials: 'include' }}).catch(() => {{}});
    }} catch(e) {{}}

    setTimeout(() => {{
      window.location.replace(target);
    }}, 450);
  </script>
</body>
</html>
"""
    return HTMLResponse(content=html_content)


@router.post("/labs/{lab_path:path}/nodes/{node_id}/start")
async def eve_start_node(lab_path: str, node_id: int):
    ok = await eve_ng_client.start_node(lab_path, node_id)
    if not ok:
        raise HTTPException(status_code=502, detail="Failed to start node")
    return {"message": f"Node {node_id} started"}


@router.post("/labs/{lab_path:path}/nodes/{node_id}/stop")
async def eve_stop_node(lab_path: str, node_id: int):
    ok = await eve_ng_client.stop_node(lab_path, node_id)
    if not ok:
        raise HTTPException(status_code=502, detail="Failed to stop node")
    return {"message": f"Node {node_id} stopped"}


@router.post("/labs/{lab_path:path}/start-all")
async def eve_start_all_nodes(lab_path: str):
    ok = await eve_ng_client.start_all_nodes(lab_path)
    return {"success": ok, "message": f"All nodes in {lab_path} sent start command."}


@router.post("/labs/{lab_path:path}/stop-all")
async def eve_stop_all_nodes(lab_path: str):
    ok = await eve_ng_client.stop_all_nodes(lab_path)
    return {"success": ok, "message": f"All nodes in {lab_path} stopped."}
