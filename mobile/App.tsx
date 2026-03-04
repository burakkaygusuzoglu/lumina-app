import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/* ── Colour palette ──────────────────────────────────────────────────────── */
const COLORS = {
  bg:       '#f8f7f4',
  surface:  '#ffffff',
  text:     '#1a1a1a',
  muted:    '#8f8f8f',
  mind:     '#7b6fda',
  wellness: '#3daa86',
  vault:    '#d4864a',
  life:     '#4a8fd4',
  journal:  '#c4607a',
};

/* ── Placeholder screens ─────────────────────────────────────────────────── */
function HomeScreen() {
  return (
    <ScrollView style={styles.page} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.label}>✨ LUMINA</Text>
      <Text style={styles.heading}>Good morning</Text>
      <View style={[styles.card, { backgroundColor: '#f0eeff', borderLeftWidth: 4, borderLeftColor: COLORS.mind }]}>
        <Text style={[styles.cardLabel, { color: COLORS.mind }]}>⚡ AI GREETING</Text>
        <Text style={styles.cardBody}>Loading your personalized greeting…</Text>
      </View>

      {/* Module grid */}
      <Text style={[styles.label, { marginTop: 24, marginBottom: 12 }]}>YOUR MODULES</Text>
      <View style={styles.grid}>
        {[
          { label: 'Mind',     emoji: '🧠', color: COLORS.mind     },
          { label: 'Wellness', emoji: '💪', color: COLORS.wellness  },
          { label: 'Vault',    emoji: '🔐', color: COLORS.vault     },
          { label: 'Life',     emoji: '📅', color: COLORS.life      },
          { label: 'Journal',  emoji: '📖', color: COLORS.journal   },
        ].map((m) => (
          <TouchableOpacity key={m.label} style={[styles.moduleCard, { borderTopColor: m.color }]}>
            <Text style={{ fontSize: 28, marginBottom: 6 }}>{m.emoji}</Text>
            <Text style={[styles.moduleLabel, { color: m.color }]}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

function MindScreen()     { return <PlaceholderScreen label="🧠 Mind"    color={COLORS.mind}    desc="Your memories & notes" />; }
function WellnessScreen() { return <PlaceholderScreen label="💪 Wellness" color={COLORS.wellness} desc="Mood & sleep tracking" />; }
function LifeScreen()     { return <PlaceholderScreen label="📅 Life"    color={COLORS.life}    desc="Tasks & goals" />; }
function JournalScreen()  { return <PlaceholderScreen label="📖 Journal" color={COLORS.journal} desc="Reflections & time capsules" />; }

function PlaceholderScreen({ label, color, desc }: { label: string; color: string; desc: string }) {
  return (
    <View style={[styles.page, { alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ fontSize: 64, marginBottom: 16 }}>{label.split(' ')[0]}</Text>
      <Text style={[styles.heading, { color }]}>{label.split(' ').slice(1).join(' ')}</Text>
      <Text style={styles.muted}>{desc}</Text>
      <Text style={[styles.muted, { marginTop: 24, fontSize: 12 }]}>Coming soon in full release</Text>
    </View>
  );
}

/* ── Navigation ──────────────────────────────────────────────────────────── */
const Tab = createBottomTabNavigator();

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, [IoniconName, IoniconName]> = {
  Home:    ['home',          'home-outline'         ],
  Mind:    ['sparkles',      'sparkles-outline'     ],
  Wellness:['heart',         'heart-outline'        ],
  Life:    ['calendar',      'calendar-outline'     ],
  Journal: ['book',          'book-outline'         ],
};

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              const icons = TAB_ICONS[route.name];
              const name  = icons ? (focused ? icons[0] : icons[1]) : 'ellipse-outline';
              return <Ionicons name={name} size={size} color={color} />;
            },
            tabBarActiveTintColor:   COLORS.mind,
            tabBarInactiveTintColor: COLORS.muted,
            tabBarStyle: {
              backgroundColor: COLORS.surface,
              borderTopColor:  'rgba(0,0,0,0.06)',
              paddingBottom:   4,
              height:          60,
            },
            tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
            headerStyle:      { backgroundColor: COLORS.bg, shadowColor: 'transparent', elevation: 0 },
            headerTitleStyle: { color: COLORS.text, fontWeight: '700', fontSize: 18 },
          })}
        >
          <Tab.Screen name="Home"     component={HomeScreen}     options={{ title: 'Home'     }} />
          <Tab.Screen name="Mind"     component={MindScreen}     options={{ title: 'Mind'     }} />
          <Tab.Screen name="Wellness" component={WellnessScreen} options={{ title: 'Wellness' }} />
          <Tab.Screen name="Life"     component={LifeScreen}     options={{ title: 'Life'     }} />
          <Tab.Screen name="Journal"  component={JournalScreen}  options={{ title: 'Journal'  }} />
        </Tab.Navigator>
      </NavigationContainer>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}

/* ── Styles ──────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    color: COLORS.muted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  muted: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  cardBody: {
    fontSize: 14,
    color: COLORS.muted,
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  moduleCard: {
    width: '47%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    borderTopWidth: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  moduleLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
});

