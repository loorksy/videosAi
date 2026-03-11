module.exports = {
  apps: [
    {
      name: 'videosai-node',
      cwd: __dirname,
      script: 'npm',
      args: 'run start:node',
      env: { PORT: 3011 },
      interpreter: 'none',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
    },
    {
      name: 'videosai-python',
      cwd: __dirname,
      script: 'backend/.venv/bin/python',
      args: '-m uvicorn backend.server:app --host 127.0.0.1 --port 8000',
      env: { PYTHONUNBUFFERED: 1 },
      interpreter: 'none',
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
    },
  ],
};
