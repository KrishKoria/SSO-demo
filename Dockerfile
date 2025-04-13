FROM node:23-slim

# Set working directory
WORKDIR /app

# Create shared directory for files
RUN mkdir -p /app/shared

# Copy package files
COPY package.json ./

# Install dependencies using npm
RUN npm install

# Copy project files
COPY . .

# Create empty secret.key file in shared directory
RUN echo "5c0fd634386529b075a99b3639a26d288b1bd3574358151ecc6cf4dd2f4b84c0" > /app/shared/secret.key

# Initialize tokens file in shared directory
RUN echo "[]" > /app/shared/tokens.json

# Expose both ports for the servers
EXPOSE 3001 3002

# Use environment variable to determine which server to start
CMD ["./start-servers.sh"]