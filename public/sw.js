// RoboDoctor AI Service Worker for Desktop & Laptop Reminders

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle Notification Clicks (Focus or Open RoboDoctor Reminder Page)
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url) || "/medicine-reminder";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("/medicine-reminder") && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle Messages from Main Client Thread
self.addEventListener("message", (event) => {
  if (!event.data) return;

  if (event.data.type === "SHOW_NOTIFICATION") {
    const { title, body, tag, icon, url } = event.data;
    self.registration.showNotification(title || "RoboDoctor AI", {
      body: body || "Your scheduled health reminder is due.",
      icon: icon || "/logo.png",
      badge: icon || "/logo.png",
      tag: tag || "robodoctor-reminder",
      vibrate: [200, 100, 200],
      data: { url: url || "/medicine-reminder" },
    });
  }
});

// Handle Web Push Events (if Web Push is triggered)
self.addEventListener("push", (event) => {
  let title = "RoboDoctor AI Health Reminder";
  let body = "Your scheduled health task or medicine is due.";
  let icon = "/logo.png";
  let tag = "robodoctor-push-reminder";
  let url = "/medicine-reminder";

  if (event.data) {
    try {
      const payload = event.data.json();
      title = payload.title || title;
      body = payload.body || body;
      icon = payload.icon || icon;
      tag = payload.tag || tag;
      url = payload.url || url;
    } catch {
      body = event.data.text() || body;
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: icon,
      tag,
      vibrate: [200, 100, 200],
      data: { url },
    })
  );
});
