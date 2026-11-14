import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '../../src/theme/tokens';
import { getSession, subscribeSession } from '../../src/lib/session';
import { TabBar } from '../../src/components/TabBar';

export default function TabsLayout() {
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;

    getSession().then((session) => {
      if (!active) return;
      setSignedIn(Boolean(session));
      setChecking(false);
    });

    const unsubscribe = subscribeSession((session) => {
      if (!active) return;
      setSignedIn(Boolean(session));
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  if (checking) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.light.primary} />
      </View>
    );
  }

  if (!signedIn) return <Redirect href="/(auth)/welcome" />;

  return (
    <Tabs
      tabBar={(props: any) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="wall" options={{ title: 'Wall' }} />
      <Tabs.Screen name="discover" options={{ title: 'Discover' }} />
      <Tabs.Screen name="vibes" options={{ title: 'Vibes' }} />
      <Tabs.Screen name="chats" options={{ title: 'Chats' }} />
      <Tabs.Screen name="me" options={{ title: 'Me' }} />
    </Tabs>
  );
}
