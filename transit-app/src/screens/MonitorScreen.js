import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  fetchArrivalInfo,
  parseRemainingStops,
  parseRemainingSeconds,
} from '../api/subwayApi';
import {
  sendOneStopBeforeAlert,
  sendArrivalAlert,
  cancelAllNotifications,
} from '../utils/notifications';
import { saveFavorite, saveRecent } from '../utils/storage';
import { SUBWAY_LINES, getStationsBetween, getDirection } from '../data/subwayData';

const POLL_INTERVAL_MS = 30_000; // 30초마다 API 폴링

// 알림 상태 (중복 발송 방지)
const ALERT_NONE = 'none';
const ALERT_ONE_STOP = 'one_stop';
const ALERT_ARRIVED = 'arrived';

export default function MonitorScreen({ route, navigation }) {
  const { route: tripRoute } = route.params;
  const { lineName, fromStation, toStation } = tripRoute;

  const line = SUBWAY_LINES[lineName];
  const lineColor = line?.color || '#1A56DB';
  const totalStops = getStationsBetween(lineName, fromStation, toStation);
  const direction = getDirection(lineName, fromStation, toStation);

  const [status, setStatus] = useState('loading'); // loading | monitoring | arrived | error
  const [arrivals, setArrivals] = useState([]);
  const [remainingStops, setRemainingStops] = useState(totalStops);
  const [remainingSecs, setRemainingSecs] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isFavorited, setIsFavorited] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const alertSentRef = useRef(ALERT_NONE);
  const pollingRef = useRef(null);

  // 최초 진입 시 최근 경로 저장
  useEffect(() => {
    saveRecent(tripRoute);
  }, []);

  // 폴링 시작/정지
  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, []);

  function startPolling() {
    poll(); // 즉시 1회
    pollingRef.current = setInterval(poll, POLL_INTERVAL_MS);
  }

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }

  const poll = useCallback(async () => {
    try {
      // 도착역 기준으로 폴링 (열차가 목적지에 몇 정거장 전인지 확인)
      const data = await fetchArrivalInfo(toStation);
      setArrivals(data);
      setLastUpdated(new Date());
      setStatus('monitoring');
      setErrorMsg('');

      // 해당 노선 + 방향의 열차 찾기
      const relevant = data.filter((item) => {
        const sameLineId = item.subwayId === line?.id;
        const dirMatch =
          direction === null ||
          item.trainLineNm?.includes(
            direction === '외선순환' ? '외선' : direction === '내선순환' ? '내선' : ''
          ) ||
          true; // 방향 매칭이 어려운 경우 모든 방향 허용
        return sameLineId;
      });

      if (relevant.length === 0) {
        // 해당 노선 열차 없음 → 전체 데이터 표시
        setRemainingStops(totalStops);
        return;
      }

      // 가장 가까이 있는 열차 선택
      const closest = relevant.reduce((best, item) => {
        const stopsA = parseRemainingStops(best);
        const stopsB = parseRemainingStops(item);
        return stopsB < stopsA ? item : best;
      }, relevant[0]);

      const stops = parseRemainingStops(closest);
      const secs = parseRemainingSeconds(closest);

      setRemainingStops(stops);
      setRemainingSecs(secs);

      // 알림 트리거
      if (stops <= 0 && alertSentRef.current !== ALERT_ARRIVED) {
        alertSentRef.current = ALERT_ARRIVED;
        Vibration.vibrate([0, 400, 200, 400]);
        await sendArrivalAlert(toStation, lineName);
        setStatus('arrived');
        stopPolling();
      } else if (stops === 1 && alertSentRef.current === ALERT_NONE) {
        alertSentRef.current = ALERT_ONE_STOP;
        Vibration.vibrate([0, 200, 100, 200]);
        await sendOneStopBeforeAlert(toStation, lineName);
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message || '정보를 불러오지 못했습니다.');
    }
  }, [line, toStation, direction, totalStops, lineName]);

  async function handleFavorite() {
    await saveFavorite(tripRoute);
    setIsFavorited(true);
    Alert.alert('즐겨찾기 저장', `${fromStation} → ${toStation} 경로가 저장되었습니다.`);
  }

  function handleStop() {
    Alert.alert('이동 종료', '알림 모니터링을 종료할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '종료',
        style: 'destructive',
        onPress: async () => {
          stopPolling();
          await cancelAllNotifications();
          navigation.navigate('Home');
        },
      },
    ]);
  }

  // ─── 렌더링 ───────────────────────────────────

  if (status === 'loading') {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={lineColor} />
        <Text style={styles.loadingText}>실시간 정보 불러오는 중...</Text>
      </SafeAreaView>
    );
  }

  if (status === 'arrived') {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: '#E8F5E9' }]} edges={['bottom']}>
        <Text style={styles.arrivedIcon}>🎉</Text>
        <Text style={styles.arrivedTitle}>도착!</Text>
        <Text style={styles.arrivedStation}>{toStation}역</Text>
        <Text style={styles.arrivedSub}>안전하게 내리세요.</Text>
        <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.navigate('Home')}>
          <Text style={styles.doneBtnText}>홈으로</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const progressRatio =
    totalStops > 0
      ? Math.max(0, Math.min(1, 1 - remainingStops / totalStops))
      : 0;

  const remainingSecsText = remainingSecs != null
    ? remainingSecs < 60
      ? `약 ${remainingSecs}초 후`
      : `약 ${Math.round(remainingSecs / 60)}분 후`
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* API 키 미설정 안내 배너 */}
        {arrivals[0]?._isMock && (
          <View style={styles.mockBanner}>
            <Text style={styles.mockBannerText}>
              ⚠️ 데모 모드 — API 키 설정 후 실제 데이터를 사용할 수 있습니다
            </Text>
          </View>
        )}

        {/* 오류 배너 */}
        {status === 'error' && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>⚠️ {errorMsg}</Text>
            <TouchableOpacity onPress={poll}>
              <Text style={styles.retryText}>재시도</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 노선 정보 카드 */}
        <View style={[styles.lineCard, { borderLeftColor: lineColor }]}>
          <View style={[styles.lineBadge, { backgroundColor: lineColor }]}>
            <Text style={styles.lineBadgeText}>{lineName}</Text>
          </View>
          <View style={styles.lineCardInfo}>
            <Text style={styles.lineCardRoute}>
              {fromStation} → {toStation}
            </Text>
            {direction && (
              <Text style={styles.lineCardDirection}>{direction} 방향</Text>
            )}
          </View>
        </View>

        {/* 메인 상태 카드 */}
        <View style={styles.mainCard}>
          {remainingStops <= 0 ? (
            <>
              <Text style={styles.statusEmoji}>🔔</Text>
              <Text style={styles.statusTitle}>지금 내리세요!</Text>
              <Text style={styles.statusStation}>{toStation}역 도착</Text>
            </>
          ) : remainingStops === 1 ? (
            <>
              <Text style={styles.statusEmoji}>⚠️</Text>
              <Text style={styles.statusTitle}>1정거장 전!</Text>
              <Text style={styles.statusStation}>다음역 {toStation}</Text>
              {remainingSecsText && (
                <Text style={styles.statusTime}>{remainingSecsText}</Text>
              )}
            </>
          ) : (
            <>
              <Text style={styles.remainingNumber}>{remainingStops}</Text>
              <Text style={styles.remainingLabel}>정거장 남음</Text>
              {remainingSecsText && (
                <Text style={styles.statusTime}>{remainingSecsText}</Text>
              )}
            </>
          )}
        </View>

        {/* 진행 바 */}
        <View style={styles.progressSection}>
          <View style={styles.progressLabels}>
            <Text style={styles.progressFrom}>{fromStation}</Text>
            <Text style={styles.progressTo}>{toStation}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progressRatio * 100}%`, backgroundColor: lineColor },
              ]}
            />
            <View
              style={[
                styles.progressDot,
                {
                  left: `${progressRatio * 100}%`,
                  backgroundColor: lineColor,
                },
              ]}
            />
          </View>
          <Text style={styles.progressStops}>
            총 {totalStops}정거장 중 {totalStops - remainingStops}번째 지남
          </Text>
        </View>

        {/* 실시간 도착 목록 */}
        {arrivals.length > 0 && (
          <View style={styles.arrivalSection}>
            <Text style={styles.arrivalTitle}>
              {toStation}역 도착 예정 열차
            </Text>
            {arrivals.slice(0, 3).map((item, idx) => (
              <View key={idx} style={styles.arrivalRow}>
                <View style={[styles.arrivalDot, { backgroundColor: lineColor }]} />
                <View style={styles.arrivalInfo}>
                  <Text style={styles.arrivalMsg}>{item.trainLineNm}</Text>
                  <Text style={styles.arrivalStatus}>{item.arvlMsg2}</Text>
                </View>
                <Text style={styles.arrivalTime}>
                  {parseRemainingSeconds(item) != null
                    ? parseRemainingSeconds(item) < 60
                      ? `${parseRemainingSeconds(item)}초`
                      : `${Math.round(parseRemainingSeconds(item) / 60)}분`
                    : '-'}
                </Text>
              </View>
            ))}
            {lastUpdated && (
              <Text style={styles.updatedAt}>
                {lastUpdated.toLocaleTimeString('ko-KR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })} 기준
              </Text>
            )}
          </View>
        )}

        {/* 액션 버튼들 */}
        <View style={styles.actions}>
          {!isFavorited && (
            <TouchableOpacity style={styles.favoriteBtn} onPress={handleFavorite}>
              <Text style={styles.favoriteBtnText}>⭐  즐겨찾기 저장</Text>
            </TouchableOpacity>
          )}
          {isFavorited && (
            <View style={styles.favoritedLabel}>
              <Text style={styles.favoritedLabelText}>⭐  즐겨찾기에 저장됨</Text>
            </View>
          )}
          <TouchableOpacity style={styles.stopBtn} onPress={handleStop}>
            <Text style={styles.stopBtnText}>이동 종료</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FB',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F6FB',
    gap: 16,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },

  // 배너
  mockBanner: {
    backgroundColor: '#FFF3CD',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  mockBannerText: {
    fontSize: 12,
    color: '#856404',
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: '#FDECEA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorBannerText: {
    fontSize: 12,
    color: '#C62828',
    flex: 1,
  },
  retryText: {
    fontSize: 12,
    color: '#1A56DB',
    fontWeight: '600',
    marginLeft: 8,
  },

  // 노선 카드
  lineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  lineBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 12,
  },
  lineBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  lineCardInfo: { flex: 1 },
  lineCardRoute: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
  },
  lineCardDirection: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },

  // 메인 상태 카드
  mainCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  statusEmoji: {
    fontSize: 52,
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111',
  },
  statusStation: {
    fontSize: 16,
    color: '#555',
    marginTop: 4,
  },
  statusTime: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
  },
  remainingNumber: {
    fontSize: 72,
    fontWeight: '900',
    color: '#1A56DB',
    lineHeight: 80,
  },
  remainingLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#555',
    marginTop: 4,
  },

  // 진행 바
  progressSection: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressFrom: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  progressTo: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#E8ECF2',
    borderRadius: 4,
    position: 'relative',
    overflow: 'visible',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressDot: {
    position: 'absolute',
    top: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: -8,
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  progressStops: {
    fontSize: 11,
    color: '#aaa',
    marginTop: 12,
    textAlign: 'center',
  },

  // 도착 목록
  arrivalSection: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  arrivalTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#444',
    marginBottom: 12,
  },
  arrivalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  arrivalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  arrivalInfo: { flex: 1 },
  arrivalMsg: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  arrivalStatus: {
    fontSize: 12,
    color: '#888',
    marginTop: 1,
  },
  arrivalTime: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A56DB',
  },
  updatedAt: {
    fontSize: 11,
    color: '#bbb',
    marginTop: 10,
    textAlign: 'right',
  },

  // 버튼들
  actions: {
    gap: 10,
  },
  favoriteBtn: {
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD54F',
  },
  favoriteBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#795548',
  },
  favoritedLabel: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  favoritedLabelText: {
    fontSize: 14,
    color: '#aaa',
  },
  stopBtn: {
    backgroundColor: '#FDECEA',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  stopBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C62828',
  },

  // 도착 완료 화면
  loadingText: {
    fontSize: 14,
    color: '#888',
  },
  arrivedIcon: {
    fontSize: 72,
    marginBottom: 8,
  },
  arrivedTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#2E7D32',
  },
  arrivedStation: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginTop: 4,
  },
  arrivedSub: {
    fontSize: 14,
    color: '#888',
    marginTop: 8,
  },
  doneBtn: {
    marginTop: 32,
    backgroundColor: '#2E7D32',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  doneBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
