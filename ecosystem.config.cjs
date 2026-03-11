const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

module.exports = {
  apps: [
    {
      name: 'storyweaver-node',
      cwd: __dirname,
      script: 'npx',
      args: 'tsx server/server.ts',
      interpreter: 'none',
      env: {
        PORT: process.env.PORT || 3011,
        JWT_SECRET: process.env.JWT_SECRET,
        INTERNAL_API_KEY: process.env.INTERNAL_API_KEY,
        NODE_ENV: 'production',
      },
      max_memory_restart: '512M',
      restart_delay: 3000,
      max_restarts: 10,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    {
      name: 'storyweaver-python',
      cwd: __dirname,
      script: 'python3',
      args: '-m uvicorn backend.server:app --host 127.0.0.1 --port 8000 --workers 2',
      interpreter: 'none',
      env: {
        MONGO_URL: process.env.MONGO_URL || 'mongodb://localhost:27017',
        DB_NAME: process.env.DB_NAME || 'storyweaver',
        JWT_SECRET: process.env.JWT_SECRET,
        NODE_URL: process.env.NODE_URL || 'http://127.0.0.1:3011',
        INTERNAL_API_KEY: process.env.INTERNAL_API_KEY,
        FAL_API_KEY: process.env.FAL_API_KEY || '',
        APP_URL: process.env.APP_URL || '',
      },
      max_memory_restart: '1G',
      restart_delay: 3000,
      max_restarts: 10,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
  ],
};
