import React, { useRef, useMemo, useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

export interface LeafletMarker {
  id: string;
  latitude: number;
  longitude: number;
  logoUrl?: string;
  name: string;
  category?: string;
  rating?: number;
}

export interface LeafletMapProps {
  /** Centro e zoom do mapa. Se mudar depois, o mapa se move para la. */
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
  /** Centralizar no usuario quando a posicao dele chegar pela primeira vez */
  centerOnUser?: boolean;
  /** Estilo do container */
  style?: ViewStyle | ViewStyle[];
}

type Region = LeafletMapProps['initialRegion'];
type UserPos = { latitude: number; longitude: number } | null | undefined;

// Serializa para JS embutido no HTML / injectJavaScript (escapa "<")
const toJs = (value: unknown): string =>
  JSON.stringify(value === undefined ? null : value).replace(/</g, '\\u003c');

// HTML do mapa. E gerado UMA vez; depois as mudancas sao enviadas via
// injectJavaScript, sem recarregar a pagina (antes recarregava a cada mudanca).
const buildHtml = (
  region: Region,
  markers: LeafletMarker[],
  user: UserPos,
  centerOnUser: boolean,
): string => {
  const zoom = region.zoom ?? 14;
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
  .business-marker-wrapper {
    position: relative;
    width: 44px; height: 60px;
  }
  .business-rating-badge {
    position: absolute;
    top: 40px; left: 50%;
    transform: translateX(-50%);
    background: #fff;
    color: #33001b;
    font-size: 10px;
    font-weight: bold;
    padding: 1px 6px;
    border-radius: 10px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    white-space: nowrap;
    line-height: 14px;
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
    .setView([${region.latitude}, ${region.longitude}], ${zoom});

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
  var markerLayer = L.layerGroup().addTo(map);
  function renderMarkers(list) {
    markerLayer.clearLayers();
    (list || []).forEach(function(m) {
      var html;
      if (m.logoUrl) {
        html = '<div class="business-marker"><img src="' + m.logoUrl + '" onerror="this.parentElement.innerHTML=\\'<div class=business-marker-fallback>\\' + (m.name ? m.name.charAt(0).toUpperCase() : \\'?\\') + \\'</div>\\'" /></div>';
      } else {
        html = '<div class="business-marker"><div class="business-marker-fallback">' + (m.name ? m.name.charAt(0).toUpperCase() : '?') + '</div></div>';
      }
      var badge = (m.rating && m.rating > 0) ? '<div class="business-rating-badge"><span style="color:#FFC107;">&#9733;</span> ' + Number(m.rating).toFixed(1) + '</div>' : '';
      html = '<div class="business-marker-wrapper">' + html + badge + '</div>';
      var icon = L.divIcon({
        html: html,
        className: '',
        iconSize: [44, 60],
        iconAnchor: [22, 22]
      });
      var marker = L.marker([m.latitude, m.longitude], { icon: icon });
      marker.on('click', function() {
        postMsg('marker_press', m);
      });
      marker.bindPopup('<b>' + (m.name || '') + '</b>' + (m.category ? '<br/>' + m.category : ''));
      markerLayer.addLayer(marker);
    });
  }

  // --- Pin do usuario ---
  var userMarker = null;
  var centeredOnUser = false;
  var userIcon = L.divIcon({
    html: '<div class="user-marker"></div>',
    className: '',
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });

  // --- Funcoes chamadas pelo React Native (injectJavaScript) ---
  window.__setMarkers = function(list) {
    renderMarkers(list);
  };
  window.__setUser = function(u, center) {
    if (!u || typeof u.latitude !== 'number' || typeof u.longitude !== 'number') { return; }
    var ll = [u.latitude, u.longitude];
    if (!userMarker) {
      userMarker = L.marker(ll, { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
    } else {
      userMarker.setLatLng(ll);
    }
    if (center && !centeredOnUser) {
      centeredOnUser = true;
      map.setView(ll, Math.max(map.getZoom(), 14));
    }
  };
  window.__setView = function(lat, lng, z) {
    map.setView([lat, lng], z || map.getZoom());
  };

  renderMarkers(${toJs(markers)});
  window.__setUser(${toJs(user)}, ${centerOnUser ? 'true' : 'false'});

  postMsg('ready', {});
})();
</script>
</body>
</html>`;
};

const LeafletMap: React.FC<LeafletMapProps> = ({
  initialRegion,
  markers = [],
  userLocation,
  onMarkerPress,
  showUserLocation = true,
  centerOnUser = true,
  style,
}) => {
  const webviewRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  const markersRef = useRef(markers);
  markersRef.current = markers;
  const userRef = useRef<UserPos>(userLocation);
  userRef.current = userLocation;

  // HTML gerado so na criacao do mapa (valores iniciais)
  const html = useMemo(
    () => buildHtml(initialRegion, markers, showUserLocation ? userLocation : null, centerOnUser),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const inject = (code: string) => {
    if (readyRef.current && webviewRef.current) {
      webviewRef.current.injectJavaScript(`${code}; true;`);
    }
  };

  const pushMarkers = () => {
    inject(`window.__setMarkers && window.__setMarkers(${toJs(markersRef.current)})`);
  };

  const pushUser = () => {
    if (showUserLocation && userRef.current) {
      inject(`window.__setUser && window.__setUser(${toJs(userRef.current)}, ${centerOnUser ? 'true' : 'false'})`);
    }
  };

  // Marcadores mudaram -> atualiza sem recarregar
  useEffect(() => {
    pushMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers]);

  // Usuario se moveu -> move o pin (e centraliza na primeira vez)
  const userLat = userLocation?.latitude;
  const userLng = userLocation?.longitude;
  useEffect(() => {
    pushUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLat, userLng]);

  // Centro pedido pela tela mudou -> move o mapa
  const firstRegionRef = useRef(true);
  useEffect(() => {
    if (firstRegionRef.current) {
      firstRegionRef.current = false;
      return;
    }
    const z = initialRegion.zoom ?? 'null';
    inject(`window.__setView && window.__setView(${initialRegion.latitude}, ${initialRegion.longitude}, ${z})`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRegion.latitude, initialRegion.longitude, initialRegion.zoom]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'ready') {
        readyRef.current = true;
        // envia o estado mais recente (pode ter mudado enquanto carregava)
        pushMarkers();
        pushUser();
      } else if (data.type === 'marker_press' && onMarkerPress) {
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
        cacheEnabled
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
