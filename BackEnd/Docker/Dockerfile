<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> e5777a6ae18a78206ad33272e7a723dc7291fe03
FROM python:3.12-slim

WORKDIR /app

# System deps for psycopg2-binary are not required; keep image slim
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY . /app

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
<<<<<<< HEAD
=======
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
>>>>>>> f3125b3 (changes)
=======
>>>>>>> e5777a6ae18a78206ad33272e7a723dc7291fe03
