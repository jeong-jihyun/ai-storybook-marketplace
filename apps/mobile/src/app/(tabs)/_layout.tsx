import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { colors, fonts } from '../../theme';

type IconName = ComponentProps<typeof Ionicons>['name'];
const icon = (on: IconName, off: IconName) => ({ color, focused }: { color: ColorValue; focused: boolean }) => (
  <Ionicons name={focused ? on : off} size={24} color={color as string} />
);

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryText,
        tabBarInactiveTintColor: colors.inkMute,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line, height: 64, paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: fonts.title, fontSize: 12, marginBottom: 6 },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: '홈', tabBarIcon: icon('home', 'home-outline') }} />
      <Tabs.Screen name="categories" options={{ title: '카테고리', tabBarIcon: icon('grid', 'grid-outline') }} />
      <Tabs.Screen name="search" options={{ title: '검색', tabBarIcon: icon('search', 'search-outline') }} />
      <Tabs.Screen name="library" options={{ title: '내 서재', tabBarIcon: icon('library', 'library-outline') }} />
      <Tabs.Screen name="my" options={{ title: '마이', tabBarIcon: icon('person-circle', 'person-circle-outline') }} />
    </Tabs>
  );
}
