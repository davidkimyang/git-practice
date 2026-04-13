import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// 알림이 앱 포그라운드에 있을 때도 표시되도록 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/**
 * 알림 권한 요청 및 초기 설정
 * 앱 시작 시 한 번 호출
 */
export async function setupNotifications() {
  if (!Device.isDevice) {
    // 에뮬레이터에서는 권한 요청 불필요
    return true;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('알림 권한이 거부되었습니다.');
    return false;
  }

  // Android 알림 채널 설정
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('subway-alert', {
      name: '지하철 하차 알림',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#1A56DB',
      sound: 'default',
    });
  }

  return true;
}

/**
 * "1정거장 전" 알림 발송
 */
export async function sendOneStopBeforeAlert(stationName, lineName) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🚉 1정거장 전입니다!',
      body: `곧 ${stationName}역에 도착합니다. 하차 준비하세요.`,
      sound: 'default',
      data: { type: 'one_stop_before', station: stationName, line: lineName },
      ...(Platform.OS === 'android' && { channelId: 'subway-alert' }),
    },
    trigger: null, // 즉시 발송
  });
}

/**
 * "도착역" 알림 발송
 */
export async function sendArrivalAlert(stationName, lineName) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🔔 도착역입니다!',
      body: `${stationName}역에 도착했습니다. 지금 내리세요!`,
      sound: 'default',
      data: { type: 'arrival', station: stationName, line: lineName },
      ...(Platform.OS === 'android' && { channelId: 'subway-alert' }),
    },
    trigger: null,
  });
}

/**
 * 예약된 모든 알림 취소
 */
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * 알림 수신 리스너 등록
 * @param {function} onReceive - 알림 수신 시 콜백
 * @returns cleanup 함수
 */
export function addNotificationListener(onReceive) {
  const subscription = Notifications.addNotificationReceivedListener(onReceive);
  return () => subscription.remove();
}
