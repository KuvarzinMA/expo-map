import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Coordinates, MarkerData } from '../types';

interface Props {
  markers: MarkerData[];
  onLongPress: (coords: Coordinates) => void;
  onMarkerPress: (id: string) => void;
}

const INITIAL_CENTER: [number, number] = [50.0755, 14.4378];
const LONG_PRESS_MS = 600;
const MOVE_TOLERANCE_PX = 10;

// Веб-версия карты на Leaflet (react-native-maps в браузере не работает).
// Добавление маркера: долгое нажатие мышью/пальцем или правый клик.
export default function Map({ markers, onLongPress, onMarkerPress }: Props) {
  const hostRef = useRef<View>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  // Актуальные колбэки без пересоздания карты.
  const longPressRef = useRef(onLongPress);
  const markerPressRef = useRef(onMarkerPress);
  longPressRef.current = onLongPress;
  markerPressRef.current = onMarkerPress;

  // Создание карты один раз.
  useEffect(() => {
    const host = hostRef.current as unknown as HTMLElement | null;
    if (!host) return;

    const container = document.createElement('div');
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.position = 'relative';
    container.style.zIndex = '0'; // изолируем z-index панелей Leaflet
    host.appendChild(container);

    const map = L.map(container).setView(INITIAL_CENTER, 12);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const layer = L.layerGroup().addTo(map);
    mapRef.current = map;
    layerRef.current = layer;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let startPoint: L.Point | null = null;
    let lastFiredAt = 0;

    const fire = (latlng: L.LatLng) => {
      const now = Date.now();
      if (now - lastFiredAt < 800) return; // защита от дублей
      lastFiredAt = now;
      longPressRef.current({ latitude: latlng.lat, longitude: latlng.lng });
    };
    const cancel = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      startPoint = null;
    };

    map.on('mousedown', (e: L.LeafletMouseEvent) => {
      if (e.originalEvent && 'button' in e.originalEvent && e.originalEvent.button !== 0) return;
      cancel();
      startPoint = e.containerPoint;
      timer = setTimeout(() => {
        fire(e.latlng);
        cancel();
      }, LONG_PRESS_MS);
    });
    map.on('mousemove', (e: L.LeafletMouseEvent) => {
      if (startPoint && e.containerPoint.distanceTo(startPoint) > MOVE_TOLERANCE_PX) cancel();
    });
    map.on('mouseup dragstart zoomstart', cancel);
    map.on('contextmenu', (e: L.LeafletMouseEvent) => fire(e.latlng)); // правый клик

    return () => {
      cancel();
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
      host.removeChild(container);
    };
  }, []);

  // Синхронизация маркеров.
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    layer.clearLayers();

    markers.forEach((m) => {
      const icon = L.divIcon({
        className: '',
        html:
          '<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;' +
          'background:#e74c3c;border:2px solid #fff;transform:rotate(-45deg);' +
          'box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
        iconSize: [22, 22],
        iconAnchor: [11, 22],
      });
      L.marker([m.latitude, m.longitude], { icon, title: m.title })
        .on('click', () => markerPressRef.current(m.id))
        .addTo(layer);
    });
  }, [markers]);

  return <View ref={hostRef} style={StyleSheet.absoluteFill} />;
}
