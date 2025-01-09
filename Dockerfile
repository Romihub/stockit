FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install

#copy
COPY . .

EXPOSE 5000

CMD ["node", "src/index.js"]