#!/usr/bin/env python3
"""
Create default pipeline for all users who don't have one
"""

import asyncio
from app.core.database import async_engine, AsyncSessionLocal
from app.models.deals import Pipeline, PipelineStage
from app.models.users import User
from sqlalchemy import select

async def create_default_pipeline():
    """Create default sales pipeline for users without one"""
    print("Creating default pipelines...")
    
    async with AsyncSessionLocal() as session:
        # Get all users
        result = await session.execute(select(User).where(User.is_deleted == False))
        users = result.scalars().all()
        
        for user in users:
            # Check if user already has a pipeline
            result = await session.execute(
                select(Pipeline).where(
                    Pipeline.owner_id == user.id,
                    Pipeline.is_deleted == False
                )
            )
            existing_pipeline = result.first()
            
            if not existing_pipeline:
                print(f"Creating default pipeline for user: {user.email}")
                
                # Create default pipeline
                pipeline = Pipeline(
                    name="Sales Pipeline",
                    description="Default sales pipeline",
                    is_active=True,
                    owner_id=user.id
                )
                session.add(pipeline)
                await session.flush()  # Get the pipeline ID
                
                # Create default stages
                stages = [
                    {"name": "Qualification", "probability": 25, "order_index": 0},
                    {"name": "Proposal", "probability": 50, "order_index": 1},
                    {"name": "Negotiation", "probability": 75, "order_index": 2},
                    {"name": "Closed Won", "probability": 100, "order_index": 3, "is_closed": True, "is_won": True},
                    {"name": "Closed Lost", "probability": 0, "order_index": 4, "is_closed": True, "is_won": False},
                ]
                
                for stage_data in stages:
                    stage = PipelineStage(
                        pipeline_id=pipeline.id,
                        name=stage_data["name"],
                        probability=stage_data["probability"],
                        order_index=stage_data["order_index"],
                        is_closed=stage_data.get("is_closed", False),
                        is_won=stage_data.get("is_won", False)
                    )
                    session.add(stage)
                
                await session.commit()
                print(f"✅ Created pipeline '{pipeline.name}' with {len(stages)} stages for {user.email}")
            else:
                print(f"⏭️  User {user.email} already has a pipeline")
    
    print("\n✅ Default pipeline creation complete!")

if __name__ == "__main__":
    asyncio.run(create_default_pipeline())
