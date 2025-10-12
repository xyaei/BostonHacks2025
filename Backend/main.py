# backend/main.py

from pet_manager import PetManager
from gemini_computer_use import GeminiComputerUse
from security_detector import SecurityDetector
from models import SecurityEvent
from config import settings
from typing import List, Optional
import asyncio
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, WebSocket, WebSocketDisconnect


app = FastAPI(title="CyberPet - Gemini 2.5 Computer Use")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize
security_detector = SecurityDetector()
gemini_computer_use = GeminiComputerUse()
pet_manager = PetManager()

# WebSocket manager


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"🔌 WebSocket connected (total: {len(self.active_connections)})")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        print(f"🔌 WebSocket disconnected")

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass


manager = ConnectionManager()
monitoring_active = False
monitoring_task: Optional[asyncio.Task] = None

# ==================== API ENDPOINTS ====================


@app.get("/")
async def root():
    return {
        "status": "running",
        "message": "CyberPet - Gemini 2.5 Computer Use",
        "pet_state": pet_manager.get_state(),
        "monitoring_active": monitoring_active,
        "screenshot_interval": settings.SCREENSHOT_INTERVAL
    }


@app.post("/api/security-event")
async def log_security_event(event: SecurityEvent):
    print(
        f"\n📨 Event from extension: {event.type} (severity: {event.severity})")

    pet_state = pet_manager.process_threat_event(event.severity, event.type)

    await manager.broadcast({
        "type": "threat_detected",
        "threat": {
            "threat_type": event.type,
            "confidence": event.severity,
            "explanation": event.metadata.get("reason", "Threat detected"),
            "user_friendly_message": f"⚠️ {event.type.replace('_', ' ').title()}!"
        },
        "pet_state": pet_state
    })

    return {"pet_state": pet_state, "should_popup": event.severity > 50}


@app.get("/api/pet-state")
async def get_pet_state():
    return pet_manager.get_state()


@app.post("/api/good-behavior")
async def log_good_behavior(data: dict):
    time_safe = data.get("time_safe", 60)
    pet_state = pet_manager.process_good_behavior(time_safe)
    await manager.broadcast({"type": "health_update", "pet_state": pet_state})
    return pet_state


@app.get("/api/events/recent")
async def get_recent_events():
    return {"events": pet_manager.event_history[-10:]}

# ==================== MONITORING CONTROL ENDPOINTS ====================


@app.post("/api/monitoring/start")
async def start_monitoring_endpoint():
    """Start continuous screenshot monitoring"""
    global monitoring_active, monitoring_task

    if monitoring_active:
        return {
            "status": "already_running",
            "message": "Monitoring is already active",
            "interval": settings.SCREENSHOT_INTERVAL
        }

    monitoring_active = True
    monitoring_task = asyncio.create_task(monitor_loop())

    return {
        "status": "started",
        "message": f"Monitoring started - checking every {settings.SCREENSHOT_INTERVAL} seconds",
        "interval": settings.SCREENSHOT_INTERVAL
    }


@app.post("/api/monitoring/stop")
async def stop_monitoring_endpoint():
    """Stop continuous screenshot monitoring"""
    global monitoring_active, monitoring_task

    if not monitoring_active:
        return {
            "status": "not_running",
            "message": "Monitoring is not active"
        }

    monitoring_active = False

    if monitoring_task:
        monitoring_task.cancel()
        try:
            await monitoring_task
        except asyncio.CancelledError:
            pass

    return {
        "status": "stopped",
        "message": "Monitoring stopped"
    }


@app.get("/api/monitoring/status")
async def get_monitoring_status():
    """Check if monitoring is active"""
    return {
        "monitoring_active": monitoring_active,
        "screenshot_interval": settings.SCREENSHOT_INTERVAL,
        "pet_state": pet_manager.get_state()
    }

# ==================== TEST ENDPOINTS ====================


@app.post("/api/test/url")
async def test_url(data: dict):
    url = data.get("url", "")
    result = security_detector.analyze_url(url)
    print(f"\n🧪 URL TEST: {url} → {result['threat_type']}")
    return result


@app.post("/api/test/screenshot")
async def test_screenshot():
    """Manually trigger ONE screenshot analysis (doesn't count as monitoring)"""
    print("\n🧪 MANUAL SCREENSHOT TEST")
    result = await gemini_computer_use.analyze_and_act()
    return result


@app.post("/api/test/trigger-threat")
async def test_trigger_threat(data: dict):
    severity = data.get("severity", 75)
    threat_type = data.get("threat_type", "test_threat")

    pet_state = pet_manager.process_threat_event(severity, threat_type)

    await manager.broadcast({
        "type": "threat_detected",
        "threat": {
            "threat_type": threat_type,
            "confidence": severity,
            "explanation": "Test threat",
            "user_friendly_message": "Test!"
        },
        "pet_state": pet_state
    })

    return {"success": True, "pet_state": pet_state}

# ==================== DEMO CONTROL ENDPOINTS ====================


@app.post("/api/demo/reset-pet")
async def reset_pet():
    """Reset pet to full health for fresh demo"""
    pet_manager.health = 100
    pet_manager.evolution_stage = 1
    pet_manager.points = 0
    pet_manager.good_behavior_streak = 0
    pet_manager.event_history = []
    pet_manager._save_state()

    # Broadcast the reset to all connected clients
    await manager.broadcast({
        "type": "health_update",
        "pet_state": pet_manager.get_state()
    })

    print("\n🔄 Pet reset to default state")

    return {"status": "reset", "pet_state": pet_manager.get_state()}


@app.post("/api/demo/set-health")
async def set_health(data: dict):
    """Manually set pet health for demo scenarios"""
    health = data.get("health", 100)
    pet_manager.health = max(0, min(100, health))  # Clamp between 0-100
    pet_manager._save_state()

    await manager.broadcast({
        "type": "health_update",
        "pet_state": pet_manager.get_state()
    })

    print(f"\n💊 Pet health manually set to {health}")

    return {"status": "updated", "pet_state": pet_manager.get_state()}

# ==================== WEBSOCKET ====================


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_json({"echo": data})
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# ==================== BACKGROUND MONITORING ====================


async def monitor_loop():
    """Gemini 2.5 Computer Use monitoring loop"""
    global monitoring_active

    print("\n" + "="*60)
    print("🚀 GEMINI 2.5 COMPUTER USE - MONITORING STARTED")
    print(f"   Interval: {settings.SCREENSHOT_INTERVAL} seconds")
    print("="*60)

    check_count = 0

    try:
        while monitoring_active:
            check_count += 1
            print(f"\n{'='*60}")
            print(f"🔍 Check #{check_count}")
            print(f"{'='*60}")

            try:
                # Gemini Computer Use analysis
                result = await gemini_computer_use.analyze_and_act()

                if result["threat_detected"]:
                    pet_state = pet_manager.process_threat_event(
                        severity=result["confidence"],
                        threat_type=result["threat_type"]
                    )

                    await manager.broadcast({
                        "type": "threat_detected",
                        "threat": result,
                        "pet_state": pet_state
                    })

                    print(f"\n🚨 ALERT SENT TO FRONTEND")
                else:
                    pet_state = pet_manager.process_good_behavior(
                        settings.SCREENSHOT_INTERVAL)

                    await manager.broadcast({
                        "type": "health_update",
                        "pet_state": pet_state
                    })

                print(
                    f"\n⏳ Next check in {settings.SCREENSHOT_INTERVAL} seconds...")
                await asyncio.sleep(settings.SCREENSHOT_INTERVAL)

            except Exception as e:
                print(f"❌ Check error: {e}")
                await asyncio.sleep(5)

    except asyncio.CancelledError:
        print("\n⏹️  Monitoring stopped by user")
        raise


@app.on_event("startup")
async def startup_event():
    """Server startup - monitoring is OFF by default"""
    print("\n✅ Gemini 2.5 Computer Use initialized")
    print("💡 Monitoring is OFF - Use POST /api/monitoring/start to begin")
    print(
        f"💡 Will check every {settings.SCREENSHOT_INTERVAL} seconds when enabled")
