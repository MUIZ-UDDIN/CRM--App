#!/usr/bin/env python3
"""
Create default pipeline if none exists
"""

import asyncio
from app.core.database import async_engine, AsyncSessionLocal
from app.models.deals import Pipeline, PipelineStage
from sqlalchemy import select

async def create_default_pipeline():
    """Create default sales pipeline if none exists"""
    print("Checking for existing pipelines...")
    
    async with AsyncSessionLocal() as session:
        # Check if any pipeline exists
        result = await session.execute(
            select(Pipeline).where(Pipeline.is_deleted == False)
        )
        existing_pipeline = result.first()
        
        if not existing_pipeline:
            print("No pipelines found. Creating default pipeline...")
            
            # Create default pipeline
            pipeline = Pipeline(
                name="Sales Pipeline",
                description="Default sales pipeline for all deals",
                is_active=True
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
            print(f"✅ Created pipeline '{pipeline.name}' with {len(stages)} stages")
            print("\nStages created:")
            for stage in stages:
                print(f"  - {stage['name']} ({stage['probability']}%)")
        else:
            print("⏭️  Pipeline already exists. No action needed.")
    
    print("\n✅ Pipeline setup complete!")

if __name__ == "__main__":
    asyncio.run(create_default_pipeline())
