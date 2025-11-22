"""
WebSocket Manager for Real-time Updates
Handles broadcasting changes to all connected clients in the same company
"""

from typing import Dict, Set
from fastapi import WebSocket
import json
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # Store active connections grouped by company_id
        # Format: {company_id: {websocket1, websocket2, ...}}
        self.active_connections: Dict[str, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, company_id: str):
        """Accept and store a new WebSocket connection"""
        await websocket.accept()
        
        if company_id not in self.active_connections:
            self.active_connections[company_id] = set()
        
        self.active_connections[company_id].add(websocket)
        logger.info(f"Client connected to company {company_id}. Total connections: {len(self.active_connections[company_id])}")
    
    def disconnect(self, websocket: WebSocket, company_id: str):
        """Remove a WebSocket connection"""
        if company_id in self.active_connections:
            self.active_connections[company_id].discard(websocket)
            
            # Clean up empty company groups
            if not self.active_connections[company_id]:
                del self.active_connections[company_id]
            
            logger.info(f"Client disconnected from company {company_id}")
    
    async def broadcast_to_company(self, company_id: str, message: dict, exclude: WebSocket = None):
        """
        Broadcast a message to all connections in a company
        
        Args:
            company_id: The company to broadcast to
            message: The message dict to send
            exclude: Optional websocket to exclude from broadcast (e.g., the sender)
        """
        if company_id not in self.active_connections:
            return
        
        # Convert message to JSON
        message_json = json.dumps(message)
        
        # Send to all connections in the company
        disconnected = []
        for connection in self.active_connections[company_id]:
            if connection == exclude:
                continue
            
            try:
                await connection.send_text(message_json)
            except Exception as e:
                logger.error(f"Error sending message: {e}")
                disconnected.append(connection)
        
        # Clean up disconnected clients
        for connection in disconnected:
            self.disconnect(connection, company_id)
    
    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send a message to a specific connection"""
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error(f"Error sending personal message: {e}")
    
    async def broadcast(self, message: dict, user_id: str = None, company_id: str = None):
        """
        Broadcast a message to all connections or specific user/company
        
        Args:
            message: The message dict to send
            user_id: Optional user_id (currently broadcasts to company)
            company_id: Optional company_id to broadcast to
        """
        # If company_id provided, broadcast to that company
        if company_id:
            await self.broadcast_to_company(company_id, message)
        else:
            # Broadcast to all companies (use sparingly)
            for cid in list(self.active_connections.keys()):
                await self.broadcast_to_company(cid, message)


# Global instance
manager = ConnectionManager()


# Helper function to broadcast entity changes
async def broadcast_entity_change(
    company_id: str,
    entity_type: str,
    action: str,
    entity_id: str,
    data: dict = None
):
    """
    Broadcast an entity change to all clients in a company
    
    Args:
        company_id: Company ID to broadcast to
        entity_type: Type of entity (deal, activity, contact, etc.)
        action: Action performed (created, updated, deleted)
        entity_id: ID of the entity
        data: Optional entity data
    """
    message = {
        "type": "entity_change",
        "entity_type": entity_type,
        "action": action,
        "entity_id": entity_id,
        "data": data,
        "timestamp": None  # Will be set by client
    }
    
    await manager.broadcast_to_company(company_id, message)


# Helper function to broadcast new notifications
async def broadcast_notification(
    company_id: str,
    notification_data: dict
):
    """
    Broadcast a new notification to all clients in a company
    
    Args:
        company_id: Company ID to broadcast to
        notification_data: Notification data to send
    """
    message = {
        "type": "new_notification",
        "notification": notification_data,
        "timestamp": None  # Will be set by client
    }
    
    await manager.broadcast_to_company(company_id, message)
