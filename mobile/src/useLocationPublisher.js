// VIPOR Service — technician GPS publisher (hook).
// While a job is active, watches the device location and POSTs it to the backend
// so the customer's map updates. Call from the tech's active-job screen:
//   useLocationPublisher(jobId, isActive);
//
// Dev fallback: if location permission is denied or GPS is unavailable (web,
// emulator), or EXPO_PUBLIC_SIMULATE_GPS=true is set, it simulates a technician
// driving toward the customer — so the demo works on a single device.

import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { api } from './api';

// Customer destination — matches LiveTrackingScreen's DESTINATION (Montreal demo).
const SIM_DEST = { lat: 45.5019, lng: -73.5674 };
const SIM_START = { lat: 45.478, lng: -73.600 };
const FORCE_SIM = process.env.EXPO_PUBLIC_SIMULATE_GPS === 'true';

export function useLocationPublisher(jobId, active) {
  const subRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!jobId || !active) return;
    let cancelled = false;

    const publish = (lat, lng) =>
      api.post(`/jobs/${jobId}/location`, { lat, lng }).catch(() => {});

    // Simulated technician driving from SIM_START toward the customer.
    function startSimulator() {
      if (timerRef.current) return;
      let t = 0; // progress 0 -> 1
      publish(SIM_START.lat, SIM_START.lng); // immediate first point
      timerRef.current = setInterval(() => {
        t = Math.min(1, t + 0.08);
        const lat = SIM_START.lat + (SIM_DEST.lat - SIM_START.lat) * t + Math.sin(t * 12) * 0.0004;
        const lng = SIM_START.lng + (SIM_DEST.lng - SIM_START.lng) * t + Math.cos(t * 12) * 0.0004;
        publish(lat, lng);
        if (t >= 1 && timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      }, 4000);
    }

    (async () => {
      if (FORCE_SIM) { startSimulator(); return; }
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;
        if (status !== 'granted') { startSimulator(); return; } // no permission -> simulate
        subRef.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 4000, distanceInterval: 25 },
          (pos) => publish(pos.coords.latitude, pos.coords.longitude)
        );
      } catch {
        if (!cancelled) startSimulator(); // GPS unavailable (web/emulator) -> simulate
      }
    })();

    return () => {
      cancelled = true;
      subRef.current?.remove();
      subRef.current = null;
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    };
  }, [jobId, active]);
}
