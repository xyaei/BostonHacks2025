Start backend:

source venv/bin/activate

uvicorn main:app --reload --host 0.0.0.0 --port 8000


Start/stop:
Open NEW terminal, keep the old one open.
Start capturing:
curl -X POST http://localhost:8000/api/monitoring/start

End capturing:
curl -X POST http://localhost:8000/api/monitoring/stop