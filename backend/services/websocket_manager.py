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
        logger.debug(f"Attempting to send message to {user_id}. Connections: {len(self.active_connections.get(user_id, []))}")
        if user_id in self.active_connections:
            for connection in list(self.active_connections[user_id]):
                try:
                    await connection.send_json(message)
                    logger.debug(f"Message successfully sent to {user_id}")
                except Exception as e:
                    logger.error(f"Error sending WebSocket message to {user_id}: {e}")
                    try:
                        self.disconnect(connection, user_id)
                    except Exception:
                        pass

    def send_personal_message_sync(self, message: dict, user_id: str):
        """Thread-safe method to send a message from a synchronous route/thread."""
        logger.debug(f"Sync push called for {user_id}. Active: {user_id in self.active_connections}, Loop exists: {self.loop is not None}")
        loop = self.loop
        if loop is None:
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                pass

        if user_id in self.active_connections and loop:
            try:
                asyncio.run_coroutine_threadsafe(self.send_personal_message(message, user_id), loop)
                logger.debug(f"Coroutine scheduled successfully for {user_id}")
            except Exception as e:
                logger.error(f"Error scheduling coroutine for {user_id}: {e}")

    async def broadcast(self, message: dict):
        """Send a message to all active WebSocket connections across all users."""
        for user_id, connections in list(self.active_connections.items()):
            for connection in list(connections):
                try:
                    await connection.send_json(message)
                except Exception as e:
                    logger.error(f"Error broadcasting WebSocket message to {user_id}: {e}")
                    try:
                        self.disconnect(connection, user_id)
                    except Exception:
                        pass

    def broadcast_sync(self, message: dict):
        """Thread-safe method to broadcast a message from a synchronous route/thread."""
        loop = self.loop
        if loop is None:
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                pass

        if loop and self.active_connections:
            try:
                asyncio.run_coroutine_threadsafe(self.broadcast(message), loop)
            except Exception as e:
                logger.error(f"Error scheduling broadcast coroutine: {e}")

    def broadcast_staff_event(self, event_type: str, payload: dict = None):
        """Helper to broadcast standardized staff real-time events."""
        msg = {
            "type": "STAFF_EVENT",
            "event": event_type,
            "payload": payload or {}
        }
        self.broadcast_sync(msg)

manager = ConnectionManager()