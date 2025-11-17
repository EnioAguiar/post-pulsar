# Use an official Node.js runtime as a parent image
FROM node:20-slim

# Install ffmpeg, Python, deno, and yt-dlp
# This is the key step to make video conversion and YouTube downloads possible
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    deno && \
    pip3 install --break-system-packages yt-dlp && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to leverage Docker cache
COPY package*.json ./

# Install any needed packages
RUN npm install

# Bundle app source
COPY . .

# Make port 8080 available to the world outside this container
EXPOSE 8080

# Define environment variable
ENV PORT 8080

# Run index.js when the container launches
CMD ["node", "index.js"]
