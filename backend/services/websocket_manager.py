import logging
import asyncio
from typing import Dict, List
from fastapi import WebSocket

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Maps user_id to a list of active WebSocket connections
        # A user might be logged in on multiple tabs/devices
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.loop = None

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if self.loop is None:
            self.loop = asyncio.get_running_loop()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        logger.info(f"WebSocket connected for user {user_id}. Total connections: {len(self.active_connections[user_id])}")

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
                logger.info(f"WebSocket disconnected for user {user_id}. Remaining: {len(self.active_connections[user_id])}")
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, user_id: str):
        print(f"[WS] Attempting to send message to {user_id}. Connections: {len(self.active_connections.get(user_id, []))}")
        if user_id in self.active_connections:
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_json(message)
                    print(f"[WS] Message successfully sent to {user_id}")
                except Exception as e:
                    print(f"[WS] Error sending message: {e}")
                    logger.error(f"Error sending WebSocket message to {user_id}: {e}")

    def send_personal_message_sync(self, message: dict, user_id: str):
        """Thread-safe method to send a message from a synchronous route/thread."""
        print(f"[WS] Sync push called for {user_id}. Active: {user_id in self.active_connections}, Loop exists: {self.loop is not None}")
        if user_id in self.active_connections and self.loop:
            future = asyncio.run_coroutine_threadsafe(self.send_personal_message(message, user_id), self.loop)
            try:
                # We don't block for long, but we can check if it raises immediately
                # future.result(timeout=1) # Blocking here might be dangerous if the loop is busy
                print(f"[WS] Coroutine scheduled successfully for {user_id}")
            except Exception as e:
                print(f"[WS] Error scheduling coroutine: {e}")

manager = ConnectionManager()
