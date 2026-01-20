#!/bin/bash

# Start Backend and Frontend for web development

echo "🚀 Starting Sandeshaa Web App..."

# Start Backend in background
echo "📡 Starting Backend..."
cd Backend
source venv/bin/activate
uvicorn main:app --reload --host 0.0.0.0 &
BACKEND_PID=$!

# Start Frontend
echo "🌐 Starting Frontend..."
cd ../Frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Both servers running!"
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait and cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
