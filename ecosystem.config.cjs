module.exports = {
  apps: [
    {
      name: 'videosai-node',
      cwd: __dirname,
      script: 'npx',
      args: 'tsx server/server.ts',
      env: { PORT: 3011 },
      interpreter: 'none',
    },
  ],
};
