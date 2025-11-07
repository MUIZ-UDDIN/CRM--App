"""
WebSocket API for Real-time Updates
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from app.services.websocket_manager import manager
from app.core.auth import get_current_user_ws
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
):
    """
    WebSocket endpoint for real-time updates
    Clients connect with their auth token and receive updates for their company
    """
    company_id = None
    
    try:
        # Authenticate the user
        user = await get_current_user_ws(token)
        company_id = user.get("company_id")
        
        if not company_id:
            await websocket.close(code=1008, reason="No company associated with user")
            return
        
        # Connect the client
        await manager.connect(websocket, company_id)
        
        # Send initial connection success message
        await manager.send_personal_message({
            "type": "connection",
            "status": "connected",
            "company_id": company_id
        }, websocket)
        
        # Keep connection alive and handle incoming messages
        while True:
            # Receive messages (mainly for keepalive/ping)
            data = await websocket.receive_text()
            
            # Echo back for ping/pong
            if data == "ping":
                await manager.send_personal_message({"type": "pong"}, websocket)
    
    except WebSocketDisconnect:
        if company_id:
            manager.disconnect(websocket, company_id)
        logger.info("WebSocket disconnected normally")
    
    except Exception as e:
        if company_id:
            manager.disconnect(websocket, company_id)
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.close(code=1011, reason=str(e))
        except:
            pass
