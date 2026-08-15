# face-service

Small standalone HTTP service that backs the face-detection retry gate
on the attendance camera screen
(`app/(sales)/attendance/camera.tsx`).

It is a direct port of `detect_face()` from the supplied
`face_match.py` script — same RetinaFace detector, same "found a face,
yes/no" contract — wrapped in a FastAPI endpoint instead of a webcam
CLI loop. The face **matching** half of that script (`DeepFace.verify`)
is intentionally left commented out in `app.py` for now; see the
"FUTURE WORK" section there and in
`src/services/faceDetectionService.ts`.

This service is separate from the Expo app on purpose — DeepFace is a
Python/TensorFlow library and can't run inside React Native.

## Run it

```
cd face-service
pip install -r requirements.txt
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

First run downloads the RetinaFace + Facenet512 model weights, so it
can be slow the first time.

## Point the app at it

In the repo root, `.env`:

```
EXPO_PUBLIC_FACE_API_URL=http://<your-machine-ip>:8000
```

Use `localhost` only if you're testing in a simulator/emulator on the
same machine as the service. A physical device needs your machine's
LAN IP.

## Endpoints

- `POST /detect-face` — `{ "image_base64": "..." }` →
  `{ "has_face": bool, "message": str }`. Active, used by the app today.
- `GET /health` — basic liveness check.
- `POST /verify-faces` — commented out in `app.py`. Future work: match
  the captured photo against a sales rep's enrolled reference photo.
  Needs the schema drafted in
  `supabase/migrations/006_face_verification_draft.sql`.

## Deploying

Not set up yet. This currently only targets local development
(`localhost` / LAN IP). For a real deployment, this needs to run
somewhere with enough CPU/RAM for DeepFace (a small VM or container
service works fine — it doesn't need a GPU for RetinaFace + Facenet512
at this volume), with `EXPO_PUBLIC_FACE_API_URL` pointed at its public
URL and the endpoint put behind auth before going further than local
testing.