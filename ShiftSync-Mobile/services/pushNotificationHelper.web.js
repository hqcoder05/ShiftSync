// Browser notifications are handled by the Web Notification API.  Expo's native
// module must not be imported on web because it emits an unsupported-token warning.
export async function registerForPushNotificationsAsync() {
  return null;
}
