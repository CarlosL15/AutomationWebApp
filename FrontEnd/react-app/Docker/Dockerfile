<<<<<<< HEAD
<<<<<<< HEAD
FROM node:24.11.1-alpine
=======
FROM node:20-alpine
>>>>>>> f3125b3 (changes)
=======
FROM node:24.11.1-alpine
>>>>>>> e5777a6ae18a78206ad33272e7a723dc7291fe03

WORKDIR /app

COPY package*.json ./
<<<<<<< HEAD
<<<<<<< HEAD
RUN npm ci
=======
RUN npm install
>>>>>>> f3125b3 (changes)
=======
RUN npm ci
>>>>>>> e5777a6ae18a78206ad33272e7a723dc7291fe03

COPY . .

EXPOSE 5173

<<<<<<< HEAD
<<<<<<< HEAD
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
=======
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
>>>>>>> f3125b3 (changes)
=======
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
>>>>>>> e5777a6ae18a78206ad33272e7a723dc7291fe03
