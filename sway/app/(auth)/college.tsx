import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer, Button } from '../../src/components/ui';
import { colors, spacing, typography, radius } from '../../src/theme/tokens';
import { collegesApi, type College } from '../../src/lib/api';
import { useOnboardingStore } from '../../src/features/auth/onboardingStore';

const DEBOUNCE_MS = 300;
const MIN_QUERY = 2;

export default function CollegeSelectionScreen() {
  const router = useRouter();
  const storedCollege = useOnboardingStore((state) => state.college);
  const setCollege = useOnboardingStore((state) => state.setCollege);

  const [searchQuery, setSearchQuery] = useState('');
  const [colleges, setColleges] = useState<College[]>([]);
  const [selectedCollege, setSelectedCollege] = useState<College | null>(
    storedCollege
      ? {
          id: storedCollege.id,
          name: storedCollege.name,
          city: storedCollege.city ?? null,
          state: storedCollege.state ?? null,
        }
      : null
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestId = useRef(0);

  // Debounced server search: the directory holds ~50k institutions.
  useEffect(() => {
    const query = searchQuery.trim();
    const timer = setTimeout(() => loadColleges(query), query ? DEBOUNCE_MS : 0);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  async function loadColleges(query: string) {
    const current = requestId.current + 1;
    requestId.current = current;

    if (!query) setLoading(true);
    setError(null);

    try {
      const { colleges: list } = await collegesApi.search(query);
      if (requestId.current !== current) return;
      setColleges(list);
    } catch (err) {
      if (requestId.current !== current) return;
      console.error('Failed to load colleges:', err);
      setError('Could not load colleges. Check your connection.');
    } finally {
      if (requestId.current === current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }

  function handleContinue() {
    if (!selectedCollege) return;
    setCollege(selectedCollege);
    router.push('/(auth)/username');
  }

  const trimmedQuery = searchQuery.trim();
  const tooShort = trimmedQuery.length === 1;

  const hint = useMemo(() => {
    if (tooShort) return 'Type at least 2 letters to search';
    if (!trimmedQuery) return 'Popular campuses · search to find yours';
    return `${colleges.length} ${colleges.length === 1 ? 'result' : 'results'} for “${trimmedQuery}”`;
  }, [tooShort, trimmedQuery, colleges.length]);

  function renderCollege({ item }: { item: College }) {
    const isSelected = selectedCollege?.id === item.id;

    return (
      <TouchableOpacity
        style={[styles.collegeCard, isSelected && styles.collegeCardSelected]}
        onPress={() => setSelectedCollege(item)}
        activeOpacity={0.7}
      >
        <View style={styles.collegeInfo}>
          <Text style={styles.collegeName}>{item.name}</Text>
          {(item.city || item.state) && (
            <Text style={styles.collegeLocation}>
              {[item.city, item.state].filter(Boolean).join(', ')}
            </Text>
          )}
        </View>
        {isSelected && (
          <View style={styles.checkmark}>
            <Text style={styles.checkmarkIcon}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <ScreenContainer padding={false}>
      <View style={styles.header}>
        <Text style={styles.step}>STEP 1 / 6</Text>
        <Text style={styles.title}>Select Your College</Text>
        <Text style={styles.subtitle}>Join your campus community on SWAY</Text>
      </View>

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search colleges by name or city"
          placeholderTextColor={colors.light.onSurfaceVariant}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="words"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.hint}>{hint}</Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.light.primary} />
          <Text style={styles.loadingText}>Loading colleges...</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📡</Text>
          <Text style={styles.emptyTitle}>Can&apos;t reach SWAY</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <Button size="sm" onPress={() => loadColleges(trimmedQuery)} style={styles.retry}>
            Try again
          </Button>
        </View>
      ) : tooShort ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>⌨️</Text>
          <Text style={styles.emptyTitle}>Keep typing</Text>
          <Text style={styles.emptyText}>Two letters are enough to start searching.</Text>
        </View>
      ) : colleges.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🏫</Text>
          <Text style={styles.emptyTitle}>No colleges found</Text>
          <Text style={styles.emptyText}>
            Try the short form (IIT, NIT, MIT) or the city name.
          </Text>
        </View>
      ) : (
        <FlatList
          data={colleges}
          renderItem={renderCollege}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadColleges(trimmedQuery);
              }}
              tintColor={colors.light.primary}
            />
          }
        />
      )}

      <View style={styles.footer}>
        <Button fullWidth onPress={handleContinue} disabled={!selectedCollege}>
          {selectedCollege ? `Continue as ${selectedCollege.name}` : 'Continue'}
        </Button>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.marginMobile,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  step: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: typography.labelSm.fontSize,
    letterSpacing: typography.labelSm.letterSpacing,
    color: colors.light.onSurfaceVariant,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: typography.headlineLgMobile.fontFamily,
    fontSize: typography.headlineLgMobile.fontSize,
    lineHeight: 38,
    fontWeight: '800',
    color: colors.light.onSurface,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: typography.bodyMd.fontFamily,
    fontSize: typography.bodyMd.fontSize,
    color: colors.light.onSurfaceVariant,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.light.surfaceContainerLow,
    marginHorizontal: spacing.marginMobile,
    paddingHorizontal: spacing.md,
    borderRadius: radius.default,
    height: 48,
  },
  searchIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: typography.bodyMd.fontFamily,
    fontSize: typography.bodyMd.fontSize,
    color: colors.light.onSurface,
  },
  clearButton: {
    padding: spacing.xs,
  },
  clearIcon: {
    fontSize: 16,
    color: colors.light.onSurfaceVariant,
  },
  hint: {
    fontFamily: typography.labelSm.fontFamily,
    fontSize: 11,
    color: colors.light.onSurfaceVariant,
    marginHorizontal: spacing.marginMobile,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  listContent: {
    paddingHorizontal: spacing.marginMobile,
    paddingBottom: 120,
  },
  collegeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.light.surfaceContainerLowest,
    padding: spacing.md,
    borderRadius: radius.default,
    marginBottom: spacing.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  collegeCardSelected: {
    borderColor: colors.light.primary,
    backgroundColor: colors.light.primaryFixed,
  },
  collegeInfo: {
    flex: 1,
  },
  collegeName: {
    fontFamily: typography.bodyMd.fontFamily,
    fontSize: typography.bodyMd.fontSize,
    fontWeight: '600',
    color: colors.light.onSurface,
    marginBottom: 2,
  },
  collegeLocation: {
    fontFamily: typography.bodySm.fontFamily,
    fontSize: typography.bodySm.fontSize,
    color: colors.light.onSurfaceVariant,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  checkmarkIcon: {
    color: colors.light.onPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing['2xl'],
  },
  loadingText: {
    fontFamily: typography.bodyMd.fontFamily,
    fontSize: typography.bodyMd.fontSize,
    color: colors.light.onSurfaceVariant,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing['2xl'],
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontFamily: typography.headlineMd.fontFamily,
    fontSize: typography.headlineMd.fontSize,
    fontWeight: '700',
    color: colors.light.onSurface,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontFamily: typography.bodyMd.fontFamily,
    fontSize: typography.bodyMd.fontSize,
    color: colors.light.onSurfaceVariant,
    textAlign: 'center',
  },
  retry: {
    marginTop: spacing.md,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.marginMobile,
    backgroundColor: colors.light.surface,
    borderTopWidth: 1,
    borderTopColor: colors.light.outlineVariant,
  },
});
