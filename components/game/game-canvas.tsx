'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DoorOpen, Hand, Heart, Shield, Sparkles, Swords, UserRound } from 'lucide-react';

import { useForge } from '@/components/providers/forge-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const npcPositions = [{ x: 180, y: 170 }, { x: 390, y: 130 }, { x: 540, y: 220 }];
const itemPositions = [{ x: 260, y: 290 }, { x: 470, y: 310 }];

function drawPill(context: CanvasRenderingContext2D, x: number, y: number, label: string, accent: string) {
  context.font = '600 11px sans-serif';
  const width = Math.ceil(context.measureText(label).width) + 18;
  const left = Math.max(8, Math.min(712 - width, x - width / 2));
  context.fillStyle = 'rgba(6, 10, 11, .88)';
  context.beginPath();
  context.roundRect(left, y, width, 24, 7);
  context.fill();
  context.strokeStyle = `${accent}66`;
  context.lineWidth = 1;
  context.stroke();
  context.fillStyle = accent;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, left + width / 2, y + 12);
}

function drawActor(context: CanvasRenderingContext2D, x: number, y: number, color: string, label: string, hostile = false) {
  context.save();
  context.shadowColor = `${color}55`;
  context.shadowBlur = 18;
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, y - 5, 6, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.roundRect(x - 10, y + 3, 20, 13, 6);
  context.fill();
  context.shadowBlur = 0;
  context.strokeStyle = hostile ? '#ffd0c8' : 'rgba(255,255,255,.7)';
  context.lineWidth = 1.5;
  context.beginPath();
  context.arc(x, y, 17, 0, Math.PI * 2);
  context.stroke();
  context.restore();
  drawPill(context, x, y + 23, label, color);
}

function drawTown(context: CanvasRenderingContext2D) {
  const buildings = [
    { x: 52, y: 64, width: 205, height: 132, roof: '#4b3824', wall: '#2d3028' },
    { x: 472, y: 66, width: 182, height: 128, roof: '#44311f', wall: '#292c25' },
  ];

  context.fillStyle = '#111d19';
  context.fillRect(0, 0, 720, 430);
  context.fillStyle = 'rgba(126, 152, 124, .09)';
  for (let y = 18; y < 430; y += 34) {
    for (let x = (y / 34) % 2 ? 16 : 0; x < 720; x += 42) context.fillRect(x, y, 32, 22);
  }

  buildings.forEach((building) => {
    context.shadowColor = 'rgba(0,0,0,.45)';
    context.shadowBlur = 18;
    context.fillStyle = building.wall;
    context.beginPath();
    context.roundRect(building.x, building.y, building.width, building.height, 5);
    context.fill();
    context.shadowBlur = 0;
    context.fillStyle = building.roof;
    context.beginPath();
    context.moveTo(building.x - 16, building.y + 12);
    context.lineTo(building.x + building.width / 2, building.y - 38);
    context.lineTo(building.x + building.width + 16, building.y + 12);
    context.closePath();
    context.fill();
    context.strokeStyle = 'rgba(235, 190, 110, .16)';
    context.stroke();
    context.fillStyle = '#604525';
    context.fillRect(building.x + building.width / 2 - 18, building.y + building.height - 58, 36, 58);
    context.fillStyle = 'rgba(255, 202, 103, .55)';
    context.fillRect(building.x + 28, building.y + 54, 22, 20);
  });

  context.strokeStyle = 'rgba(194, 160, 91, .2)';
  context.lineWidth = 50;
  context.beginPath();
  context.moveTo(-20, 386);
  context.quadraticCurveTo(330, 255, 750, 378);
  context.stroke();
  context.strokeStyle = 'rgba(248, 218, 154, .12)';
  context.lineWidth = 2;
  context.stroke();

  [292, 432].forEach((x) => {
    context.strokeStyle = '#6d5734';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(x, 82);
    context.lineTo(x, 132);
    context.stroke();
    context.fillStyle = '#f2b84e';
    context.shadowColor = '#e6a83b';
    context.shadowBlur = 15;
    context.beginPath();
    context.arc(x, 136, 5, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
  });
}

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
      drawTown(context);
    } else if (location.kind === 'wilds') {
      context.strokeStyle = '#24251d'; context.lineWidth = 48; context.beginPath(); context.moveTo(0, 360); context.quadraticCurveTo(345, 160, 720, 280); context.stroke();
      for (let i = 0; i < 12; i += 1) { const x = 30 + i * 61; const y = 70 + (i % 3) * 45; context.fillStyle = '#14271b'; context.beginPath(); context.moveTo(x, y - 38); context.lineTo(x - 24, y + 28); context.lineTo(x + 24, y + 28); context.fill(); }
    } else {
      context.strokeStyle = '#302b27'; context.lineWidth = 18; context.strokeRect(35, 35, 650, 355);
      context.strokeStyle = '#211f1d'; context.lineWidth = 6; for (let x = 55; x < 680; x += 64) { context.beginPath(); context.moveTo(x, 42); context.lineTo(x - 10, 385); context.stroke(); }
      context.fillStyle = '#4a321d'; context.fillRect(320, 34, 80, 22); context.fillStyle = 'rgba(236,174,76,.25)'; context.fillRect(338, 56, 44, 24);
    }

    location.npcIds.forEach((npcId, index) => {
      const npc = state.npcs[npcId];
      const point = npcPositions[index % npcPositions.length];
      const displayName = npc.name.startsWith('Captain ') ? npc.name.replace('Captain ', '') : npc.name.split(' ')[0];
      drawActor(context, point.x, point.y, npc.state === 'missing' ? '#a59a91' : '#efc273', displayName);
    });
    encounterEnemies.forEach((enemy) => {
      if (enemy.defeated) return;
      const x = 110 + enemy.position.x * 6;
      const y = 70 + enemy.position.y * 4.6;
      drawActor(context, x, y, '#e17d70', state.enemyArchetypes[enemy.archetypeId].name, true);
    });
    locationItems.forEach((item, index) => {
      const point = itemPositions[index % itemPositions.length];
      const color = item.kind === 'key' ? '#f4c75e' : '#7bd4b0';
      context.save();
      context.translate(point.x, point.y);
      context.rotate(Math.PI / 4);
      context.fillStyle = color;
      context.fillRect(-8, -8, 16, 16);
      context.strokeStyle = 'rgba(255,255,255,.65)';
      context.strokeRect(-10, -10, 20, 20);
      context.restore();
      drawPill(context, point.x, point.y + 19, item.name, color);
    });
    drawActor(context, position.x, position.y, '#9ad5f3', state.player.name);
  }, [encounterEnemies, location, locationItems, position, state.enemyArchetypes, state.npcs, state.player.name]);

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
  const firstItem = locationItems[0];
  const nearbyGate = Object.values(state.gates).find((gate) => [gate.fromLocationId, gate.toLocationId].includes(location.id) && !gate.open);

  return (
    <section className="game-frame" aria-label={`Playable scene: ${location.name}`}>
      <div className="stage-toolbar">
        <div>
          <p className="eyebrow">Current location</p>
          <h1 className="mt-1 text-lg font-semibold">{location.name}</h1>
          <p className="mt-1 hidden max-w-xl text-[11px] text-muted-foreground sm:block">{location.description}</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-rose-200"><Heart className="size-3.5" /> {state.player.health}/{state.player.maxHealth}</span>
          <span className="flex items-center gap-1.5 text-sky-200"><Shield className="size-3.5" /> {state.player.defense}</span>
        </div>
      </div>
      <div className="relative overflow-hidden rounded-b-2xl border border-white/8 bg-[#101615]">
        <canvas ref={canvasRef} className="block aspect-[720/430] w-full" aria-label={`Top-down game view of ${location.name}`} />
        <Badge variant="outline" className="absolute left-3 top-3 border-black/20 bg-black/65 text-zinc-200 backdrop-blur">{location.kind}</Badge>
        <div className="scene-legend" aria-label="Scene symbol legend">
          <span><i className="bg-sky-200" /> Player</span>
          {location.npcIds.length > 0 && <span><i className="bg-amber-200" /> Named character</span>}
          {encounterEnemies.some((enemy) => !enemy.defeated) && <span><i className="bg-rose-300" /> Enemy</span>}
          {locationItems.length > 0 && <span><i className="rotate-45 bg-emerald-300" /> Item</span>}
        </div>
        <div className="absolute bottom-3 left-3 flex max-w-[calc(100%-24px)] flex-wrap gap-2">
          {location.npcIds.map((npcId) => { const npc = state.npcs[npcId]; return <Button key={npcId} size="sm" variant="secondary" onClick={() => executeTool('interact_npc', { npc_id: npc.id })}><UserRound /> Talk to {npc.name.startsWith('Captain ') ? npc.name.replace('Captain ', '') : npc.name.split(' ')[0]}</Button>; })}
          {firstItem && <Button size="sm" variant="secondary" onClick={() => executeTool('collect_item', { item_id: firstItem.id })}><Hand /> Collect {firstItem.name}</Button>}
          {activeEnemy && <Button size="sm" className="bg-rose-500 text-white hover:bg-rose-400" onClick={() => executeTool('attack_enemy', { enemy_id: activeEnemy.id })}><Swords /> Attack {state.enemyArchetypes[activeEnemy.archetypeId].name}</Button>}
          {nearbyGate && <Button size="sm" variant="secondary" onClick={() => executeTool('open_gate', { gate_id: nearbyGate.id })}><DoorOpen /> Open {nearbyGate.name}</Button>}
          {state.player.health < state.player.maxHealth && state.player.inventory.some((entry) => entry.itemId === 'item-healing-draught') && <Button size="sm" variant="secondary" onClick={() => executeTool('use_item', { item_id: 'item-healing-draught' })}><Heart /> Drink healing draught</Button>}
        </div>
        <span className="absolute bottom-3 right-3 hidden items-center gap-1.5 rounded-md bg-black/55 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-zinc-300 backdrop-blur md:flex"><Sparkles className="size-3 text-amber-200" /> WASD / arrows to move</span>
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
