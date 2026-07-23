"""WebSocket relay for Gemini Live voice intake.

Bridges browser audio/text frames <-> a Live session and streams the running
transcript back. On {"type":"end"} it extracts {target_role, cv_text} from the
transcript and returns it as {"type":"intake", ...} for the client to feed into
POST /api/runs. Decoupled from the paid loop; if Live is unavailable it returns a
clean error frame rather than crashing the socket.

Client frames:  {"type":"audio","data": <base64 pcm16@16k>}
                {"type":"text","data": "..."}
                {"type":"end"}
Server frames:  {"type":"transcript","data": "..."} | {"type":"intake", ...}
                | {"type":"error","message": "..."}
"""
import asyncio
import base64

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from google.genai import types

from ada.services.voice import VoiceIntake

router = APIRouter(tags=["voice"])


@router.websocket("/voice")
async def voice(ws: WebSocket) -> None:
    await ws.accept()
    intake = VoiceIntake()
    transcript: list[str] = []
    try:
        async with intake.connect() as session:

            async def pump_out() -> None:
                async for resp in session.receive():
                    text = getattr(resp, "text", None)
                    if text:
                        transcript.append(text)
                        await ws.send_json({"type": "transcript", "data": text})

            out_task = asyncio.create_task(pump_out())
            while True:
                msg = await ws.receive_json()
                kind = msg.get("type")
                if kind == "audio":
                    pcm = base64.b64decode(msg["data"])
                    await session.send_realtime_input(
                        media=types.Blob(data=pcm, mime_type="audio/pcm;rate=16000")
                    )
                elif kind == "text":
                    await session.send_client_content(turns=msg["data"], turn_complete=True)
                elif kind == "end":
                    break
            out_task.cancel()

        intake_data = await intake.extract("\n".join(transcript))
        await ws.send_json({"type": "intake", **intake_data})
    except WebSocketDisconnect:
        return
    except Exception as exc:  # noqa: BLE001 — surface any Live failure to the client
        await ws.send_json({"type": "error", "message": f"voice intake unavailable: {exc!r}"})
    finally:
        try:
            await ws.close()
        except RuntimeError:
            pass
