#!/bin/sh

# Start server1
npm run start:web1 &

# Start server2
npm run start:web2 &

# Wait for both processes
wait