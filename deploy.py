"""Simple deployment script for running backend and frontend."""

import subprocess
import time


# Backend setup
print("📦 Installing backend dependencies...")
subprocess.run(["poetry", "install"], cwd="backend", check=True)

print("🚀 Starting backend server...")
backend_log = open("backend.log", "a")
backend_process = subprocess.Popen(
    ["poetry", "run", "poe", "serve"],
    cwd="backend",
    stdout=backend_log,
    stderr=subprocess.STDOUT,
)

# Frontend setup
print("📦 Installing frontend dependencies...")
subprocess.run(["npm", "install"], cwd="frontend", check=True)

print("🚀 Starting frontend server...")
frontend_log = open("frontend.log", "a")
frontend_process = subprocess.Popen(
    ["npm", "run", "server"],
    cwd="frontend",
    stdout=frontend_log,
    stderr=subprocess.STDOUT,
)

print("\n✅ Both services are running. Press Ctrl+C to stop.\n")

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    print("\n🛑 Shutting down...")
    backend_process.terminate()
    frontend_process.terminate()
    backend_process.wait()
    frontend_process.wait()
    print("✅ Services stopped.")
    backend_log.close()
    frontend_log.close()
