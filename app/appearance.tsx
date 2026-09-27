import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppearancePreview } from '@/components/AppearancePreview';
import { GlassCard } from '@/components/GlassCard';
import { BACKGROUND_CATEGORIES, approvedImagesIn, findBackgroundImage, type BackgroundCategoryId } from '@/data/backgroundCatalog';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useAppStore } from '@/store/useAppStore';
import { ACCENT_PALETTES, findAccentPalette } from '@/theme/accentPalettes';
import { useTheme } from '@/theme/ThemeProvider';
import { LIQUID_GLASS_STYLE_ID } from '@/theme/visualStyles';

type BackgroundMode = 'none' | 'catalog' | 'custom';

// "Configuración > Apariencia" (spec: Vista previa, Paleta, Fondo, Ajustar
// fondo, Confirmación). Todo vive en estado LOCAL hasta tocar Aplicar — así
// Cancelar de verdad regresa exactamente a lo que había, sin excepciones
// (spec: "previsualizar sin guardar... al cancelar, regresar exactamente al
// tema y fondo previos").
export default function Appearance() {
  const { colors, typography, spacing, radius } = useTheme();
  const { isTablet } = useBreakpoint();
  const profile = useAppStore((s) => s.profile);
  const setVisualStyle = useAppStore((s) => s.setVisualStyle);
  const updateProfileDraft = useAppStore((s) => s.updateProfileDraft);

  const [paletteId, setPaletteId] = useState(profile.accentPaletteId ?? ACCENT_PALETTES[0].id);
  const [mode, setMode] = useState<BackgroundMode>(profile.backgroundMode ?? 'none');
  const [catalogImageId, setCatalogImageId] = useState(profile.backgroundCatalogImageId);
  const [customUri, setCustomUri] = useState(profile.backgroundCustomUri);
  const [focalXMobile, setFocalXMobile] = useState(profile.backgroundFocalXMobile ?? 0.5);
  const [focalYMobile, setFocalYMobile] = useState(profile.backgroundFocalYMobile ?? 0.5);
  const [focalXDesktop, setFocalXDesktop] = useState(profile.backgroundFocalXDesktop ?? 0.5);
  const [focalYDesktop, setFocalYDesktop] = useState(profile.backgroundFocalYDesktop ?? 0.5);
  const [darkness, setDarkness] = useState(profile.backgroundDarkness ?? 0.55);
  const [blurAmount, setBlurAmount] = useState(profile.backgroundBlurAmount ?? 0.3);
  const [openCategory, setOpenCategory] = useState<BackgroundCategoryId | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const hasPhoto = mode !== 'none' && (!!catalogImageId || !!customUri);
  const catalogImage = findBackgroundImage(catalogImageId);
  const previewPhotoUri = mode === 'custom' ? customUri : undefined;
  const previewPhotoSource = mode === 'catalog' ? catalogImage?.source : undefined;

  const focalX = isTablet ? focalXDesktop : focalXMobile;
  const focalY = isTablet ? focalYDesktop : focalYMobile;
  const setFocal = (x: number, y: number) => {
    if (isTablet) {
      setFocalXDesktop(x);
      setFocalYDesktop(y);
    } else {
      setFocalXMobile(x);
      setFocalYMobile(y);
    }
  };

  const pickCustomPhoto = async () => {
    setUploadError(null);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setUploadError('Necesitamos permiso para acceder a tus fotos.');
        return;
      }
      setUploading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      if (!asset.uri) {
        setUploadError('No se pudo leer esa imagen — intenta con otra.');
        return;
      }
      if (Platform.OS === 'web') {
        // En web, expo-image-picker entrega un `blob:` URL — solo vive
        // mientras dura la pestaña/documento actual. Un PWA instalado en un
        // celular/iPad recarga el documento muy seguido (cambio de app,
        // presión de memoria de iOS), lo que mata ese blob y el fondo
        // "desaparece" — se veía como el error reportado. Se convierte a un
        // `data:` URI (persistente, sobrevive recargas) reescalado a un
        // tamaño manejable antes de guardarlo en el perfil.
        try {
          const dataUri = await blobUriToPersistentDataUri(asset.uri, 1600, 0.82);
          setCustomUri(dataUri);
        } catch {
          setUploadError('No se pudo procesar esa imagen — intenta con otra.');
          return;
        }
      } else {
        setCustomUri(asset.uri);
      }
      setMode('custom');
    } catch {
      setUploadError('Algo falló al abrir tus fotos. Vuelve a intentar.');
    } finally {
      setUploading(false);
    }
  };

  const handleApply = () => {
    setVisualStyle(LIQUID_GLASS_STYLE_ID, true);
    updateProfileDraft({
      accentPaletteId: paletteId,
      backgroundMode: mode,
      backgroundCatalogImageId: mode === 'catalog' ? catalogImageId : undefined,
      backgroundCustomUri: mode === 'custom' ? customUri : undefined,
      backgroundFocalXMobile: focalXMobile,
      backgroundFocalYMobile: focalYMobile,
      backgroundFocalXDesktop: focalXDesktop,
      backgroundFocalYDesktop: focalYDesktop,
      backgroundDarkness: darkness,
      backgroundBlurAmount: blurAmount,
    });
    router.back();
  };

  const handleReset = () => {
    setDarkness(0.55);
    setBlurAmount(0.3);
    setFocal(0.5, 0.5);
  };

  const previewBlock = (
    <View style={{ gap: spacing.sm }}>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>VISTA PREVIA</Text>
      <AppearancePreview
        accentPaletteId={paletteId}
        photoUri={previewPhotoUri}
        photoSource={previewPhotoSource}
        darkness={darkness}
        blurAmount={blurAmount}
        focalX={focalX}
        focalY={focalY}
        onFocalChange={setFocal}
        interactive={hasPhoto}
      />
    </View>
  );

  const paletteBlock = (
    <View style={{ gap: spacing.sm }}>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>PALETA</Text>
      <View style={styles.paletteGrid}>
        {ACCENT_PALETTES.map((p) => {
          const selected = p.id === paletteId;
          return (
            <Pressable
              key={p.id}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`Paleta ${p.name}`}
              onPress={() => setPaletteId(p.id)}
              style={[styles.paletteCard, { borderColor: selected ? p.accent : colors.surfaceBorder, borderRadius: radius.md, backgroundColor: colors.surfaceSolid }]}
            >
              <View style={styles.paletteSwatches}>
                <View style={[styles.swatch, { backgroundColor: p.insightSurface }]} />
                <View style={[styles.swatch, { backgroundColor: p.accent }]} />
                <View style={[styles.swatch, { backgroundColor: p.accentText }]} />
              </View>
              <Text style={[typography.caption, { color: colors.textPrimary, fontWeight: '600', marginTop: 6 }]} numberOfLines={1}>
                {p.name}
              </Text>
              {selected && <Ionicons name="checkmark-circle" size={16} color={p.accent} style={styles.paletteCheck} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  const fondoBlock = (
    <View style={{ gap: spacing.sm }}>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>FONDO</Text>
      <GlassCard padded={false} style={{ gap: 0 }}>
        <BackgroundOptionRow
          icon="contrast-outline"
          label="Sin foto"
          description="Solo el fondo oscuro cálido de Vidrio líquido."
          selected={mode === 'none'}
          onPress={() => setMode('none')}
          first
        />
        <BackgroundOptionRow
          icon="images-outline"
          label="Explorar colección"
          description={catalogImage ? catalogImage.title : 'Cinco categorías, listas para cuando subamos las fotos.'}
          selected={mode === 'catalog'}
          onPress={() => setOpenCategory(BACKGROUND_CATEGORIES[0].id)}
        />
        <BackgroundOptionRow
          icon="phone-portrait-outline"
          label="Mis fotos"
          description={customUri ? 'Foto privada de tu cuenta' : 'Sube una foto propia — nunca se hace pública.'}
          selected={mode === 'custom'}
          onPress={pickCustomPhoto}
          trailing={uploading ? <ActivityIndicator size="small" color={colors.accentFrom} /> : undefined}
        />
      </GlassCard>
      {uploadError && <Text style={{ color: colors.danger, fontSize: 12 }}>{uploadError}</Text>}
    </View>
  );

  const ajustarFondoBlock = hasPhoto && (
    <View style={{ gap: spacing.sm }}>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>AJUSTAR FONDO</Text>
      <GlassCard style={{ gap: spacing.md }}>
        <SimpleSlider label="Qué tan oscuro" value={darkness} onChange={setDarkness} />
        <SimpleSlider label="Qué tan nítido" value={1 - blurAmount} onChange={(v) => setBlurAmount(1 - v)} />
        <Text style={[typography.caption, { color: colors.textTertiary }]}>
          Para mover la foto, arrastra directamente sobre la vista previa de arriba.
        </Text>
        <Pressable onPress={handleReset}>
          <Text style={{ color: colors.accentFrom, fontWeight: '700', fontSize: 13 }}>Restablecer</Text>
        </Pressable>
      </GlassCard>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: spacing.md }}>
          <Ionicons name="chevron-back" size={24} color={colors.textSecondary} />
        </Pressable>
        <Text style={[typography.title, { color: colors.textPrimary, flex: 1 }]}>Apariencia</Text>
      </View>

      {isTablet ? (
        // En pantallas anchas, la vista previa vive en una columna FIJA junto
        // a los controles (spec: "la ficha de ajustar fondo esté al lado de
        // la imagen porque al hacer cambios no se puede ver cómo está
        // cambiando") — nunca se scrollea fuera de vista.
        <View style={{ flex: 1, flexDirection: 'row', gap: spacing.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
          <View style={{ width: 340 }}>{previewBlock}</View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ gap: spacing.lg, paddingBottom: 140 }}>
            {paletteBlock}
            {fondoBlock}
            {ajustarFondoBlock}
          </ScrollView>
        </View>
      ) : (
        // En celular no cabe una columna aparte — en su lugar, la vista
        // previa queda FIJA arriba (stickyHeaderIndices) mientras el resto
        // se desplaza debajo, así nunca desaparece de la pantalla al ajustar
        // los controles.
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 140 }} stickyHeaderIndices={[0]}>
          <View style={{ backgroundColor: colors.background, paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md }}>
            {previewBlock}
          </View>
          <View style={{ paddingHorizontal: spacing.lg, gap: spacing.lg }}>
            {paletteBlock}
            {fondoBlock}
            {ajustarFondoBlock}
          </View>
        </ScrollView>
      )}

      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.divider }]}>
        <Pressable onPress={() => router.back()} style={[styles.secondaryBtn, { borderColor: colors.surfaceBorder, borderRadius: radius.pill }]}>
          <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Cancelar</Text>
        </Pressable>
        <Pressable onPress={handleApply} style={[styles.primaryBtn, { backgroundColor: colors.accentFrom, borderRadius: radius.pill }]}>
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Aplicar</Text>
        </Pressable>
      </View>

      {openCategory && (
        <CategoryPickerModal
          categoryId={openCategory}
          onClose={() => setOpenCategory(null)}
          onSelectCategory={setOpenCategory}
          onSelectImage={(imageId) => {
            setCatalogImageId(imageId);
            setMode('catalog');
            setOpenCategory(null);
          }}
        />
      )}
    </SafeAreaView>
  );
}

// El `blob:` URL que entrega expo-image-picker en web solo vive mientras
// dura el documento actual — un PWA instalado en un celular/iPad recarga el
// documento muy seguido (cambio de app, presión de memoria de iOS), lo que
// mata ese blob y el fondo elegido desaparece. Se redibuja la foto en un
// <canvas> fuera de pantalla (reescalada a `maxDim` en su lado más largo,
// para no guardar varios MB de perfil en el store) y se codifica como
// `data:` URI, que sí sobrevive cualquier recarga porque viaja como texto
// dentro del propio perfil persistido.
function blobUriToPersistentDataUri(blobUri: string, maxDim: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new (window as unknown as { Image: new () => HTMLImageElement }).Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('No 2D context'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('No se pudo leer la imagen'));
    img.src = blobUri;
  });
}

function BackgroundOptionRow({
  icon,
  label,
  description,
  selected,
  onPress,
  first,
  trailing,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  selected: boolean;
  onPress: () => void;
  first?: boolean;
  trailing?: React.ReactNode;
}) {
  const { colors, typography, spacing } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.row, { padding: spacing.md, borderTopWidth: first ? 0 : 1, borderTopColor: colors.divider }]}
    >
      <Ionicons name={icon} size={18} color={colors.textSecondary} />
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>{label}</Text>
        <Text style={[typography.micro, { color: colors.textTertiary }]} numberOfLines={1}>
          {description}
        </Text>
      </View>
      {trailing}
      {selected && <Ionicons name="checkmark" size={18} color={colors.accentFrom} />}
    </Pressable>
  );
}

// Deslizador simple con toques (sin librería nueva): tocar o arrastrar sobre
// la barra fija el valor según la posición horizontal — suficiente para
// "Qué tan oscuro"/"Qué tan nítido", sin exigir una librería de gestos
// dedicada para dos controles.
function SimpleSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const { colors, typography } = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);

  const handleTouch = (x: number) => {
    if (trackWidth <= 0) return;
    onChange(Math.max(0, Math.min(1, x / trackWidth)));
  };

  return (
    <View>
      <View style={styles.sliderLabelRow}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[typography.caption, { color: colors.textTertiary }]}>{Math.round(value * 100)}%</Text>
      </View>
      <View
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={(e) => handleTouch(e.nativeEvent.locationX)}
        onResponderMove={(e) => handleTouch(e.nativeEvent.locationX)}
        style={[styles.sliderTrack, { backgroundColor: colors.divider }]}
      >
        <View style={[styles.sliderFill, { width: `${value * 100}%`, backgroundColor: colors.accentFrom }]} />
        <View style={[styles.sliderThumb, { left: `${value * 100}%`, backgroundColor: colors.accentFrom }]} />
      </View>
    </View>
  );
}

function CategoryPickerModal({
  categoryId,
  onClose,
  onSelectCategory,
  onSelectImage,
}: {
  categoryId: BackgroundCategoryId;
  onClose: () => void;
  onSelectCategory: (id: BackgroundCategoryId) => void;
  onSelectImage: (imageId: string) => void;
}) {
  const { colors, typography, spacing, radius, surface } = useTheme();
  const category = BACKGROUND_CATEGORIES.find((c) => c.id === categoryId)!;
  const images = approvedImagesIn(categoryId);

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surfaceSolid, borderColor: colors.surfaceBorder, borderWidth: surface.borderWidth, borderRadius: radius.lg }]}
        >
          <View style={styles.headerRow}>
            <Text style={[typography.headline, { color: colors.textPrimary, flex: 1 }]}>Explorar colección</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: spacing.sm }}>
            {BACKGROUND_CATEGORIES.map((cat) => {
              const active = cat.id === categoryId;
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => onSelectCategory(cat.id)}
                  style={[
                    styles.categoryChip,
                    { borderRadius: radius.pill, borderColor: active ? colors.accentFrom : colors.surfaceBorder, backgroundColor: active ? colors.accentSoft : 'transparent' },
                  ]}
                >
                  <Text style={{ color: active ? colors.accentFrom : colors.textSecondary, fontWeight: '600', fontSize: 12 }}>{cat.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={[typography.caption, { color: colors.textTertiary, marginBottom: spacing.sm }]}>{category.direction}</Text>

          {images.length === 0 ? (
            <View style={[styles.emptyCategory, { borderColor: colors.surfaceBorder, borderRadius: radius.md }]}>
              <Ionicons name="image-outline" size={22} color={colors.textTertiary} />
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 6, textAlign: 'center' }]}>
                Aún no hay fotos aprobadas en &quot;{category.name}&quot;.{'\n'}Pendiente de que se suban y revisen.
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.imageGrid}>
              {images.map((img) => (
                <Pressable key={img.id} onPress={() => onSelectImage(img.id)} style={[styles.imageThumb, { borderRadius: radius.sm }]}>
                  <Image source={img.source as number} resizeMode="cover" style={StyleSheet.absoluteFill} />
                </Pressable>
              ))}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  paletteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  paletteCard: { width: '31%', borderWidth: 1.5, padding: 10, position: 'relative' },
  paletteSwatches: { flexDirection: 'row', gap: 4 },
  swatch: { flex: 1, height: 22, borderRadius: 5 },
  paletteCheck: { position: 'absolute', top: 6, right: 6 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
  },
  secondaryBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderWidth: 1 },
  primaryBtn: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  sliderLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  sliderTrack: { height: 6, borderRadius: 3, justifyContent: 'center' },
  sliderFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 3 },
  sliderThumb: { position: 'absolute', width: 16, height: 16, borderRadius: 8, marginLeft: -8 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  sheet: { width: '100%', maxWidth: 480, maxHeight: '80%', padding: 20 },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1 },
  emptyCategory: { borderWidth: 1, borderStyle: 'dashed', padding: 24, alignItems: 'center' },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  imageThumb: { width: 90, height: 90, overflow: 'hidden' },
});
