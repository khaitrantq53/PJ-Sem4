import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function parkingConfigPlugin() {
  return {
    name: 'parking-client-config',
    configureServer(server) {
      server.middlewares.use('/config.js', (_request, response) => {
        const config = {
          googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
          googleMapsMapId: process.env.GOOGLE_MAPS_MAP_ID || '',
          defaultMapCenter: {
            lat: Number(process.env.DEFAULT_MAP_LAT || 21.0278),
            lng: Number(process.env.DEFAULT_MAP_LNG || 105.8342),
          },
          defaultMapZoom: Number(process.env.DEFAULT_MAP_ZOOM || 13),
        };

        response.setHeader('Cache-Control', 'no-store');
        response.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        response.end(`window.PARKING_CONFIG = ${JSON.stringify(config)};`);
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), parkingConfigPlugin()],
  server: {
    port: Number(process.env.PORT || 5173),
    proxy: {
      '/api': {
        target: process.env.BACKEND_URL || 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
});
