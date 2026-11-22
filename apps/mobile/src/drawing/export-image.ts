import { PaintStyle, Skia, StrokeCap, StrokeJoin } from '@shopify/react-native-skia';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { STRIP_W, stripHeight } from '@/game/geometry';
import type { Game } from '@/game/types';
import { colors } from '@/theme';
import { inkColor } from './paper';
import { strokePath } from './strokes';

/** Renders the whole unfolded page to a PNG, returned as base64. */
export function renderPagePng(game: Game, widthPx = 900): string {
  const scale = widthPx / STRIP_W;
  const unitsH = stripHeight(game);
  const heightPx = Math.round(unitsH * scale * game.sections.length);
  const surface = Skia.Surface.Make(widthPx, heightPx);
  if (!surface) throw new Error('Could not create an image surface');
  const canvas = surface.getCanvas();
  canvas.drawColor(Skia.Color(colors.paper));

  const paint = Skia.Paint();
  paint.setAntiAlias(true);
  paint.setStyle(PaintStyle.Stroke);
  paint.setStrokeCap(StrokeCap.Round);
  paint.setStrokeJoin(StrokeJoin.Round);

  game.sections.forEach((section, i) => {
    canvas.save();
    canvas.scale(scale, scale);
    canvas.translate(0, i * unitsH);
    // Keep each artist's ink inside their own fold.
    canvas.clipRect(Skia.XYWHRect(0, 0, STRIP_W, unitsH), 1, true);
    for (const stroke of section.strokes) {
      paint.setColor(Skia.Color(inkColor(stroke.color)));
      paint.setStrokeWidth(stroke.width);
      canvas.drawPath(strokePath(stroke.points), paint);
    }
    canvas.restore();
  });

  // A faint crease where the page was folded.
  const crease = Skia.Paint();
  crease.setColor(Skia.Color('rgba(31,36,48,0.08)'));
  crease.setStrokeWidth(Math.max(1, widthPx / 600));
  for (let i = 1; i < game.sections.length; i++) {
    const y = i * unitsH * scale;
    canvas.drawLine(0, y, widthPx, y, crease);
  }

  return surface.makeImageSnapshot().encodeToBase64();
}

/** Opens the share sheet on a phone, or downloads the PNG on web. */
export async function sharePage(game: Game) {
  const base64 = renderPagePng(game);
  const name = `madpix-${game.prompt ?? 'drawing'}-${game.id}.png`;
  if (Platform.OS === 'web') {
    const a = document.createElement('a');
    a.href = `data:image/png;base64,${base64}`;
    a.download = name;
    a.click();
    return;
  }
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(base64, { encoding: 'base64' });
  await Sharing.shareAsync(file.uri, { mimeType: 'image/png', dialogTitle: 'Share your MadPix' });
}
