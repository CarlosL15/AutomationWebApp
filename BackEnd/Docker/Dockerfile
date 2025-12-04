FROM python:3.13-slim

WORKDIR /app

COPY BackEnd/requirements.txt requirements.txt
RUN pip install -r requirements.txt

COPY BackEnd/Src/ .

CMD uvicorn main:app --host=0.0.0.0  --reload