import React, { useRef, useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

export interface LeafletMarker {
  id: string;
  latitude: number;
  longitude: number;
  logoUrl?: string;
  name: string;
  category?: string;
}

export interface LeafletMapProps {
  /** Centro inicial e zoom do mapa */
  initialRegion: {
    latitude: number;
    longitude: number;
    zoom?: number; // 1-20, default 14
  };
  /** Lista de marcadores (estabelecimentos) */
  markers?: LeafletMarker[];
  /** Localizacao atual do usuario (pin azul) */
  userLocation?: { latitude: number; longitude: number } | null;
  /** Callback ao tocar em um marker */
  onMarkerPress?: (marker: LeafletMarker) => void;
  /** Mostrar pin azul da localizacao do usuario */
  showUserLocation?: boolean;
  /** Estilo do container */
  style?: ViewStyle | ViewStyle[];
}

const LeafletMap: React.FC<LeafletMapProps> = ({
  initialRegion,
  markers = [],
  userLocation,
  onMarkerPress,
  showUserLocation = true,
  style,
}) => {
  const webviewRef = useRef<WebView>(null);

  // Gerar HTML com Leaflet + OpenStreetMap
  // useMemo para nao re-renderizar a cada render do pai
  const html = useMemo(() => {
    const zoom = initialRegion.zoom ?? 14;
    const safeMarkers = JSON.stringify(markers).replace(/</g, '\\u003c');
    const safeUser = JSON.stringify(userLocation || null);

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; }
  body { background: #e5e3df; }
  .business-marker {
    width: 44px; height: 44px; border-radius: 50%;
    border: 3px solid #d31027; background: #fff;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
  }
  .business-marker img {
    width: 100%; height: 100%; object-fit: cover;
  }
  .business-marker-fallback {
    background: #d31027; color: #fff;
    font-weight: bold; font-size: 14px;
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
  }
  .user-marker {
    width: 18px; height: 18px; border-radius: 50%;
    background: #4285F4; border: 3px solid #fff;
    box-shadow: 0 0 0 2px rgba(66,133,244,0.5);
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0% { box-shadow: 0 0 0 0 rgba(66,133,244,0.7); }
    70% { box-shadow: 0 0 0 14px rgba(66,133,244,0); }
    100% { box-shadow: 0 0 0 0 rgba(66,133,244,0); }
  }
  .leaflet-popup-content { font-family: -apple-system, sans-serif; font-size: 13px; }
  .leaflet-popup-content b { color: #33001b; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function() {
  var map = L.map('map', { zoomControl: false, attributionControl: false })
    .setView([${initialRegion.latitude}, ${initialRegion.longitude}], ${zoom});

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  L.control.zoom({ position: 'bottomright' }).addTo(map);

  function postMsg(type, payload) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, payload: payload }));
    }
  }

  // --- Markers dos estabelecimentos ---
  var markers = ${safeMarkers};
  markers.forEach(function(m) {
    var html;
    if (m.logoUrl) {
      html = '<div class="business-marker"><img src="' + m.logoUrl + '" onerror="this.parentElement.innerHTML=\\'<div class=business-marker-fallback>\\' + (m.name ? m.name.charAt(0).toUpperCase() : \\'?\\') + \\'</div>\\'" /></div>';
    } else {
      html = '<div class="business-marker"><div class="business-marker-fallback">' + (m.name ? m.name.charAt(0).toUpperCase() : '?') + '</div></div>';
    }
    var icon = L.divIcon({
      html: html,
      className: '',
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });
    var marker = L.marker([m.latitude, m.longitude], { icon: icon }).addTo(map);
    marker.on('click', function() {
      postMsg('marker_press', m);
    });
    marker.bindPopup('<b>' + (m.name || '') + '</b>' + (m.category ? '<br/>' + m.category : ''));
  });

  // --- Pin do usuario ---
  var user = ${safeUser};
  if (user && user.latitude && user.longitude) {
    var userIcon = L.divIcon({
      html: '<div class="user-marker"></div>',
      className: '',
      iconSize: [18, 18],
      iconAnchor: [9, 9]
    });
    L.marker([user.latitude, user.longitude], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
  }

  // --- Comunicacao com React Native ---
  window.updateUserLocation = function(lat, lng) {
    // Pode ser chamado via injectJavaScript depois
  };

  postMsg('ready', { markers: markers.length });
})();
</script>
</body>
</html>`;
  }, [initialRegion.latitude, initialRegion.longitude, initialRegion.zoom, markers, userLocation]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'marker_press' && onMarkerPress) {
        onMarkerPress(data.payload);
      }
    } catch (e) {
      // ignora mensagens invalidas
    }
  };

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webviewRef}
        source={{ html }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        scalesPageToFit={false}
        originWhitelist={['*']}
        scrollEnabled={false}
        bounces={false}
        // Performance
        cacheEnabled
        // Visual
        androidLayerType="hardware"
        nestedScrollEnabled
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});

export default LeafletMap;
