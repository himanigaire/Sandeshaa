# Copilot / AI Agent Instructions for Sandeshaa Backend

Summary
- Small FastAPI-based secure messaging prototype. Focus areas: JWT auth, WebSocket real-time delivery, encrypted ciphertext-only messages, file upload pipeline, and scheduled cleanup jobs.

Quick start (what an agent will need to do locally)
- Ensure a `.env` file with `DATABASE_URL` (SQLAlchemy URL). The app reads env via `python-dotenv` in `main.py`.
- Run the server for development: `uvicorn main:app --reload --port 8000`
- The app auto-creates DB tables on startup using `Base.metadata.create_all(bind=engine)` (no migrations currently).

Key files to read first
- `main.py` — API routes, WebSocket handler, file upload logic, scheduler jobs (message/file cleanup), and CORS policy.
- `auth.py` — password hashing (`bcrypt`) and JWT creation/expiry. Note: SECRET_KEY and algorithm live here.
- `models.py` — DB models: `User`, `Message`, `FileMessage`.
- `schemas.py` — Pydantic request/response models used by endpoints.
- `database.py` — `DATABASE_URL` required. Uses SQLAlchemy `create_engine` and `SessionLocal`.

Architecture & behaviour notes (concise)
- Authentication: JWTs created with `create_access_token` in `auth.py`. Tokens store `sub` as user id (string). Protected endpoints use `HTTPBearer` and `get_current_user` to decode and cast to `int`.
- WebSocket: `ws` endpoint at `/ws` accepts a `token` query param (`ws://.../ws?token=JWT`). On connect, server authenticates, sends undelivered messages, and listens for `send_message` JSON events to store ciphertext in DB and attempt real-time delivery.
- File uploads: endpoint `/upload-file` accepts `file: UploadFile` and `to_username` (form). Files are placed in `uploads/` with a unique `stored_filename`; DB `FileMessage` tracks them.
- Cleanup: APScheduler background jobs remove messages older than 7 days and files older than 24 hours. Scheduler starts at app startup and is gracefully shut down on exit.

Project-specific conventions & gotchas
- Passwords are truncated to 72 bytes before hashing/verification (see `auth.get_password_hash` and `verify_password`); keep this when adding password-related features.
- JWT `sub` field is stored as a string (`create_access_token({"sub": str(user.id)})`) and parsed as `int` by `get_current_user` and WS auth — preserve this pattern.
- File validation uses a whitelist `ALLOWED_EXTENSIONS` and blacklist `BLOCKED_EXTENSIONS`. There is additional (commented) magic-bytes validation in `validate_file`; it demonstrates intent to check MIME-bytes if `python-magic` is enabled.
- Max upload size: 10MB (`MAX_FILE_SIZE`). File name sanitization removes suspicious characters and generates a timestamp + random hex stored filename.
- DB schema is created via SQLAlchemy `create_all`; no migrations are present — be careful with schema changes.

Examples (useful snippets for agents)
- Login -> obtain token:
  - POST `/login` with `{"username":..., "password":...}` -> `TokenResponse.access_token`.
  - Use header: `Authorization: Bearer <token>` for protected endpoints such as `/me`, `/upload-file`, `/download-file`.
- WebSocket connect:
  - `ws://127.0.0.1:8000/ws?token=<JWT>`
  - Send a message: `{ "type": "send_message", "client_id": "abc123", "to": "bob", "ciphertext": "..." }`
- File upload form fields:
  - `file` (file), `to_username` (form field)

Debugging tips (what code already prints)
- `get_current_user` prints token and decoded payload (useful for debugging invalid tokens).
- Scheduler prints summary messages on job runs.
- Catch-all error handlers in file upload and WebSocket log exceptions to stdout.

Dependencies (inferred from imports)
- FastAPI, Uvicorn, SQLAlchemy, python-dotenv, jose (python-jose), passlib[bcrypt], apscheduler, python-magic (optional), python-mimetypes.

Where to change things safely / extension points
- To change auth behaviour, update `auth.py` (expiry/algorithms) and review `get_current_user` and WS token decoding.
- To implement stricter file content validation, enable and use `magic` checks in `validate_file` (commented code block in `main.py`).
- To add migrations, replace `Base.metadata.create_all` with an Alembic setup and document DB migration commands in README/instructions.

Tests & CI
- There are no tests or CI configurations discovered. An agent should not assume any testing framework or GitHub Actions are in place.

If something is unclear or you want additional examples (e.g., sample curl/ws clients, test harness, or migration steps), tell me which section to expand and I will iterate. 👋
