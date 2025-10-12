# backend/gemini_computer_use.py

from io import BytesIO
from config import settings
from datetime import datetime
import os
import subprocess
import json
import pyautogui
from google.genai.types import Content, Part, FunctionDeclaration
from google.genai import types
from google import genai


class GeminiComputerUse:
    def __init__(self):
        self.client = genai.Client(api_key=settings.GOOGLE_API_KEY)
        self.action_history = []

        # Define custom function for opening your app
        self.open_cyberpet_popup = FunctionDeclaration(
            name="open_cyberpet_popup",
            description="Opens the CyberPet security alert popup application when a threat is detected",
            parameters={
                "type": "object",
                "properties": {
                    "threat_type": {
                        "type": "string",
                        "description": "Type of threat detected"
                    },
                    "severity": {
                        "type": "integer",
                        "description": "Severity level 0-100"
                    }
                },
                "required": ["threat_type", "severity"]
            }
        )

    async def analyze_and_act(self) -> dict:
        """
        1. Analyze screenshot with Gemini
        2. If threat detected, Gemini will call open_cyberpet_popup function
        3. We execute the function to open your Electron app
        """
        print(f"[{datetime.now().strftime('%H:%M:%S')}] 📸 Capturing screen...")

        try:
            # Take screenshot
            screenshot = pyautogui.screenshot()
            screenshot_bytes = self._image_to_bytes(screenshot)

            print(
                f"[{datetime.now().strftime('%H:%M:%S')}] 🤖 Analyzing with Gemini 2.5 Computer Use...")

            # Configure with Computer Use + custom function
            config = types.GenerateContentConfig(
                tools=[
                    # Standard Computer Use tool (for potential future actions)
                    types.Tool(
                        computer_use=types.ComputerUse(
                            environment=types.Environment.ENVIRONMENT_BROWSER,
                            # Exclude most actions - we mainly want analysis
                            excluded_predefined_functions=[
                                "click_at", "type_text_at", "scroll_document",
                                "navigate", "search", "drag_and_drop"
                            ]
                        )
                    ),
                    # Custom function to open our app
                    types.Tool(
                        function_declarations=[self.open_cyberpet_popup]
                    )
                ],
                system_instruction="""You are a cybersecurity guardian AI.

Your job:
1. ANALYZE the screenshot for security threats
2. If you detect a threat, call the open_cyberpet_popup function to alert the user
3. If no threat, just respond with your analysis in JSON

Look for:
- Phishing emails (suspicious sender, urgent language, fake URLs)
- Fake login pages (URL mismatch with expected site)
- Suspicious popups or malware warnings
- Dangerous file downloads
- Forms collecting sensitive data on HTTP sites

Be cautious but not overly sensitive - only flag CLEAR threats."""
            )

            prompt = """Analyze this screenshot for cybersecurity threats.

If you detect a threat:
1. Call the open_cyberpet_popup function with the threat details
2. Also provide analysis in JSON format

If no threat:
1. Just respond with JSON showing no threat detected

JSON format:
{
    "threat_detected": true/false,
    "threat_type": "phishing_email" | "fake_login" | "suspicious_popup" | null,
    "confidence": 0-100,
    "explanation": "technical explanation",
    "user_friendly_message": "simple warning"
}"""

            # Send to Gemini
            contents = [
                Content(
                    role="user",
                    parts=[
                        Part(text=prompt),
                        Part.from_bytes(
                            data=screenshot_bytes,
                            mime_type='image/png'
                        )
                    ]
                )
            ]

            response = self.client.models.generate_content(
                model='gemini-2.5-computer-use-preview-10-2025',
                contents=contents,
                config=config
            )

            # Process response
            result = self._process_response(response)

            # Save screenshot for debugging
            if settings.DEBUG_MODE:
                screenshot.save('last_screenshot.png')

            return result

        except Exception as e:
            print(f"❌ Error: {str(e)}")
            return {
                "threat_detected": False,
                "threat_type": None,
                "confidence": 0,
                "explanation": f"Error: {str(e)}",
                "user_friendly_message": ""
            }

    def _process_response(self, response) -> dict:
        """
        Process Gemini response - handle both text and function calls
        """
        result = {
            "threat_detected": False,
            "threat_type": None,
            "confidence": 0,
            "explanation": "",
            "user_friendly_message": "",
            "action_taken": None
        }

        if not hasattr(response, 'candidates') or len(response.candidates) == 0:
            print("⚠️  No response candidates")
            return result

        candidate = response.candidates[0]

        # Check for function calls (threat detected!)
        function_calls = []
        text_parts = []

        for part in candidate.content.parts:
            if hasattr(part, 'function_call') and part.function_call:
                function_calls.append(part.function_call)
            if hasattr(part, 'text') and part.text:
                text_parts.append(part.text)

        # Execute function calls (open app)
        if function_calls:
            for func_call in function_calls:
                if func_call.name == "open_cyberpet_popup":
                    print(f"🚨 THREAT DETECTED - Opening CyberPet popup!")
                    threat_type = func_call.args.get("threat_type", "unknown")
                    severity = func_call.args.get("severity", 50)

                    # Execute the action
                    self._open_popup_app(threat_type, severity)

                    result["action_taken"] = "popup_opened"
                    result["threat_detected"] = True
                    result["threat_type"] = threat_type
                    result["confidence"] = severity

        # Parse text response for detailed analysis
        if text_parts:
            text = " ".join(text_parts).strip()

            try:
                # Extract JSON
                if "```json" in text:
                    json_str = text.split("```json")[1].split("```")[0].strip()
                elif "```" in text:
                    json_str = text.split("```")[1].split("```")[0].strip()
                else:
                    json_str = text

                parsed = json.loads(json_str)
                result.update(parsed)

            except json.JSONDecodeError:
                # If can't parse JSON, use text as explanation
                if result["threat_detected"]:
                    result["explanation"] = text[:200]

        # Log result
        if result["threat_detected"]:
            print(
                f"⚠️  THREAT: {result['threat_type']} ({result['confidence']}%)")
            if result["action_taken"]:
                print(f"   Action: {result['action_taken']}")
        else:
            print(f"✅ No threats detected")

        return result

    def _open_popup_app(self, threat_type: str, severity: int):
        """
        Open the CyberPet Electron app (Person 2's app)

        NOTE: This will be updated once Person 2 provides the app path
        For now, we'll log the action and prepare the interface
        """
        print(f"   🚀 Triggering popup: {threat_type} (severity: {severity})")

        # TODO: Once Person 2's Electron app is ready, launch it like this:
        # subprocess.Popen(["/path/to/cyberpet-app.app"])

        # For now, create a signal file that the frontend can watch
        popup_data = {
            "threat_type": threat_type,
            "severity": severity,
            "timestamp": datetime.now().isoformat()
        }

        with open("popup_trigger.json", "w") as f:
            json.dump(popup_data, f)

        print(f"   ✅ Popup trigger created (waiting for Person 2's app integration)")

    def _image_to_bytes(self, image) -> bytes:
        """Convert PIL Image to bytes"""
        buffered = BytesIO()
        image.save(buffered, format="PNG")
        return buffered.getvalue()
