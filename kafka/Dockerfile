FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Compile TypeScript
RUN npm run build

# Expose any necessary ports
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"]