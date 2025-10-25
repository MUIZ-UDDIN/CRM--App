"""
Claude AI Service for intelligent SMS responses
"""

import anthropic
from typing import Optional, Dict, List
from loguru import logger


class ClaudeService:
    """Service for Claude AI integration"""
    
    def __init__(self, api_key: str):
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = "claude-3-5-sonnet-20241022"  # Latest model
    
    async def generate_sms_response(
        self,
        incoming_message: str,
        contact_name: Optional[str] = None,
        contact_company: Optional[str] = None,
        conversation_history: Optional[List[Dict]] = None,
        business_context: Optional[str] = None,
        response_tone: str = "professional"
    ) -> str:
        """
        Generate an intelligent SMS response using Claude
        
        Args:
            incoming_message: The message received from the contact
            contact_name: Name of the contact
            contact_company: Company of the contact
            conversation_history: Previous messages in the conversation
            business_context: Context about your business/product
            response_tone: Tone of response (professional, friendly, casual)
        
        Returns:
            Generated SMS response text
        """
        try:
            # Build context for Claude
            system_prompt = self._build_system_prompt(
                contact_name=contact_name,
                contact_company=contact_company,
                business_context=business_context,
                response_tone=response_tone
            )
            
            # Build conversation messages
            messages = []
            
            # Add conversation history if available
            if conversation_history:
                for msg in conversation_history[-5:]:  # Last 5 messages for context
                    role = "user" if msg.get("direction") == "inbound" else "assistant"
                    messages.append({
                        "role": role,
                        "content": msg.get("body", "")
                    })
            
            # Add current message
            messages.append({
                "role": "user",
                "content": incoming_message
            })
            
            # Call Claude API
            response = self.client.messages.create(
                model=self.model,
                max_tokens=300,  # SMS responses should be concise
                system=system_prompt,
                messages=messages
            )
            
            # Extract response text
            response_text = response.content[0].text
            
            # Ensure response is SMS-friendly (under 160 chars ideally)
            if len(response_text) > 160:
                # Ask Claude to shorten it
                shorten_response = self.client.messages.create(
                    model=self.model,
                    max_tokens=160,
                    system="You are an SMS assistant. Shorten the following message to under 160 characters while keeping the key information.",
                    messages=[{
                        "role": "user",
                        "content": f"Shorten this: {response_text}"
                    }]
                )
                response_text = shorten_response.content[0].text
            
            logger.info(f"Generated SMS response: {response_text[:50]}...")
            return response_text
            
        except Exception as e:
            logger.error(f"Error generating Claude response: {e}")
            # Fallback response
            return "Thank you for your message. We'll get back to you soon!"
    
    def _build_system_prompt(
        self,
        contact_name: Optional[str],
        contact_company: Optional[str],
        business_context: Optional[str],
        response_tone: str
    ) -> str:
        """Build system prompt for Claude"""
        
        prompt = f"""You are an AI assistant helping with SMS customer communication for a CRM system.

Your role:
- Respond to customer SMS messages professionally and helpfully
- Keep responses concise (ideally under 160 characters for SMS)
- Be {response_tone} in tone
- Provide helpful information when possible
- If you don't know something, offer to have a human follow up

"""
        
        if contact_name:
            prompt += f"You are responding to: {contact_name}"
            if contact_company:
                prompt += f" from {contact_company}"
            prompt += "\n\n"
        
        if business_context:
            prompt += f"Business Context:\n{business_context}\n\n"
        
        prompt += """Guidelines:
- Keep responses SHORT (SMS-friendly)
- Be helpful and professional
- Don't make promises you can't keep
- If asked about pricing, availability, or specific details you don't know, offer to have someone call them
- Use proper grammar and spelling
- Avoid emojis unless the tone is casual
- Sign off appropriately

Remember: This is an SMS conversation, so be concise!"""
        
        return prompt
    
    async def classify_message_intent(
        self,
        message: str
    ) -> Dict[str, any]:
        """
        Classify the intent of an incoming message
        
        Returns:
            {
                "intent": "question|complaint|request|greeting|other",
                "urgency": "high|medium|low",
                "requires_human": bool,
                "suggested_action": str
            }
        """
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=200,
                system="""You are an AI that classifies SMS message intent. 
                Respond ONLY with valid JSON in this exact format:
                {
                    "intent": "question|complaint|request|greeting|other",
                    "urgency": "high|medium|low",
                    "requires_human": true|false,
                    "suggested_action": "brief description"
                }""",
                messages=[{
                    "role": "user",
                    "content": f"Classify this SMS message: {message}"
                }]
            )
            
            import json
            classification = json.loads(response.content[0].text)
            return classification
            
        except Exception as e:
            logger.error(f"Error classifying message: {e}")
            return {
                "intent": "other",
                "urgency": "medium",
                "requires_human": False,
                "suggested_action": "Review message"
            }
    
    async def generate_template_variations(
        self,
        base_template: str,
        num_variations: int = 3
    ) -> List[str]:
        """
        Generate variations of a message template
        
        Args:
            base_template: The original template
            num_variations: Number of variations to generate
        
        Returns:
            List of template variations
        """
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=500,
                system=f"""You are an SMS copywriter. Generate {num_variations} variations of the given message template.
                Each variation should:
                - Convey the same core message
                - Be SMS-friendly (concise)
                - Have slightly different wording/tone
                - Be numbered 1, 2, 3, etc.
                
                Format: Just list the variations, one per line, numbered.""",
                messages=[{
                    "role": "user",
                    "content": f"Create {num_variations} variations of: {base_template}"
                }]
            )
            
            variations_text = response.content[0].text
            # Parse numbered variations
            variations = []
            for line in variations_text.split('\n'):
                line = line.strip()
                if line and (line[0].isdigit() or line.startswith('-')):
                    # Remove numbering
                    clean_line = line.lstrip('0123456789.-) ').strip()
                    if clean_line:
                        variations.append(clean_line)
            
            return variations[:num_variations]
            
        except Exception as e:
            logger.error(f"Error generating variations: {e}")
            return [base_template]


# Global instance (will be initialized with API key from env)
_claude_service: Optional[ClaudeService] = None


def get_claude_service(api_key: str = None) -> ClaudeService:
    """Get or create Claude service instance"""
    global _claude_service
    
    if api_key:
        _claude_service = ClaudeService(api_key)
    
    if _claude_service is None:
        # Try to get from environment
        import os
        api_key = os.getenv("CLAUDE_API_KEY")
        if not api_key:
            raise ValueError("Claude API key not configured")
        _claude_service = ClaudeService(api_key)
    
    return _claude_service
