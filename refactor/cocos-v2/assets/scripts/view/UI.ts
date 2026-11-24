import { Node, Layers, UITransform, Graphics, Color, Label, LabelOutline, Sprite, SpriteFrame, UIOpacity, Rect, Size, Vec2 } from 'cc';
export const COLORS = { mint: '#91ffe0', gold: '#ffe2a0', text: '#edf7ed', muted: '#a3c3be', panel: '#08252a', line: '#7b9d82' };
export type Icon = 'cannon' | 'wave' | 'missile' | 'shield' | 'medal' | 'orbit' | 'cell' | 'burst';
let theme: Record<string, SpriteFrame> = {}, icons: Record<string, SpriteFrame> = {}, sound: (() => void) | null = null;
export function installTheme(assets: Record<string, SpriteFrame>, onPress: () => void) {
  disposeTheme(); theme = assets; sound = onPress;
  for (const [key, inset] of [['ui-panel', 144], ['ui-button', 200]] as const) {
    const f = assets[key]; f.insetLeft = f.insetRight = inset; f.insetTop = f.insetBottom = key === 'ui-panel' ? 166 : 138;
  }
  const a = assets['ui-icons'], w = a.rect.width / 4, h = a.rect.height / 2;
  (['cannon','wave','missile','shield','medal','orbit','cell','burst'] as Icon[]).forEach((key, i) => {
    const f = new SpriteFrame(); f.reset({ texture: a.texture, rect: new Rect(i % 4 * w, Math.floor(i / 4) * h, w, h), originalSize: new Size(w, h), offset: new Vec2(0, 0) }); f.packable = false; icons[key] = f;
  });
}
export function disposeTheme() { for (const f of Object.values(icons)) f.destroy(); icons = {}; theme = {}; sound = null; }
export function color(hex: string) { const c = new Color(); c.fromHEX(hex); return c; }
export function node(parent: Node, name: string, x = 0, y = 0, w = 0, h = 0) { const n = new Node(name); n.layer = Layers.Enum.UI_2D; parent.addChild(n); n.setPosition(x, -y, 0); const t = n.addComponent(UITransform); t.setAnchorPoint(0, 1); t.setContentSize(w, h); return n; }
function skin(parent: Node, kind: 'ui-panel' | 'ui-button', w: number, h: number, tint = '#ffffff') {
  const unit = kind === 'ui-panel' ? 6 : 12;
  const n = node(parent, 'Material', 0, 0, w * unit, h * unit), s = n.addComponent(Sprite);
  s.spriteFrame = theme[kind]; s.type = Sprite.Type.SLICED; s.sizeMode = Sprite.SizeMode.CUSTOM; s.color = color(tint);
  n.getComponent(UITransform)!.setContentSize(w * unit, h * unit); n.setScale(1 / unit, 1 / unit, 1); return s;
}
export function box(parent: Node, name: string, x: number, y: number, w: number, h: number, fill = '#08252ae8', stroke = '#3a6b68', radius = 14) {
  const n = node(parent, name, x, y, w, h);
  if (name !== 'Shade' && theme['ui-panel']) { skin(n, 'ui-panel', w, h); return n; }
  const g = n.addComponent(Graphics); g.roundRect(0, -h, w, h, radius); g.fillColor = color(fill); g.fill(); if (radius) { g.lineWidth = 1; g.strokeColor = color(stroke); g.stroke(); } return n;
}
export function text(parent: Node, value: string, x: number, y: number, w: number, h: number, size = 16, tint = COLORS.text, align: 'left' | 'center' | 'right' = 'left', bold = false) {
  const n = node(parent, 'Text', x, y, w, h), l = n.addComponent(Label); l.string = value; l.fontSize = size; l.lineHeight = Math.ceil(size * 1.3); l.fontFamily = 'Arial'; l.useSystemFont = true; l.color = color(tint); l.isBold = bold; l.overflow = Label.Overflow.SHRINK; l.enableWrapText = true;
  l.horizontalAlign = align === 'center' ? Label.HorizontalAlign.CENTER : align === 'right' ? Label.HorizontalAlign.RIGHT : Label.HorizontalAlign.LEFT; l.verticalAlign = Label.VerticalAlign.CENTER;
  if (bold) { const edge = n.addComponent(LabelOutline); edge.color = color('#042126'); edge.width = size > 32 ? 2 : 1; }
  return l;
}
export function icon(parent: Node, name: Icon, x: number, y: number, size = 46) { return sprite(parent, name, icons[name], x + size / 2, y + size / 2, size, size).node; }
export function divider(parent: Node, x: number, y: number, w: number) { const n = node(parent, 'Inlay', x, y); const g = n.addComponent(Graphics); g.moveTo(0, 0); g.lineTo(w, 0); g.lineWidth = 1; g.strokeColor = color('#cebc7580'); g.stroke(); return n; }
export function button(parent: Node, name: string, title: string, x: number, y: number, w: number, h: number, action: () => void, primary = false, enabled = true, art?: Icon) {
  const n = node(parent, name, x, y, w, h), face = node(n, 'PressSurface', 0, 0, w, h);
  if (theme['ui-button']) skin(face, 'ui-button', w, h, primary ? '#ffffff' : '#b4d9d0');
  else box(face, 'Fallback', 0, 0, w, h);
  if (art) icon(face, art, 14, (h - 40) / 2, 40);
  const l = text(face, title, art ? 59 : 12, 0, w - (art ? 73 : 24), h - 3, primary ? 20 : 17, primary ? COLORS.gold : COLORS.text, 'center', primary);
  const opacity = n.addComponent(UIOpacity); opacity.opacity = enabled ? 255 : 105; let down = false, sx = 0, sy = 0;
  const press = (yes: boolean) => { face.setPosition(yes ? 2 : 0, yes ? -2 : 0); face.setScale(yes ? .988 : 1, yes ? .978 : 1, 1); };
  const start = (e: any) => { if (e.getButton && e.getButton() !== 0) return; e.propagationStopped = true; if (!enabled) return; const p = e.getUILocation(); sx = p.x; sy = p.y; down = true; press(true); if (sound) sound(); };
  const move = (e: any) => { const p = e.getUILocation(); if (Math.abs(p.x - sx) + Math.abs(p.y - sy) > 22) { down = false; press(false); } };
  const cancel = () => { down = false; press(false); };
  const end = (e: any) => { e.propagationStopped = true; const go = down && enabled; down = false; press(false); if (go) action(); };
  n.on(Node.EventType.TOUCH_START, start); n.on(Node.EventType.TOUCH_MOVE, move); n.on(Node.EventType.TOUCH_CANCEL, cancel); n.on(Node.EventType.TOUCH_END, end);
  n.on(Node.EventType.MOUSE_DOWN, start); n.on(Node.EventType.MOUSE_MOVE, move); n.on(Node.EventType.MOUSE_LEAVE, cancel); n.on(Node.EventType.MOUSE_UP, end);
  return { node: n, label: l, face };
}
export function meter(parent: Node, x: number, y: number, w: number, h: number, tint = COLORS.mint) {
  const n = node(parent, 'Meter', x, y, w, h), g = n.addComponent(Graphics); g.roundRect(0, -h, w, h, h / 2); g.fillColor = color('#001416'); g.fill(); g.strokeColor = color('#96814b'); g.lineWidth = 1; g.stroke();
  const fill = node(n, 'Fill', 2, 2), f = fill.addComponent(Graphics); f.roundRect(0, -(h - 4), w - 4, h - 4, (h - 4) / 2); f.fillColor = color(tint); f.fill();
  return { node: n, set: (value: number) => fill.setScale(Math.max(.001, Math.min(1, value)), 1, 1) };
}
export function sprite(parent: Node, name: string, frame: SpriteFrame, x: number, y: number, w: number, h: number) { const n = node(parent, name, x, y, w, h); n.getComponent(UITransform)!.setAnchorPoint(.5, .5); const s = n.addComponent(Sprite); s.spriteFrame = frame; s.sizeMode = Sprite.SizeMode.CUSTOM; n.getComponent(UITransform)!.setContentSize(w, h); return { node: n, sprite: s }; }
