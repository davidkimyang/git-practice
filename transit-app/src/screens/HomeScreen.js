import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getFavorites, getRecent, removeFavorite } from '../utils/storage';
import { SUBWAY_LINES } from '../data/subwayData';

export default function HomeScreen({ navigation }) {
  const [favorites, setFavorites] = useState([]);
  const [recent, setRecent] = useState([]);

  // 화면 포커스 때마다 즐겨찾기/최근 갱신
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    const [favs, recs] = await Promise.all([getFavorites(), getRecent()]);
    setFavorites(favs);
    setRecent(recs);
  }

  function handleStartNew() {
    navigation.navigate('LineSelect');
  }

  function handleRoutePress(route) {
    navigation.navigate('Monitor', { route });
  }

  async function handleDeleteFavorite(route) {
    Alert.alert('즐겨찾기 삭제', `${route.label || `${route.fromStation} → ${route.toStation}`}을(를) 삭제할까요?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await removeFavorite(route);
          loadData();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* 새 이동 시작 버튼 */}
        <TouchableOpacity style={styles.startButton} onPress={handleStartNew} activeOpacity={0.85}>
          <Text style={styles.startButtonIcon}>🚇</Text>
          <Text style={styles.startButtonText}>새 이동 시작하기</Text>
          <Text style={styles.startButtonSub}>노선과 역을 선택하세요</Text>
        </TouchableOpacity>

        {/* 즐겨찾기 */}
        {favorites.length > 0 && (
          <Section title="⭐  즐겨찾기">
            {favorites.map((route, idx) => (
              <RouteCard
                key={idx}
                route={route}
                onPress={() => handleRoutePress(route)}
                onLongPress={() => handleDeleteFavorite(route)}
              />
            ))}
          </Section>
        )}

        {/* 최근 경로 */}
        {recent.length > 0 && (
          <Section title="🕐  최근 경로">
            {recent.map((route, idx) => (
              <RouteCard
                key={idx}
                route={route}
                onPress={() => handleRoutePress(route)}
              />
            ))}
          </Section>
        )}

        {favorites.length === 0 && recent.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>🗺️</Text>
            <Text style={styles.emptyText}>아직 이용 기록이 없어요.</Text>
            <Text style={styles.emptySubText}>위 버튼을 눌러 이동을 시작해보세요!</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function RouteCard({ route, onPress, onLongPress }) {
  const line = SUBWAY_LINES[route.lineName];
  const lineColor = line?.color || '#888';

  return (
    <TouchableOpacity
      style={styles.routeCard}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.75}
    >
      <View style={[styles.lineBadge, { backgroundColor: lineColor }]}>
        <Text style={styles.lineBadgeText}>{route.lineName}</Text>
      </View>
      <View style={styles.routeInfo}>
        <Text style={styles.routeStations}>
          {route.fromStation} → {route.toStation}
        </Text>
        {route.label ? (
          <Text style={styles.routeLabel}>{route.label}</Text>
        ) : null}
      </View>
      <Text style={styles.routeArrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FB',
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },

  // 시작 버튼
  startButton: {
    backgroundColor: '#1A56DB',
    borderRadius: 18,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 28,
    shadowColor: '#1A56DB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  startButtonIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  startButtonSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    marginTop: 4,
  },

  // 섹션
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },

  // 경로 카드
  routeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  lineBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 12,
    minWidth: 56,
    alignItems: 'center',
  },
  lineBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  routeInfo: {
    flex: 1,
  },
  routeStations: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
  },
  routeLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  routeArrow: {
    fontSize: 22,
    color: '#bbb',
    marginLeft: 8,
  },

  // 빈 상태
  emptyBox: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 52,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
  },
  emptySubText: {
    fontSize: 13,
    color: '#aaa',
    marginTop: 6,
  },
});
