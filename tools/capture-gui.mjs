// Utviklerverktøy: tar fullskjermbilder (verden + HUD) av faste spilltilstander via hodeløs Edge/Chrome og
// DevTools-protokollen. Ingen avhengigheter (Node 22+ har global WebSocket). Ikke del av spillet.
//
//   node tools/capture-gui.mjs <url> <utmappe> [suffiks]
//   f.eks. node tools/capture-gui.mjs http://localhost:5173 docs/gui-01 after
//
// Scenene bruker bare ?debug-krokene (TFG.*) og fungerer derfor også mot eldre versjoner av spillet.
// Simuleringen kjøres med TFG.advance (fast tidssteg) og farten settes til 0, så tilstanden er deterministisk.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [base = 'http://localhost:5173', outDir = 'docs/gui-01', suffix = ''] = process.argv.slice(2);
const smokeOnly = process.env.GUI_SMOKE_ONLY === '1';
const BROWSER = process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9333;

// Hver scene: navn, viewport og et skript som kjøres i siden. Skriptet kan returnere data som logges.
const SETUP = `
  const T = window.TFG; T.setSpeed(0);
  const C = T.state.settlement.center;
  const tree = T.state.nodes.find((n) => n.kind === 'tree' && n.growth === 1);
  const rock = T.state.nodes.find((n) => n.kind === 'rock');
  const open = (m) => { if (T.hud && T.hud.openPanel) T.hud.openPanel(m); else { const t = document.getElementById('drawer-toggle'); if (t && !t.hidden) t.click(); } };
  const close = () => { if (T.hud && T.hud.openPanel) T.hud.openPanel(null); else { const c = document.getElementById('drawer-close'); if (c) c.click(); } };
  const settle = (s = 1) => T.tick(s);
  const quiet = () => { document.getElementById('toasts').innerHTML = ''; };
  const until = (pred, max = 240) => { for (let i = 0; i < max * 2 && !pred(); i++) T.advance(0.5); };
  const gather = (w, s) => { for (let i = 0; i < w; i++) T.click(tree.id); for (let i = 0; i < s; i++) T.click(rock.id); };
  const set = (w, s) => { T.state.resources.wood = w; T.state.resources.stone = s; };
  const camp = () => T.view(C.x - 10, C.y - 30, 600);
  const village = () => { camp(); set(12,6); T.buy('first_shelter'); until(() => T.state.buildings[0].complete); set(12,6); T.buy('awakening'); set(15,10); T.buy('common_fire'); until(() => T.state.buildings.some((b) => b.type === 'fire' && b.complete)); set(1600,1600); T.buy('hands_remember'); for(let i=0;i<3;i++){T.buy('new_home');until(() => T.state.buildings.every((b)=>b.complete));} T.buy('shared_storage');until(() => T.state.buildings.some((b)=>b.type === 'storage' && b.complete)); T.buy('organized_labor');T.buy('village_hearth');until(() => T.state.milestones.first_village != null); };
`;
const DEFAULT_SCENES = [
  { name: '01-start-closed', w: 1920, h: 1080, js: `camp(); settle(1); quiet(); close();` },
  { name: '02-start-open', w: 1920, h: 1080, js: `camp(); gather(4, 2); settle(1); open('insights'); settle(0.5);` },
  { name: '03-unaffordable', w: 1920, h: 1080, js: `camp(); gather(3, 1); set(12, 6); T.buy('first_shelter'); until(() => T.state.buildings[0].complete); set(7, 2); settle(1); quiet(); open('insights'); settle(0.5);` },
  { name: '04-first-humans', w: 1920, h: 1080, js: `camp(); gather(3, 1); set(12, 6); T.buy('first_shelter'); until(() => T.state.buildings[0].complete); set(12, 6); T.buy('awakening'); T.advance(45); settle(1); quiet(); open('insights'); settle(0.5);` },
  { name: '05-settlement', w: 1920, h: 1080, js: `camp(); gather(3, 1); set(12, 6); T.buy('first_shelter'); until(() => T.state.buildings[0].complete); set(12, 6); T.buy('awakening');
      T.advance(20); set(15, 10); T.buy('common_fire'); until(() => T.state.buildings.some((b) => b.type === 'fire' && b.complete));
      set(30, 20); T.buy('new_home'); until(() => T.state.buildings.filter((b) => b.type === 'hut' && b.complete).length === 1); T.advance(30);
      set(44, 29); T.buy('new_home'); T.advance(8); set(14, 17); settle(1); quiet(); open('insights'); settle(0.5);` },
  { name: '06-milestones', w: 1920, h: 1080, js: `camp(); gather(3, 1); set(12, 6); T.buy('first_shelter'); until(() => T.state.buildings[0].complete); set(12, 6); T.buy('awakening');
      T.advance(20); set(15, 10); T.buy('common_fire'); until(() => T.state.buildings.some((b) => b.type === 'fire' && b.complete)); T.advance(20); settle(1); quiet(); open('milestones'); settle(0.5);` },
  { name: '07-1366x768', w: 1366, h: 768, js: `camp(); gather(3, 1); set(12, 6); T.buy('first_shelter'); until(() => T.state.buildings[0].complete); set(12, 6); T.buy('awakening');
      T.advance(20); set(15, 10); T.buy('common_fire'); until(() => T.state.buildings.some((b) => b.type === 'fire' && b.complete));
      set(30, 20); T.buy('new_home'); T.advance(10); set(25, 9); settle(1); quiet(); open('insights'); settle(0.5);` },
  { name: '08-1280x720', w: 1280, h: 720, js: `camp(); gather(3, 1); set(12, 6); T.buy('first_shelter'); until(() => T.state.buildings[0].complete); set(12, 6); T.buy('awakening');
      T.advance(20); set(15, 10); T.buy('common_fire'); until(() => T.state.buildings.some((b) => b.type === 'fire' && b.complete));
      set(30, 20); T.buy('new_home'); T.advance(10); set(25, 9); settle(1); quiet(); open('insights'); settle(0.5);` },
  { name: '09-ragnarok', w: 1920, h: 1080, js: `camp(); gather(3, 1); set(12, 6); T.buy('first_shelter'); until(() => T.state.buildings[0].complete); set(12, 6); T.buy('awakening'); T.advance(30); settle(1); quiet();
      const b = document.querySelector('[data-nav="ragnarok"]') || document.getElementById('ragnarok-btn'); b.click(); settle(0.5);` },
];

// GAMEPLAY-02: faktiske, deterministiske progresjonsbilder — ikke arrangerte mockups.
const GAMEPLAY_02_SCENES = [
  { name: '01-initial-world', w: 1920, h: 1080, js: `camp(); settle(1); quiet(); close();` },
  { name: '02-inhabited-camp', w: 1920, h: 1080, js: `camp(); set(12, 6); T.buy('first_shelter'); until(() => T.state.buildings[0].complete); set(12, 6); T.buy('awakening'); set(15, 10); T.buy('common_fire'); until(() => T.state.buildings.some((b) => b.type === 'fire' && b.complete)); T.advance(35); quiet(); close(); settle(1);` },
  { name: '03-storage-under-construction', w: 1920, h: 1080, js: `camp(); set(12, 6); T.buy('first_shelter'); until(() => T.state.buildings[0].complete); set(12, 6); T.buy('awakening'); set(15, 10); T.buy('common_fire'); until(() => T.state.buildings.some((b) => b.type === 'fire' && b.complete)); set(52, 26); T.buy('shared_storage'); T.advance(9); quiet(); close(); settle(1);` },
  { name: '04-growing-settlement', w: 1920, h: 1080, js: `camp(); set(12, 6); T.buy('first_shelter'); until(() => T.state.buildings[0].complete); set(12, 6); T.buy('awakening'); set(15, 10); T.buy('common_fire'); until(() => T.state.buildings.some((b) => b.type === 'fire' && b.complete)); set(900, 900); for (let i = 0; i < 2; i++) { T.buy('new_home'); until(() => T.state.buildings.every((b) => b.complete)); } T.buy('shared_storage'); until(() => T.state.buildings.some((b) => b.type === 'storage' && b.complete)); T.advance(45); quiet(); close(); settle(1);` },
  { name: '05-first-village-milestone', w: 1920, h: 1080, js: `camp(); set(12, 6); T.buy('first_shelter'); until(() => T.state.buildings[0].complete); set(12, 6); T.buy('awakening'); set(15, 10); T.buy('common_fire'); until(() => T.state.buildings.some((b) => b.type === 'fire' && b.complete)); set(900, 900); T.buy('hands_remember'); for (let i = 0; i < 3; i++) { T.buy('new_home'); until(() => T.state.buildings.every((b) => b.complete)); } T.buy('shared_storage'); until(() => T.state.buildings.some((b) => b.type === 'storage' && b.complete)); T.buy('organized_labor'); T.state.events.length = 0; T.hud.reset(); T.buy('village_hearth'); until(() => T.state.milestones.first_village != null); camp(); settle(0.5);` },
  { name: '06-first-village-area', w: 1920, h: 1080, js: `camp(); set(12, 6); T.buy('first_shelter'); until(() => T.state.buildings[0].complete); set(12, 6); T.buy('awakening'); set(15, 10); T.buy('common_fire'); until(() => T.state.buildings.some((b) => b.type === 'fire' && b.complete)); set(900, 900); T.buy('hands_remember'); for (let i = 0; i < 3; i++) { T.buy('new_home'); until(() => T.state.buildings.every((b) => b.complete)); } T.buy('shared_storage'); until(() => T.state.buildings.some((b) => b.type === 'storage' && b.complete)); T.buy('organized_labor'); T.buy('village_hearth'); until(() => T.state.milestones.first_village != null); T.state.events.length = 0; T.hud.reset(); T.view(C.x, C.y - 40, 1850); T.advance(50); close(); settle(1);` },
];
// GAMEPLAY-03: samme ekte, deterministiske forløp, med landsbyliv og utforskning.
const GAMEPLAY_03_SCENES = [
  { name: '01-starting-world', w: 1920, h: 1080, js: `camp(); settle(1); quiet(); close();` },
  { name: '02-first-camp', w: 1920, h: 1080, js: `camp(); set(12, 6); T.buy('first_shelter'); until(() => T.state.buildings[0].complete); set(12, 6); T.buy('awakening'); set(15, 10); T.buy('common_fire'); until(() => T.state.buildings.some((b) => b.type === 'fire' && b.complete)); T.advance(35); quiet(); close(); settle(1);` },
  { name: '03-growing-settlement', w: 1920, h: 1080, js: `camp(); set(12, 6); T.buy('first_shelter'); until(() => T.state.buildings[0].complete); set(12, 6); T.buy('awakening'); set(15, 10); T.buy('common_fire'); until(() => T.state.buildings.some((b) => b.type === 'fire' && b.complete)); set(900, 900); T.buy('new_home'); until(() => T.state.buildings.every((b) => b.complete)); T.buy('shared_storage'); T.advance(12); quiet(); close(); settle(1);` },
  { name: '04-established-village', w: 1920, h: 1080, js: `camp(); set(12, 6); T.buy('first_shelter'); until(() => T.state.buildings[0].complete); set(12, 6); T.buy('awakening'); set(15, 10); T.buy('common_fire'); until(() => T.state.buildings.some((b) => b.type === 'fire' && b.complete)); set(1200, 1200); T.buy('hands_remember'); for (let i = 0; i < 3; i++) { T.buy('new_home'); until(() => T.state.buildings.every((b) => b.complete)); } T.buy('shared_storage'); until(() => T.state.buildings.some((b) => b.type === 'storage' && b.complete)); T.buy('organized_labor'); T.buy('village_hearth'); until(() => T.state.milestones.first_village != null); T.advance(130); quiet(); close(); camp(); settle(1);` },
  { name: '05-village-area-paths', w: 1920, h: 1080, js: `camp(); set(12, 6); T.buy('first_shelter'); until(() => T.state.buildings[0].complete); set(12, 6); T.buy('awakening'); set(15, 10); T.buy('common_fire'); until(() => T.state.buildings.some((b) => b.type === 'fire' && b.complete)); set(1200, 1200); T.buy('hands_remember'); for (let i = 0; i < 3; i++) { T.buy('new_home'); until(() => T.state.buildings.every((b) => b.complete)); } T.buy('shared_storage'); until(() => T.state.buildings.some((b) => b.type === 'storage' && b.complete)); T.buy('organized_labor'); T.buy('village_hearth'); until(() => T.state.milestones.first_village != null); T.advance(170); T.view(C.x, C.y - 30, 1800); quiet(); close(); settle(1);` },
  { name: '06-exploration', w: 1920, h: 1080, js: `camp(); set(12, 6); T.buy('first_shelter'); until(() => T.state.buildings[0].complete); set(12, 6); T.buy('awakening'); set(15, 10); T.buy('common_fire'); until(() => T.state.buildings.some((b) => b.type === 'fire' && b.complete)); set(1400, 1400); T.buy('hands_remember'); for (let i = 0; i < 3; i++) { T.buy('new_home'); until(() => T.state.buildings.every((b) => b.complete)); } T.buy('shared_storage'); until(() => T.state.buildings.some((b) => b.type === 'storage' && b.complete)); T.buy('organized_labor'); T.buy('village_hearth'); until(() => T.state.milestones.first_village != null); T.buy('explorer_urge'); until(() => T.state.humans.some((h) => h.state === 'toExplore' || h.state === 'explore')); T.advance(10); const h = T.state.humans.find((q) => q.state === 'toExplore' || q.state === 'explore'); T.state.events.length = 0; T.hud.reset(); T.view((C.x + h.x) / 2, (C.y + h.y) / 2 - 30, 900); quiet(); close(); settle(1);` },
];
const GAMEPLAY_04_SCENES = [
  { name: '01-original-village', w: 1920, h: 1080, js: `village(); T.advance(80); camp(); quiet(); close(); settle(1);` },
  { name: '02-explorer-journey', w: 1920, h: 1080, js: `village(); T.buy('explorer_urge'); until(() => T.state.milestones.first_paths != null); T.buy('new_horizons'); until(() => T.state.humans.some(h=>h.state==='toExplore')); const h=T.state.humans.find(h=>h.state==='toExplore'); T.view((C.x+h.x)/2,(C.y+h.y)/2,1050); quiet();close();settle(1);` },
  { name: '03-discovered-clearing', w: 1920, h: 1080, js: `village(); T.buy('explorer_urge');until(()=>T.state.milestones.first_paths!=null);T.buy('new_horizons');until(()=>T.state.expansion.discovered);const S=T.state.expansion.site;T.view(S.x,S.y,700);quiet();close();settle(1);` },
  { name: '04-founding-party', w: 1920, h: 1080, js: `village();T.buy('explorer_urge');until(()=>T.state.milestones.first_paths!=null);T.buy('new_horizons');until(()=>T.state.expansion.discovered);T.buy('founding');until(()=>T.state.humans.some(h=>h.state==='toFound'));const h=T.state.humans.find(h=>h.state==='toFound');T.view((C.x+h.x)/2,(C.y+h.y)/2,1300);quiet();close();settle(1);` },
  { name: '05-second-settlement', w: 1920, h: 1080, js: `village();T.buy('explorer_urge');until(()=>T.state.milestones.first_paths!=null);T.buy('new_horizons');until(()=>T.state.expansion.discovered);T.buy('founding');until(()=>T.state.expansion.founded);const S=T.state.expansion.site;T.advance(40);T.view(S.x,S.y,700);quiet();close();settle(1);` },
  { name: '06-first-region', w: 1920, h: 1080, js: `village();T.buy('explorer_urge');until(()=>T.state.milestones.first_paths!=null);T.buy('new_horizons');until(()=>T.state.expansion.discovered);T.buy('founding');until(()=>T.state.expansion.founded);T.advance(160);const S=T.state.expansion.site;T.view((C.x+S.x)/2,(C.y+S.y)/2,2250);quiet();close();settle(1);` },
];
const GAMEPLAY_05_SCENES = [
  { name: '01-first-village', w: 1920, h: 1080, js: `village();T.advance(70);camp();quiet();close();settle(1);` },
  { name: '02-second-founded', w: 1920, h: 1080, js: `village();T.buy('explorer_urge');until(()=>T.state.milestones.first_paths!=null);T.buy('new_horizons');until(()=>T.state.expansion.discovered);T.buy('founding');until(()=>T.state.expansion.founded);const S=T.state.expansion.site;T.view(S.x,S.y,700);quiet();close();settle(1);` },
  { name: '03-first-delivery', w: 1920, h: 1080, js: `village();T.buy('explorer_urge');until(()=>T.state.milestones.first_paths!=null);T.buy('new_horizons');until(()=>T.state.expansion.discovered);T.buy('founding');until(()=>T.state.expansion.founded);set(3000,3000);T.buy('growing_kin');T.buy('between_hearths');until(()=>T.state.humans.some(h=>h.state==='toDeliver'));const h=T.state.humans.find(h=>h.state==='toDeliver');T.view((C.x+h.x)/2,(C.y+h.y)/2,1100);quiet();close();settle(1);` },
  { name: '04-delivery-arrival', w: 1920, h: 1080, js: `village();T.buy('explorer_urge');until(()=>T.state.milestones.first_paths!=null);T.buy('new_horizons');until(()=>T.state.expansion.discovered);T.buy('founding');until(()=>T.state.expansion.founded);set(3000,3000);T.buy('growing_kin');T.buy('between_hearths');until(()=>T.state.region.completedDeliveries>=1);const S=T.state.expansion.site;T.view(S.x,S.y,720);quiet();close();settle(1);` },
  { name: '05-construction', w: 1920, h: 1080, js: `village();T.buy('explorer_urge');until(()=>T.state.milestones.first_paths!=null);T.buy('new_horizons');until(()=>T.state.expansion.discovered);T.buy('founding');until(()=>T.state.expansion.founded);set(3000,3000);T.buy('growing_kin');T.buy('between_hearths');until(()=>T.state.buildings.some(b=>b.settlementId==='second'&&!b.complete));const S=T.state.expansion.site;T.view(S.x,S.y,720);quiet();close();settle(1);` },
  { name: '06-grown-settlement', w: 1920, h: 1080, js: `village();T.buy('explorer_urge');until(()=>T.state.milestones.first_paths!=null);T.buy('new_horizons');until(()=>T.state.expansion.discovered);T.buy('founding');until(()=>T.state.expansion.founded);set(3000,3000);T.buy('growing_kin');T.buy('between_hearths');until(()=>T.state.region.completedProjects>=2);const S=T.state.expansion.site;T.advance(30);T.view(S.x,S.y,760);quiet();close();settle(1);` },
  { name: '07-regional-path', w: 1920, h: 1080, js: `village();T.buy('explorer_urge');until(()=>T.state.milestones.first_paths!=null);T.buy('new_horizons');until(()=>T.state.expansion.discovered);T.buy('founding');until(()=>T.state.expansion.founded);set(3000,3000);T.buy('growing_kin');T.buy('between_hearths');until(()=>T.state.region.completedDeliveries>=5);const S=T.state.expansion.site;T.view((C.x+S.x)/2,(C.y+S.y)/2,2250);quiet();close();settle(1);` },
  { name: '08-living-region', w: 1920, h: 1080, js: `village();T.buy('explorer_urge');until(()=>T.state.milestones.first_paths!=null);T.buy('new_horizons');until(()=>T.state.expansion.discovered);T.buy('founding');until(()=>T.state.expansion.founded);set(3000,3000);T.buy('growing_kin');T.buy('between_hearths');until(()=>T.state.region.completedProjects>=2);T.buy('steady_routes');T.advance(150);const S=T.state.expansion.site;T.view((C.x+S.x)/2,(C.y+S.y)/2,2250);quiet();close();settle(1);` },
  { name: '09-original-close', w: 1920, h: 1080, js: `village();T.buy('explorer_urge');until(()=>T.state.milestones.first_paths!=null);T.buy('new_horizons');until(()=>T.state.expansion.discovered);T.buy('founding');until(()=>T.state.expansion.founded);set(3000,3000);T.buy('growing_kin');T.buy('between_hearths');until(()=>T.state.region.completedProjects>=2);camp();quiet();close();settle(1);` },
  { name: '10-second-close', w: 1920, h: 1080, js: `village();T.buy('explorer_urge');until(()=>T.state.milestones.first_paths!=null);T.buy('new_horizons');until(()=>T.state.expansion.discovered);T.buy('founding');until(()=>T.state.expansion.founded);set(3000,3000);T.buy('growing_kin');T.buy('between_hearths');until(()=>T.state.region.completedProjects>=2);const S=T.state.expansion.site;T.view(S.x,S.y,620);quiet();close();settle(1);` },
];
// GAMEPLAY-06: komplett, faktisk sivilisasjonsflyt med de samme debug-handlingene som spilleren bruker.
const GAMEPLAY_06_SCENES = [
  { name: '01-early-settlement', w: 1920, h: 1080, js: `village(); camp(); quiet(); close(); settle(1);` },
  { name: '02-first-food-production', w: 1920, h: 1080, js: `village();T.buy('explorer_urge');until(()=>T.state.milestones.first_paths!=null);T.buy('new_horizons');until(()=>T.state.expansion.discovered);T.buy('founding');until(()=>T.state.expansion.founded);set(3000,3000);T.buy('growing_kin');T.buy('between_hearths');until(()=>T.state.milestones.living_region!=null,500);T.buy('seed_promise');until(()=>T.state.buildings.some(b=>b.type==='field'&&b.complete),180);T.advance(25);camp();quiet();close();settle(1);` },
  { name: '03-growing-infrastructure', w: 1920, h: 1080, js: `village();T.buy('explorer_urge');until(()=>T.state.milestones.first_paths!=null);T.buy('new_horizons');until(()=>T.state.expansion.discovered);T.buy('founding');until(()=>T.state.expansion.founded);set(3000,3000);T.buy('growing_kin');T.buy('between_hearths');until(()=>T.state.milestones.living_region!=null,500);T.buy('seed_promise');until(()=>T.state.buildings.some(b=>b.type==='field'&&b.complete),180);T.advance(45);const S=T.state.expansion.site;T.view(S.x,S.y,760);quiet();close();settle(1);` },
  { name: '04-regional-exchange', w: 1920, h: 1080, js: `village();T.buy('explorer_urge');until(()=>T.state.milestones.first_paths!=null);T.buy('new_horizons');until(()=>T.state.expansion.discovered);T.buy('founding');until(()=>T.state.expansion.founded);set(3000,3000);T.buy('growing_kin');T.buy('between_hearths');until(()=>T.state.milestones.living_region!=null,500);T.buy('seed_promise');until(()=>T.state.buildings.some(b=>b.type==='field'&&b.complete),180);until(()=>T.state.civilization.foodHarvests>=2,80);set(3000,3000);T.buy('division_labor');T.buy('regional_exchange');until(()=>T.state.humans.some(h=>h.state==='toDeliver'),160);const h=T.state.humans.find(h=>h.state==='toDeliver');T.view((C.x+h.x)/2,(C.y+h.y)/2,1200);quiet();close();settle(1);` },
  { name: '05-first-town', w: 1920, h: 1080, js: `village();T.buy('explorer_urge');until(()=>T.state.milestones.first_paths!=null);T.buy('new_horizons');until(()=>T.state.expansion.discovered);T.buy('founding');until(()=>T.state.expansion.founded);set(3000,3000);T.buy('growing_kin');T.buy('between_hearths');until(()=>T.state.milestones.living_region!=null,500);T.buy('seed_promise');until(()=>T.state.buildings.some(b=>b.type==='field'&&b.complete),180);until(()=>T.state.civilization.foodHarvests>=2,80);set(3000,3000);T.buy('division_labor');T.buy('regional_exchange');until(()=>T.state.milestones.first_town!=null,500);camp();quiet();close();settle(1);` },
  { name: '06-civilization-region', w: 1920, h: 1080, js: `village();T.buy('explorer_urge');until(()=>T.state.milestones.first_paths!=null);T.buy('new_horizons');until(()=>T.state.expansion.discovered);T.buy('founding');until(()=>T.state.expansion.founded);set(3000,3000);T.buy('growing_kin');T.buy('between_hearths');until(()=>T.state.milestones.living_region!=null,500);T.buy('seed_promise');until(()=>T.state.buildings.some(b=>b.type==='field'&&b.complete),180);until(()=>T.state.civilization.foodHarvests>=2,80);set(3000,3000);T.buy('division_labor');T.buy('regional_exchange');until(()=>T.state.region.completedProjects>=5,600);const S=T.state.expansion.site;T.view((C.x+S.x)/2,(C.y+S.y)/2,2250);quiet();close();settle(1);` },
];

// GAMEPLAY-07..10: ekte spilling med boten (tools/bot.js) frem til hvert stadium — ingen snarveier.
const BOT = `const { makeBot, playTo } = await import('/tools/bot.js'); const bot = makeBot(); const to = (g) => playTo(T.state, bot, g, 14400); const clean = () => { T.state.events.length = 0; T.hud.reset(); }; const calm = () => { T.tick(0.2); clean(); T.tick(0.3); close(); T.cancelGlide(); }; const first = (t) => T.state.buildings.find((b) => b.type === t && b.complete);`;
const GAMEPLAY_07_10_SCENES = [
  { name: '01-developed-city', w: 1920, h: 1080, js: `${BOT} to('city_rises'); T.advance(60); calm(); T.view(C.x, C.y + 10, 820); close(); settle(1.5);` },
  { name: '02-refined-production', w: 1920, h: 1080, js: `${BOT} to('city_rises'); T.advance(90); const m = first('sawmill'); calm(); T.view(m.x + 20, m.y - 10, 440); close(); settle(2);` },
  { name: '03-civic-infrastructure', w: 1920, h: 1080, js: `${BOT} to('age_of_knowledge'); T.advance(40); const h = first('hall'); calm(); T.view(h.x + 30, h.y - 10, 560); close(); settle(2);` },
  { name: '04-knowledge-and-realm-panel', w: 1920, h: 1080, js: `${BOT} to('age_of_knowledge'); T.advance(40); calm(); T.view(C.x, C.y - 20, 1000); open('realm'); settle(1.5);` },
  { name: '05-regional-settlement-network', w: 1920, h: 1080, js: `${BOT} to('connected_realm'); T.advance(90); calm(); T.view(C.x + 40, C.y - 20, 2300); close(); settle(2);` },
  { name: '06-overview-network', w: 1920, h: 1080, js: `${BOT} to('connected_realm'); T.advance(40); calm(); T.tick(6); close(); T.overview(true); settle(1.5);` },
  { name: '07-beyond-start-exploration', w: 1920, h: 1080, js: `${BOT} to('connected_realm'); to((s) => s.globe.mission && s.globe.mission.phase === 'away' && s.globe.stats.discovered >= 3); calm(); T.tick(6); T.overview(true); open('realm'); settle(1.5);` },
  { name: '08-caravan-from-outpost', w: 1920, h: 1080, js: `${BOT} to('connected_realm'); to((s) => s.globe.stats.outposts >= 1 && s.globe.caravans.some((c) => Math.hypot(c.x - s.stockpile.x, c.y - s.stockpile.y) < 330)); const c = T.state.globe.caravans.find((q) => Math.hypot(q.x - T.state.stockpile.x, q.y - T.state.stockpile.y) < 330); calm(); T.view(c.x, c.y, 700); settle(1.0);` },
  { name: '09-final-milestone', w: 1920, h: 1080, js: `${BOT} to('first_world_civilization'); T.cancelGlide(); T.state.events = T.state.events.filter((e) => e.id === 'first_world_civilization'); T.hud.reset(); T.tick(6); T.hud.openPanel('insights'); T.tick(0.3); T.hud.openPanel(null); T.overview(true); settle(1);` },
];
GAMEPLAY_07_10_SCENES.push({ name: '10-ragnarok-late-game', w: 1920, h: 1080, js: `${BOT} to('first_world_civilization'); T.cancelGlide(); T.state.events.length = 0; T.hud.reset(); T.tick(0.4); close(); T.view(C.x + 40, C.y - 20, 2300); document.querySelector('[data-nav="ragnarok"]').click(); settle(0.4);` });
// OPUS-01: før/etter på samme progresjonstrinn (boten spiller; ingen snarveier). Skriptene bruker bare kroker som finnes
// i begge versjonene; planetkrokene (globeView, planetReady) brukes bare når de finnes.
const PLANET = `const planet = async (h) => { if (T.planetReady) await T.planetReady(); if (T.globeView) { const P = T.planet; T.globeView(P.home.lat - (h > 1 ? 0.05 : 0), P.home.lon, h); } else T.overview(true); };`;
const OPUS_01_SCENES = [
  { name: '01-early-settlement', w: 1920, h: 1080, js: `${BOT} to('settlement'); T.advance(40); calm(); T.view(C.x - 10, C.y - 20, 640); close(); settle(1.5);` },
  { name: '02-developed-village', w: 1920, h: 1080, js: `${BOT} to('first_village'); T.advance(90); calm(); T.view(C.x - 10, C.y - 10, 860); close(); settle(1.5);` },
  { name: '03-first-city', w: 1920, h: 1080, js: `${BOT} to('city_rises'); T.advance(60); calm(); T.view(C.x, C.y + 10, 1000); close(); settle(1.5);` },
  { name: '04-mature-city', w: 1920, h: 1080, js: `${BOT} to('connected_realm'); T.advance(120); calm(); T.view(C.x, C.y + 10, 1000); close(); settle(1.5);` },
  { name: '05-regional-network', w: 1920, h: 1080, js: `${BOT} to('connected_realm'); T.advance(90); calm(); T.view(C.x + 40, C.y - 20, 2300); close(); settle(2);` },
  { name: '06-planet-view', w: 1920, h: 1080, js: `${BOT} ${PLANET} to('first_world_civilization'); T.advance(60); calm(); close(); await planet(3.1); settle(1.5);` },
  { name: '07-planet-exploration', w: 1920, h: 1080, js: `${BOT} ${PLANET} to('connected_realm'); to((s) => s.globe.mission && s.globe.mission.phase === 'away' && s.globe.stats.discovered >= 2); calm(); close(); await planet(0.6); settle(1.5);` },
  { name: '08-major-milestone', w: 1920, h: 1080, js: `${BOT} ${PLANET} to('first_world_civilization'); T.cancelGlide(); T.state.events = T.state.events.filter((e) => e.id === 'first_world_civilization'); T.hud.reset(); T.tick(0.5); T.cancelGlide(); T.hud.openPanel(null); await planet(0.6); settle(1);` },
  { name: '09-ragnarok', w: 1920, h: 1080, js: `${BOT} to('first_world_civilization'); T.cancelGlide(); T.state.events.length = 0; T.hud.reset(); T.tick(0.4); T.cancelGlide(); close(); T.view(C.x, C.y + 10, 1000); document.querySelector('[data-nav="ragnarok"]').click(); settle(0.4);` },
];
// Bare etter: overgangen fra den detaljerte verdenen til planeten i fem trinn (samme fokus).
const OPUS_01_TRANSITION = [
  ['t1-area-2d', `T.view(C.x + 40, C.y - 20, 2300);`],
  ['t2-region', `T.view(C.x + 40, C.y - 20, 2300); T.tick(0.1); T.enterGlobe(false); T.globe.h = 0.11;`],
  ['t3-continent-near', `T.view(C.x + 40, C.y - 20, 2300); T.tick(0.1); T.enterGlobe(false); T.globe.h = 0.3;`],
  ['t4-continent', `T.view(C.x + 40, C.y - 20, 2300); T.tick(0.1); T.enterGlobe(false); T.globe.h = 0.8;`],
  ['t5-planet', `T.view(C.x + 40, C.y - 20, 2300); T.tick(0.1); T.enterGlobe(false); T.globe.h = 3.1;`],
].map(([name, js]) => ({ name, w: 1920, h: 1080, js: `${BOT} to('first_world_civilization'); T.advance(60); calm(); close(); await T.planetReady(); ${js} T.tick(0.6); settle(0.6);` }));
const SCENES = process.env.OPUS_01 === '1' ? OPUS_01_SCENES : process.env.OPUS_01 === 'transition' ? OPUS_01_TRANSITION : process.env.GAMEPLAY_07_10 === '1' ? GAMEPLAY_07_10_SCENES : process.env.GAMEPLAY_06 === '1' ? GAMEPLAY_06_SCENES : process.env.GAMEPLAY_05 === '1' ? GAMEPLAY_05_SCENES : process.env.GAMEPLAY_04 === '1' ? GAMEPLAY_04_SCENES : process.env.GAMEPLAY_03 === '1' ? GAMEPLAY_03_SCENES : process.env.GAMEPLAY_02 === '1' ? GAMEPLAY_02_SCENES : DEFAULT_SCENES;
const ACTIVE_SCENES = process.env.CAPTURE_SCENES
  ? SCENES.filter((s) => process.env.CAPTURE_SCENES.split(',').some((name) => s.name.startsWith(name.trim())))
  : SCENES;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch { /* nettleseren starter */ }
    await sleep(200);
  }
  throw new Error('Fant ikke nettleserens DevTools-port');
}

const errors = [];
function client(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') errors.push(msg.params.entry.text);
  };
  const ready = new Promise((r) => { ws.onopen = r; });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id;
    pending.set(n, (msg) => (msg.error ? reject(new Error(`${method}: ${msg.error.message}`)) : resolve(msg.result)));
    ws.send(JSON.stringify({ id: n, method, params }));
  });
  return { ready, send, close: () => ws.close() };
}

async function evaluate(cdp, expression) {
  const r = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'tfg-capture-'));
const browser = spawn(BROWSER, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--hide-scrollbars', '--force-color-profile=srgb', '--no-first-run', 'about:blank'], { stdio: 'ignore' });
fs.mkdirSync(outDir, { recursive: true });
try {
  const cdp = client(await connect());
  await cdp.ready;
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  await cdp.send('Page.enable');
  for (const s of (smokeOnly ? [] : ACTIVE_SCENES)) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: s.w, height: s.h, deviceScaleFactor: 1, mobile: false });
    await cdp.send('Page.navigate', { url: `${base}/?debug` });
    for (let i = 0; i < 300; i++) {
      if (await evaluate(cdp, `!!window.TFG`).catch(() => false)) break;
      await sleep(100);
    }
    await evaluate(cdp, `(async () => { ${SETUP} ${s.js}; T.setSpeed(1); T.tick(0.2); })()`); // vis normal fart i bildet
    await sleep(400); // la CSS-overganger bli ferdige
    const shot = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
    const file = path.join(outDir, `${s.name}${suffix ? '-' + suffix : ''}.jpg`);
    fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
    console.log('lagret', file);
  }
  // Den samme ekte Edge-siden kjører den utvidede samhandlingskontrollen. Dette
  // holder nettleser-røyktesten repeterbar uten å gjøre den til en Node-/DOM-test.
  await cdp.send('Page.navigate', { url: `${base}/?debug` });
  for (let i = 0; i < 300; i++) {
    if (await evaluate(cdp, `!!window.TFG`).catch(() => false)) break;
    await sleep(100);
  }
  const smoke = await evaluate(cdp, `(async () => await (await import('/tools/gui-smoke.js')).run())()`);
  console.log(`GUI-røykprøve: ${smoke.pass}/${smoke.results.length}; feil: ${smoke.fail.join(', ') || 'ingen'}`);
  if (process.env.REALM_SMOKE === '1') {
    await cdp.send('Page.navigate', { url: `${base}/?debug` });
    for (let i = 0; i < 300; i++) {
      if (await evaluate(cdp, `!!window.TFG`).catch(() => false)) break;
      await sleep(100);
    }
    const realm = await evaluate(cdp, `(async () => await (await import('/tools/gui-smoke-realm.js')).run())()`);
    console.log(`Rike-røykprøve: ${realm.pass}/${realm.results.length}; feil: ${realm.fail.join(', ') || 'ingen'}`);
    console.log('Tegnetid (ms/bilde, sent spill):', JSON.stringify(realm.perf));
  }
  const renderStats = await evaluate(cdp, `({ frameMs: window.TFG.renderStats.frameMs, ecologyRefreshMs: window.TFG.renderStats.ecologyRefreshMs })`);
  console.log(`Rendermåling (nåværende scene): ${renderStats.frameMs.toFixed(2)} ms/bilde; miljøoppdatering ${renderStats.ecologyRefreshMs.toFixed(2)} ms.`);
  cdp.close();
  console.log(errors.length ? `Konsollfeil:\n${errors.join('\n')}` : 'Ingen konsollfeil.');
} finally {
  browser.kill();
}
