import React, { useEffect, useMemo, useState } from 'react';
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

export default function CollegeSelectionScreen() {
  const router = useRouter();
  const setCollege = useOnboardingStore((state) => state.setCollege);

  const [searchQuery, setSearchQuery] = useState('');
  const [colleges, setColleges] = useState<College[]>([]);
  const [selectedCollege, setSelectedCollege] = useState<College | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadColleges();
  }, []);

  const filteredColleges = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return colleges;
    return colleges.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.city?.toLowerCase().includes(query) ||
        c.state?.toLowerCase().includes(query)
    );
  }, [searchQuery, colleges]);

  async function loadColleges() {
    setError(null);
    try {
      const { colleges: list } = await collegesApi.list();
      setColleges(list);
    } catch (err) {
      console.error('Failed to load colleges:', err);
      setError('Could not load colleges. Check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleContinue() {
    if (!selectedCollege) return;
    setCollege(selectedCollege);
    router.push('/(auth)/username');
  }

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
          placeholder="Search colleges..."
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

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.light.primary} />
          <Text style={styles.loadingText}>Loading colleges...</Text>
        </View>
      ) : error ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📡</Text>
          <Text style={styles.emptyTitle}>Can't reach SWAY</Text>
          <Text style={styles.emptyText}>{error}</Text>
          <Button size="sm" onPress={loadColleges} style={styles.retry}>
            Try again
          </Button>
        </View>
      ) : filteredColleges.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🏫</Text>
          <Text style={styles.emptyTitle}>No colleges found</Text>
          <Text style={styles.emptyText}>
            {searchQuery ? 'Try a different search term' : 'No colleges available yet'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredColleges}
          renderItem={renderCollege}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadColleges();
              }}
              tintColor={colors.light.primary}
            />
          }
        />
      )}

      <View style={styles.footer}>
        <Button fullWidth onPress={handleContinue} disabled={!selectedCollege}>
          Continue
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
    marginBottom: spacing.md,
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
