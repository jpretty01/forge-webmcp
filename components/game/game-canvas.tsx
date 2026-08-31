'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DoorOpen, Hand, Heart, Shield, Swords } from 'lucide-react';

import { useForge } from '@/components/providers/forge-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const npcPositions = [{ x: 180, y: 170 }, { x: 390, y: 130 }, { x: 540, y: 220 }];
const itemPositions = [{ x: 260, y: 290 }, { x: 470, y: 310 }];

export function GameCanvas() {
  const { state, executeTool } = useForge();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [position, setPosition] = useState({ x: 340, y: 260 });
  const location = state.locations[state.player.locationId];
  const encounterEnemies = useMemo(() => location.encounterIds.flatMap((id) => state.encounters[id]?.enemyIds ?? []).map((id) => state.enemies[id]).filter(Boolean), [location.encounterIds, state.encounters, state.enemies]);
  const locationItems = location.itemIds.map((id) => state.items[id]).filter((item) => item && !item.collected);

  useEffect(() => setPosition({ x: 340, y: 260 }), [location.id]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    const ratio = window.devicePixelRatio || 1;
    const width = 720;
    const height = 430;
    canvas.width = width * ratio;
    canvas.height = height * ratio;
    context.scale(ratio, ratio);

    const background = context.createLinearGradient(0, 0, width, height);
    if (location.kind === 'town') { background.addColorStop(0, '#1a241f'); background.addColorStop(1, '#0c1312'); }
    else if (location.kind === 'wilds') { background.addColorStop(0, '#172018'); background.addColorStop(1, '#0a100c'); }
    else { background.addColorStop(0, '#171617'); background.addColorStop(1, '#090b0c'); }
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);

    context.strokeStyle = 'rgba(230, 215, 174, .055)';
    context.lineWidth = 1;
    for (let x = 0; x < width; x += 36) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke(); }
    for (let y = 0; y < height; y += 36) { context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke(); }

    if (location.kind === 'town') {
      context.fillStyle = '#28271f'; context.fillRect(65, 70, 170, 120); context.fillRect(485, 70, 150, 118);
      context.fillStyle = '#3a3325'; context.beginPath(); context.moveTo(48, 72); context.lineTo(150, 25); context.lineTo(252, 72); context.fill(); context.beginPath(); context.moveTo(470, 72); context.lineTo(560, 28); context.lineTo(652, 72); context.fill();
      context.fillStyle = '#4d3a20'; context.fillRect(127, 125, 42, 65); context.fillRect(542, 126, 38, 62);
      context.strokeStyle = 'rgba(243,190,88,.18)'; context.lineWidth = 28; context.beginPath(); context.moveTo(0, 325); context.quadraticCurveTo(330, 215, 720, 340); context.stroke();
    } else if (location.kind === 'wilds') {
      context.strokeStyle = '#24251d'; context.lineWidth = 48; context.beginPath(); context.moveTo(0, 360); context.quadraticCurveTo(345, 160, 720, 280); context.stroke();
      for (let i = 0; i < 12; i += 1) { const x = 30 + i * 61; const y = 70 + (i % 3) * 45; context.fillStyle = '#14271b'; context.beginPath(); context.moveTo(x, y - 38); context.lineTo(x - 24, y + 28); context.lineTo(x + 24, y + 28); context.fill(); }
    } else {
      context.strokeStyle = '#302b27'; context.lineWidth = 18; context.strokeRect(35, 35, 650, 355);
      context.strokeStyle = '#211f1d'; context.lineWidth = 6; for (let x = 55; x < 680; x += 64) { context.beginPath(); context.moveTo(x, 42); context.lineTo(x - 10, 385); context.stroke(); }
      context.fillStyle = '#4a321d'; context.fillRect(320, 34, 80, 22); context.fillStyle = 'rgba(236,174,76,.25)'; context.fillRect(338, 56, 44, 24);
    }

    context.textAlign = 'center'; context.textBaseline = 'middle';
    location.npcIds.forEach((npcId, index) => { const npc = state.npcs[npcId]; const point = npcPositions[index % npcPositions.length]; context.fillStyle = npc.state === 'missing' ? '#7c6f64' : '#e7bd73'; context.beginPath(); context.arc(point.x, point.y, 12, 0, Math.PI * 2); context.fill(); context.fillStyle = '#0b0e0f'; context.font = 'bold 10px sans-serif'; context.fillText(npc.name[0], point.x, point.y + 1); });
    encounterEnemies.forEach((enemy) => { if (enemy.defeated) return; const x = 110 + enemy.position.x * 6; const y = 70 + enemy.position.y * 4.6; context.fillStyle = '#8b4c43'; context.beginPath(); context.arc(x, y, 14, 0, Math.PI * 2); context.fill(); context.strokeStyle = '#e18b7c'; context.lineWidth = 2; context.stroke(); });
    locationItems.forEach((item, index) => { const point = itemPositions[index % itemPositions.length]; context.fillStyle = item.kind === 'key' ? '#f4c75e' : '#7bd4b0'; context.fillRect(point.x - 7, point.y - 7, 14, 14); context.strokeStyle = 'rgba(255,255,255,.45)'; context.strokeRect(point.x - 9, point.y - 9, 18, 18); });
    context.fillStyle = '#9ad5f3'; context.beginPath(); context.arc(position.x, position.y, 13, 0, Math.PI * 2); context.fill(); context.strokeStyle = '#d8f1ff'; context.lineWidth = 2; context.stroke(); context.fillStyle = '#0b1012'; context.font = 'bold 10px sans-serif'; context.fillText('A', position.x, position.y + 1);
  }, [encounterEnemies, location, locationItems, position, state.npcs]);

  useEffect(() => draw(), [draw]);

  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      const delta = 16;
      if (['ArrowUp', 'w', 'W'].includes(event.key)) setPosition((p) => ({ ...p, y: Math.max(22, p.y - delta) }));
      else if (['ArrowDown', 's', 'S'].includes(event.key)) setPosition((p) => ({ ...p, y: Math.min(408, p.y + delta) }));
      else if (['ArrowLeft', 'a', 'A'].includes(event.key)) setPosition((p) => ({ ...p, x: Math.max(22, p.x - delta) }));
      else if (['ArrowRight', 'd', 'D'].includes(event.key)) setPosition((p) => ({ ...p, x: Math.min(698, p.x + delta) }));
      else return;
      event.preventDefault();
    }
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, []);

  const activeEnemy = encounterEnemies.find((enemy) => !enemy.defeated);
  const firstNpc = location.npcIds[0] ? state.npcs[location.npcIds[0]] : undefined;
  const firstItem = locationItems[0];
  const nearbyGate = Object.values(state.gates).find((gate) => [gate.fromLocationId, gate.toLocationId].includes(location.id) && !gate.open);

  return (
    <section className="game-frame" aria-label={`Playable scene: ${location.name}`}>
      <div className="stage-toolbar">
        <div>
          <p className="eyebrow">Current location</p>
          <h1 className="mt-1 text-lg font-semibold">{location.name}</h1>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-rose-200"><Heart className="size-3.5" /> {state.player.health}/{state.player.maxHealth}</span>
          <span className="flex items-center gap-1.5 text-sky-200"><Shield className="size-3.5" /> {state.player.defense}</span>
        </div>
      </div>
      <div className="relative overflow-hidden rounded-b-2xl border border-white/8 bg-[#101615]">
        <canvas ref={canvasRef} className="block aspect-[720/430] w-full" aria-label={`Top-down game view of ${location.name}`} />
        <Badge variant="outline" className="absolute left-3 top-3 border-black/20 bg-black/55 text-zinc-200 backdrop-blur">{location.kind}</Badge>
        <div className="absolute bottom-3 left-3 flex max-w-[calc(100%-24px)] flex-wrap gap-2">
          {firstNpc && <Button size="sm" variant="secondary" onClick={() => executeTool('interact_npc', { npc_id: firstNpc.id })}><Hand /> Talk to {firstNpc.name.split(' ')[0]}</Button>}
          {firstItem && <Button size="sm" variant="secondary" onClick={() => executeTool('collect_item', { item_id: firstItem.id })}><Hand /> Collect {firstItem.name}</Button>}
          {activeEnemy && <Button size="sm" className="bg-rose-500 text-white hover:bg-rose-400" onClick={() => executeTool('attack_enemy', { enemy_id: activeEnemy.id })}><Swords /> Attack {state.enemyArchetypes[activeEnemy.archetypeId].name}</Button>}
          {nearbyGate && <Button size="sm" variant="secondary" onClick={() => executeTool('open_gate', { gate_id: nearbyGate.id })}><DoorOpen /> Open {nearbyGate.name}</Button>}
          {state.player.health < state.player.maxHealth && state.player.inventory.some((entry) => entry.itemId === 'item-healing-draught') && <Button size="sm" variant="secondary" onClick={() => executeTool('use_item', { item_id: 'item-healing-draught' })}><Heart /> Drink healing draught</Button>}
        </div>
        <span className="absolute bottom-3 right-3 hidden font-mono text-[9px] uppercase tracking-wider text-zinc-400 md:block">WASD / arrows to move</span>
      </div>
      <div className="location-exits" aria-label="Travel routes">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Travel</span>
        {location.exits.map((destinationId) => {
          const destination = state.locations[destinationId];
          const gate = Object.values(state.gates).find((candidate) => (candidate.fromLocationId === location.id && candidate.toLocationId === destinationId) || (candidate.toLocationId === location.id && candidate.fromLocationId === destinationId));
          return <Button key={destinationId} size="sm" variant="outline" disabled={Boolean(gate && !gate.open)} onClick={() => executeTool('move_player', { location_id: destinationId })}><DoorOpen /> {destination.name}{gate && !gate.open ? ' · locked' : ''}</Button>;
        })}
      </div>
    </section>
  );
}
