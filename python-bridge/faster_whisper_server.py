#!/usr/bin/env python3
"""HTTP server that bridges Electron to a Faster-Whisper transcription backend."""

import argparse
import json
import logging
import os
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Any, Dict, List, Optional

LOGGER = logging.getLogger("faster_whisper_bridge")
logging.basicConfig(level=logging.INFO, format="[%(name)s] %(message)s")


class TranscriptionEngine:
    """Wrap Faster-Whisper inference with graceful fallback when unavailable."""

    def __init__(self, model_path: Optional[str], device: str = "cpu", compute_type: str = "int8"):
        self.model_path = model_path
        self.device = device
        self.compute_type = compute_type
        self._model = None
        self._load_model()

    def _load_model(self) -> None:
        try:
            from faster_whisper import WhisperModel  # type: ignore
        except ImportError:
            LOGGER.warning("Faster-Whisper not installed, falling back to echo responses")
            self._model = None
            return

        resolved_path = self.model_path or "small.en"
        LOGGER.info("Loading Faster-Whisper model: %s", resolved_path)
        self._model = WhisperModel(resolved_path, device=self.device, compute_type=self.compute_type)

    def transcribe(self, audio_path: str, settings: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found: {audio_path}")

        if self._model is None:
            LOGGER.info("Falling back to passthrough transcription")
            return {
                "text": "",
                "segments": [
                    {
                        "start": 0.0,
                        "end": 0.0,
                        "text": f"(transcription unavailable for {os.path.basename(audio_path)})",
                    }
                ],
            }

        options = settings or {}
        segments, info = self._model.transcribe(audio_path, **options)
        LOGGER.info("Transcribed %s, detected language %s", audio_path, info.language)

        serialized_segments: List[Dict[str, Any]] = []
        for segment in segments:
            serialized_segments.append(
                {
                    "start": float(segment.start),
                    "end": float(segment.end),
                    "text": segment.text.strip(),
                }
            )

        return {
            "text": " ".join(s["text"] for s in serialized_segments).strip(),
            "segments": serialized_segments,
        }


class RequestHandler(BaseHTTPRequestHandler):
    server_version = "FasterWhisperBridge/1.0"

    def _set_json_headers(self, status: int = 200) -> None:
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802 (required by BaseHTTPRequestHandler)
        if self.path == "/health":
            self._set_json_headers(200)
            self.wfile.write(json.dumps({"status": "ok"}).encode("utf-8"))
            return

        self._set_json_headers(404)
        self.wfile.write(json.dumps({"error": "Not found"}).encode("utf-8"))

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/transcribe":
            self._set_json_headers(404)
            self.wfile.write(json.dumps({"error": "Not found"}).encode("utf-8"))
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(content_length)
        try:
            payload = json.loads(body.decode("utf-8"))
        except json.JSONDecodeError:
            self._set_json_headers(400)
            self.wfile.write(json.dumps({"error": "Invalid JSON payload"}).encode("utf-8"))
            return

        audio_path = payload.get("audio_path")
        settings = payload.get("settings") or {}

        if not audio_path:
            self._set_json_headers(400)
            self.wfile.write(json.dumps({"error": "Missing audio_path"}).encode("utf-8"))
            return

        try:
            result = self.server.engine.transcribe(audio_path, settings)  # type: ignore[attr-defined]
            self._set_json_headers(200)
            self.wfile.write(json.dumps({"success": True, **result}).encode("utf-8"))
        except Exception as exc:  # pylint: disable=broad-except
            LOGGER.exception("Failed to transcribe %s", audio_path)
            self._set_json_headers(500)
            self.wfile.write(json.dumps({"success": False, "error": str(exc)}).encode("utf-8"))

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A003
        LOGGER.info("%s - %s", self.address_string(), format % args)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the Faster-Whisper HTTP bridge")
    parser.add_argument("--port", type=int, default=8765, help="HTTP port to bind")
    parser.add_argument("--host", default="127.0.0.1", help="Host interface to bind")
    parser.add_argument("--model", default=None, help="Optional model path (defaults to small.en)")
    parser.add_argument("--device", default="cpu", help="Device passed to Faster-Whisper")
    parser.add_argument("--compute-type", default="int8", help="Compute type for Faster-Whisper")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    engine = TranscriptionEngine(args.model, device=args.device, compute_type=args.compute_type)

    server = HTTPServer((args.host, args.port), RequestHandler)
    server.engine = engine  # type: ignore[attr-defined]

    LOGGER.info("Starting Faster-Whisper bridge on %s:%s", args.host, args.port)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        LOGGER.info("Shutting down bridge")
    finally:
        server.server_close()


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # pylint: disable=broad-except
        LOGGER.error("Fatal error: %s", exc)
        sys.exit(1)
