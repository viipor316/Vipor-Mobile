// VIPOR Service — technician GPS publisher (hook).
// While a job is active, watches the device location and POSTs it to the backend
// so the customer's map updates. Call from the tech's active-job screen:
//   useLocationPublisher(jobId, isActive);

import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { api } from './api';

export function useLocationPublisher(jobId, active) {
  const subRef = useRef(null);

  useEffect(() => {
    if (!jobId || !active) return;
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;

      subRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 4000, distanceInterval: 25 },
        (pos) => {
          // fire-and-forget; a dropped ping just means the next one updates the map
          api.post(`/jobs/${jobId}/location`, {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }).catch(() => {});
        }
      );
    })();

    return () => {
      cancelled = true;
      subRef.current?.remove();
      subRef.current = null;
    };
  }, [jobId, active]);
}
