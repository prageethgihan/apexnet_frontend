// =============================================================================
// ecosystem.config.js  —  PM2 process config for ApexNet LK Backend
//
// Usage (on your VPS, inside the `server/` directory):
//   npm install          # install dependencies first
//   pm2 start ecosystem.config.js
//   pm2 save             # persist across VPS reboots
//   pm2 startup          # generate systemd script (follow the printed command)
//
// Other useful commands:
//   pm2 logs apexnet-backend    # tail logs
//   pm2 status                  # check process state
//   pm2 restart apexnet-backend # after code changes
//   pm2 stop    apexnet-backend
// =============================================================================

module.exports = {
  apps: [
    {
      name: 'apexnet-backend',
      script: 'index.js',

      // ── Working directory ────────────────────────────────────────────────
      // Adjust if you clone the repo to a different path on the VPS.
      cwd: '/root/vpn-site/server',   // ← change to your actual path

      // ── Process model ────────────────────────────────────────────────────
      // 'cluster' forks one process per CPU core for zero-downtime reloads.
      // Use 'fork' if you only have 1 vCPU.
      instances:   1,
      exec_mode:   'fork',

      // ── Environment ──────────────────────────────────────────────────────
      // PM2 reads the .env file automatically via dotenv inside index.js,
      // but you can also hard-code non-secret values here.
      env: {
        NODE_ENV: 'production',
        PORT:     5000,
      },

      // ── Logging ──────────────────────────────────────────────────────────
      out_file:      '/root/vpn-site/logs/out.log',
      error_file:    '/root/vpn-site/logs/error.log',
      merge_logs:    true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // ── Restart behaviour ────────────────────────────────────────────────
      watch:          false,    // set to true during development
      max_restarts:   10,
      min_uptime:     '5s',
      restart_delay:  3000,

      // ── Auto-restart on crashes ──────────────────────────────────────────
      autorestart: true,
    },
  ],
}
