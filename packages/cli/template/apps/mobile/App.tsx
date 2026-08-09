import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { createMobileComposition, mobileRegistry, startMobileExtensions } from './composition';

const composition = createMobileComposition();

export default function App() {
  const [status, setStatus] = useState('starting');
  useEffect(() => {
    const runtime = startMobileExtensions();
    void runtime.ready.then(
      () => setStatus('ready'),
      () => setStatus('failed'),
    );
    return () => {
      void runtime.stop();
    };
  }, []);
  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>SPARFRAME CORE</Text>
        <Text style={styles.title}>A frame for the system you want to build.</Text>
        <Text style={styles.body}>
          The mobile shell is ready. Add application-owned extensions to build your workspace on top
          of the core.
        </Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, status === 'ready' && styles.ready]} />
          <Text style={styles.status}>Runtime {status}</Text>
          <Text style={styles.muted}>·</Text>
          <Text style={styles.status}>Composition {composition.status}</Text>
        </View>
      </View>
      <View style={styles.detail}>
        <Text style={styles.label}>REGISTERED EXTENSIONS</Text>
        <Text style={styles.value}>{mobileRegistry.list().length}</Text>
        <Text style={styles.detailBody}>
          The starter begins with an intentionally empty catalog.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#0C111B', flex: 1, gap: 16, justifyContent: 'center', padding: 24 },
  hero: {
    backgroundColor: '#141C2B',
    borderColor: 'rgba(179, 198, 239, 0.16)',
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
  },
  eyebrow: { color: '#7E9DFC', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  title: { color: '#F7F9FF', fontSize: 38, fontWeight: '800', letterSpacing: -1.5, marginTop: 20 },
  body: { color: '#AEBBD3', fontSize: 16, lineHeight: 25, marginTop: 16 },
  statusRow: { alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 24 },
  statusDot: { backgroundColor: '#EABF64', borderRadius: 8, height: 8, width: 8 },
  ready: { backgroundColor: '#53D2A0' },
  status: { color: '#D9E2F4', fontSize: 13, fontWeight: '700' },
  muted: { color: '#5B6A84', fontSize: 13 },
  detail: {
    backgroundColor: '#141C2B',
    borderColor: 'rgba(179, 198, 239, 0.16)',
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
  },
  label: { color: '#7E9DFC', fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  value: { color: '#F7F9FF', fontSize: 24, fontWeight: '800', marginTop: 12 },
  detailBody: { color: '#AEBBD3', fontSize: 14, lineHeight: 21, marginTop: 5 },
});
