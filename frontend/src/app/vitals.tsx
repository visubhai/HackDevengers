'use client';

import { useReportWebVitals } from 'next/web-vitals';

export function WebVitals() {
    useReportWebVitals((metric) => {
        // In an enterprise environment, this would be sent to an analytics endpoint
        // e.g., Datadog, Sentry, Google Analytics, or a custom /api/metrics route

        // For now, we log to console in development, or we could pass to a logger
        const body = JSON.stringify(metric);
        if (process.env.NODE_ENV === 'development') {
            console.log('Web Vitals:', metric.name, Math.round(metric.value));
        }

        // Example of sending to a custom endpoint:
        /*
        if (process.env.NEXT_PUBLIC_ANALYTICS_ID) {
          const url = '/api/metrics';
          if (navigator.sendBeacon) {
            navigator.sendBeacon(url, body);
          } else {
            fetch(url, { body, method: 'POST', keepalive: true });
          }
        }
        */
    });

    return null;
}
