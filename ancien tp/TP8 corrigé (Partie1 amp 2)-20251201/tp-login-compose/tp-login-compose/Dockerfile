# Base image with Node.js
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy dependency files and install packages
COPY package*.json ./
RUN npm install

# Copy the rest of the app
COPY . .

# Expose port 3000 for the Node.js app
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]
