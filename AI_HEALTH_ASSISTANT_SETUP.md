# AI Health Assistant Setup

This add-on was created as a standalone extension for RoboDoctor AI.

## New App Routes

- `/ai-health-assistant`
- `/report-understanding`
- `/smart-reminders`

## New API Routes

- `/api/ai-health-assistant/chat`
- `/api/ai-health-assistant/report-analysis`
- `/api/ai-health-assistant/risk`
- `/api/ai-health-assistant/suggestions`
- `/api/ai-health-assistant/reminders`

## Environment Variables

Copy values from [AI_HEALTH_ASSISTANT_ENV.example](/D:/robodoctor/robodoctor-ai/AI_HEALTH_ASSISTANT_ENV.example) into your local environment setup.

The new AI layer prefers Vertex AI when project credentials are present. If not, it falls back to direct Gemini API key mode.

## Integration Notes

- No existing routes, components, or logic were modified.
- The new health assistant routes are accessible directly.
- If you later want them linked from the home page, that would require a small follow-up edit to the existing landing page.
