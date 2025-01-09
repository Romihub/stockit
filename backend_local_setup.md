# Backend Local Setup Guide

## AI Service Setup

### Requirements
- Python 3.12+
- Microsoft C++ Build Tools (for Windows)
- Virtual environment

### Service folder
cd stockit/ai_service

### Installation
1. Create virtual environment:
   ```bash
   python -m venv venv
   ```
2. Activate environment:
   ```bash
   # Windows
   venv/Scripts/activate
   # Mac/Linux
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

### Running the Service
```bash
python run.py
```

### API Documentation
- Swagger UI: http://localhost:8001/docs
- OpenAPI Spec: http://localhost:8001/openapi.json

### Health Check
curl http://localhost:8001/health

{"status":"ok"}

- GET /health - Returns 200 if service is running


### Main API Routes
- POST /predict - Make predictions
- GET /docs - API documentation
- GET /openapi.json - OpenAPI specification

### Configuration
- Host: 0.0.0.0
- Port: 8001
- Reload: Enabled (development)
- Log Level: info

### Troubleshooting
- See lesson_learnt.txt for common issues and solutions
- Check terminal logs for errors


### Testings
The FastAPI server is running successfully on http://127.0.0.1:8000. We can now test the endpoints. The API has three endpoints:

POST /train - For training the model with historical data
POST /predict - For making predictions
GET /health - Health check endpoint
I'll test the health check endpoint first to verify basic functionality.

/c/K-Stockit
pip install -e stockit
uvicorn stockit.ai_service.api.main:app --reload --host 0.0.0.0