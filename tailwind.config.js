const path = require('path');

module.exports = {
  content: [
    path.join(__dirname, 'src/**/*.{ts,tsx,html}'),
  ],
  theme: { extend: {} },
  plugins: [],
};
