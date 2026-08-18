"""
face-service
============

Small HTTP wrapper around the face detection logic from the supplied
face_match.py, so the sales_wheel mobile app (React Native / Expo —
app/(sales)/attendance/camera.tsx) can check a captured attendance
photo for a face without bundling DeepFace into the mobile app itself.

Scope of this phase — DETECTION ONLY:

    POST /detect-face
        { "image_base64": "<jpeg bytes, base64>" }
        -> { "has_face": bool, "message": str }

`detect_face()` below is a direct port of the function of the same
name in face_match.py (same detector backend: RetinaFace, same
enforce_detection behaviour). Nothing about it was changed except
swapping "read from webcam / a file on disk" for "read from a
base64 request body".

Explicitly NOT implemented yet — see the commented-out section at the
bottom of this file:

    POST /verify-faces
        Ported from DeepFace.verify(...) in face_match.py. This is the
        "does this face belong to the enrolled sales rep" check, and
        it needs a place to store each rep's reference photo first —
        see supabase/migrations/006_face_verification_draft.sql for a
        sketch of that schema. Wire this up once that exists.

Run locally:

    cd face-service
    pip install -r requirements.txt
    uvicorn app:app --reload --host 0.0.0.0 --port 8000

Then point the mobile app at it via EXPO_PUBLIC_FACE_API_URL in .env
(see .env.example) — use your machine's LAN IP instead of localhost
if you're testing on a physical device rather than a simulator.
"""

import base64
import binascii
import os
import tempfile

from deepface import DeepFace
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="sales_wheel face-service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:8082",
        "http://127.0.0.1:8082",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ============================================================
# FACE DETECTION
#
# Ported as-is from detect_face() in face_match.py — same detector
# backend and same "found at least one face, yes/no" contract. The
# only change is the input source (base64 request body instead of a
# path to a file already on disk).
# ============================================================

def detect_face(image_path: str):
    """
    Detect faces using RetinaFace.

    Returns:
        (True, None) if at least one face is detected.
        (False, error_message) if no face is detected.
    """

    try:
        faces = DeepFace.extract_faces(
            img_path=image_path,
            detector_backend="retinaface",
            enforce_detection=True,
        )

        if len(faces) > 0:
            return True, None

        return False, "No face detected."

    except Exception as e:
        return False, str(e)


class DetectFaceRequest(BaseModel):
    image_base64: str


class DetectFaceResponse(BaseModel):
    has_face: bool
    message: str


@app.post("/detect-face", response_model=DetectFaceResponse)
def detect_face_endpoint(payload: DetectFaceRequest) -> DetectFaceResponse:
    try:
        image_bytes = base64.b64decode(payload.image_base64, validate=True)
    except (binascii.Error, ValueError):
        return DetectFaceResponse(
            has_face=False,
            message="Could not read the uploaded photo.",
        )

    # DeepFace wants a path, not raw bytes — write to a temp file for
    # the duration of the check, same as face_match.py writing
    # captured_frame.jpg before calling detect_face() on it.
    tmp_path = None

    try:
        with tempfile.NamedTemporaryFile(
            suffix=".jpg", delete=False
        ) as tmp_file:
            tmp_file.write(image_bytes)
            tmp_path = tmp_file.name

        has_face, error = detect_face(tmp_path)

        if has_face:
            return DetectFaceResponse(
                has_face=True,
                message="Face detected.",
            )

        return DetectFaceResponse(
            has_face=False,
            message="No face detected. Please try again.",
        )

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.get("/health")
def health():
    return {"status": "ok"}


# ============================================================
# FUTURE WORK — face matching (NOT implemented yet)
# ============================================================
#
# Ported/adapted from the DeepFace.verify(...) call in face_match.py.
# Left commented out on purpose: it needs a reference photo per sales
# rep to compare against, which doesn't exist in the schema yet — see
# supabase/migrations/006_face_verification_draft.sql for a draft of
# what that would look like, and verifyFace() in
# src/services/faceDetectionService.ts for the client side of this.
#
# from fastapi import HTTPException
#
# class VerifyFacesRequest(BaseModel):
#     captured_image_base64: str
#     # However the reference photo gets fetched server-side —
#     # e.g. downloaded from Supabase Storage using
#     # reference_photo_path before calling DeepFace.verify.
#     reference_image_base64: str
#     model_name: str = "Facenet512"
#
# class VerifyFacesResponse(BaseModel):
#     verified: bool
#     distance: float
#     threshold: float
#     model: str
#
# @app.post("/verify-faces", response_model=VerifyFacesResponse)
# def verify_faces_endpoint(payload: VerifyFacesRequest) -> VerifyFacesResponse:
#     captured_path = _write_temp_jpeg(payload.captured_image_base64)
#     reference_path = _write_temp_jpeg(payload.reference_image_base64)
#
#     try:
#         result = DeepFace.verify(
#             img1_path=captured_path,
#             img2_path=reference_path,
#             model_name=payload.model_name,
#             detector_backend="retinaface",
#             enforce_detection=True,
#         )
#     except Exception as e:
#         raise HTTPException(status_code=422, detail=str(e))
#     finally:
#         os.remove(captured_path)
#         os.remove(reference_path)
#
#     return VerifyFacesResponse(
#         verified=result.get("verified", False),
#         distance=result.get("distance"),
#         threshold=result.get("threshold"),
#         model=result.get("model", payload.model_name),
#     )
# ============================================================