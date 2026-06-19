const canvas = document.getElementById('sim-canvas');
const ctx = canvas.getContext('2d');
let width, height;
let entities = [];
let projectiles = [];
let currentMode = 'A';
let simRunning = false;

// Limits (Reduced to help with lag)
const LIMIT_TIE = 100;
const LIMIT_SD = 15;
const LIMIT_DS = 2;
const LIMIT_SKB = 1;

// UI Elements (Using safe checks in case new buttons aren't in HTML yet)
const uiContainer = document.getElementById('ui-container');
const btnModeA = document.getElementById('btn-mode-a');
const btnModeB = document.getElementById('btn-mode-b');
const btnModeC = document.getElementById('btn-mode-c'); // Free For All
const btnModeD = document.getElementById('btn-mode-d'); // 2v1v1
const btnRun = document.getElementById('btn-run');
const modeDisplay = document.getElementById('mode-display');
const setupPanel = document.getElementById('setup-panel');
const btnModify = document.getElementById('btn-modify');
const planetSetup = document.getElementById('planet-setup');
const planetTeamSelect = document.getElementById('planet-team');
const stats = document.getElementById('stats');
const advancedStats = document.getElementById('advanced-stats');

function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function toggleMode(mode) {
    currentMode = mode;
    if(btnModeA) btnModeA.classList.toggle('active', mode === 'A');
    if(btnModeB) btnModeB.classList.toggle('active', mode === 'B');
    if(btnModeC) btnModeC.classList.toggle('active', mode === 'C');
    if(btnModeD) btnModeD.classList.toggle('active', mode === 'D');
    
    let modeText = "Deep Space Battle";
    if (mode === 'B') modeText = "Planetary Orbit Battle";
    if (mode === 'C') modeText = "Free For All (4 Teams)";
    if (mode === 'D') modeText = "Alliance Battle (2 vs 1 vs 1)";
    if(modeDisplay) modeDisplay.innerText = modeText;
    
    uiContainer.classList.remove('minimized');
    setupPanel.classList.remove('hidden');
    btnModify.classList.add('hidden');
    
    // Disable inputs for SKB and DS in Planetary Mode
    const disableBig = (mode === 'B');
    const pSkb = document.getElementById('p-skb');
    if(pSkb) pSkb.disabled = disableBig;
    const pDs = document.getElementById('p-ds');
    if(pDs) pDs.disabled = disableBig;
    const bSkb = document.getElementById('b-skb');
    if(bSkb) bSkb.disabled = disableBig;
    const bDs = document.getElementById('b-ds');
    if(bDs) bDs.disabled = disableBig;
    
    if(mode === 'B') planetSetup.classList.remove('hidden');
    else planetSetup.classList.add('hidden');
}

if(btnModeA) btnModeA.addEventListener('click', () => toggleMode('A'));
if(btnModeB) btnModeB.addEventListener('click', () => toggleMode('B'));
if(btnModeC) btnModeC.addEventListener('click', () => toggleMode('C'));
if(btnModeD) btnModeD.addEventListener('click', () => toggleMode('D'));

// Alliance Logic Check
function areEnemies(team1, team2) {
    if (team1 === team2) return false;
    // In Mode D, Purple and Blue are a team of 2 against Green and Brown
    if (currentMode === 'D') {
        if ((team1 === 'Purple' && team2 === 'Blue') || (team1 === 'Blue' && team2 === 'Purple')) {
            return false;
        }
    }
    // Default / FFA logic: everyone else is hostile
    return true;
}

// Spawns ships into their designated quadrants/sides based on the mode
function getSpawnCoords(team) {
    const edgePadding = 150;
    const midX = width / 2;
    const midY = height / 2;

    // 4-Team Split (Corners)
    if (currentMode === 'C' || currentMode === 'D') {
        if (team === 'Purple') return { x: Math.random() * (midX - edgePadding) + edgePadding, y: Math.random() * (midY - edgePadding) + edgePadding }; // Top Left
        if (team === 'Blue') return { x: Math.random() * (midX - edgePadding) + edgePadding, y: Math.random() * (midY - edgePadding) + midY }; // Bottom Left
        if (team === 'Brown') return { x: Math.random() * (midX - edgePadding) + midX, y: Math.random() * (midY - edgePadding) + edgePadding }; // Top Right
        if (team === 'Green') return { x: Math.random() * (midX - edgePadding) + midX, y: Math.random() * (midY - edgePadding) + midY }; // Bottom Right
    }

    // Standard 2-Team Split
    const centerPadding = 250;
    const minX = team === 'Purple' ? edgePadding : midX + centerPadding;
    const maxX = team === 'Purple' ? midX - centerPadding : width - edgePadding;
    
    return {
        x: Math.random() * (maxX - minX) + minX,
        y: Math.random() * (height - (edgePadding * 2)) + edgePadding
    };
}

// Safe value fetcher to prevent crashes if HTML inputs are missing
function getFleetVal(id, defaultVal) {
    const el = document.getElementById(id);
    return el && el.value !== '' ? parseInt(el.value) : defaultVal;
}

function spawnFleet(team, prefix) {
    let skbCount = currentMode === 'A' || currentMode === 'C' || currentMode === 'D' ? Math.min(getFleetVal(`${prefix}-skb`, 0), LIMIT_SKB) : 0;
    let dsCount = currentMode === 'A' || currentMode === 'C' || currentMode === 'D' ? Math.min(getFleetVal(`${prefix}-ds`, 0), LIMIT_DS) : 0;
    
    let sdCount = Math.min(getFleetVal(`${prefix}-sd`, 5), LIMIT_SD);
    let tieCount = Math.min(getFleetVal(`${prefix}-tie`, 20), LIMIT_TIE);

    if (currentMode === 'B') sdCount = Math.min(sdCount, 5); // further reduced for orbit

    for (let i = 0; i < skbCount; i++) {
        let loc = getSpawnCoords(team);
        entities.push(new StarkillerBase(loc.x, loc.y, team));
    }
    for (let i = 0; i < dsCount; i++) {
        let loc = getSpawnCoords(team);
        entities.push(new DeathStar(loc.x, loc.y, team));
    }
    for (let i = 0; i < sdCount; i++) {
        let loc = getSpawnCoords(team);
        entities.push(new StarDestroyer(loc.x, loc.y, team, currentMode));
    }
    for (let i = 0; i < tieCount; i++) {
        let loc = getSpawnCoords(team);
        entities.push(new TIEFighter(loc.x, loc.y, team, currentMode));
    }
}

btnRun.addEventListener('click', () => {
    entities = [];
    projectiles = [];
    
    if (currentMode === 'B') {
        const planetTeam = planetTeamSelect ? planetTeamSelect.value : 'Purple';
        const planetX = planetTeam === 'Purple' ? width / 3 : (width / 3) * 2;
        entities.push(new Planet(planetX, height / 2, planetTeam));
    }

    spawnFleet('Purple', 'p');
    spawnFleet('Brown', 'b');
    
    if (currentMode === 'C' || currentMode === 'D') {
        spawnFleet('Green', 'g');
        spawnFleet('Blue', 'bl');
    }
    
    uiContainer.classList.add('minimized');
    btnModify.classList.remove('hidden');
    if(stats) stats.classList.remove("hidden");
    if(advancedStats) advancedStats.classList.remove("hidden");
    
    if (!simRunning) {
        simRunning = true;
        animate();
    }
});

btnModify.addEventListener('click', () => {
    uiContainer.classList.remove('minimized');
    setupPanel.classList.remove('hidden');
    btnModify.classList.add('hidden');
    if(stats) stats.classList.add("hidden");
    if(advancedStats) advancedStats.classList.add("hidden");
});

// Dynamically creates/updates the top right panel
function updateTopRightPanel(counts) {
    let panel = document.getElementById('top-right-panel');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'top-right-panel';
        panel.style.position = 'absolute';
        panel.style.top = '10px';
        panel.style.right = '10px';
        panel.style.background = 'rgba(5, 5, 16, 0.85)';
        panel.style.color = '#fff';
        panel.style.padding = '15px';
        panel.style.fontFamily = 'monospace';
        panel.style.border = '1px solid #444';
        panel.style.borderRadius = '5px';
        panel.style.pointerEvents = 'none';
        panel.style.zIndex = '1000';
        document.body.appendChild(panel);
    }

    let html = `<h3 style="margin: 0 0 10px 0; border-bottom: 1px solid #555; padding-bottom: 5px;">Active Fleets</h3>`;
    let activeTeamsFound = false;

    for (let team in counts) {
        let t = counts[team];
        let totalShips = t.TIEFighter + t.StarDestroyer + t.DeathStar + t.StarkillerBase + t.Planet;
        
        if (totalShips > 0) {
            activeTeamsFound = true;
            // Map simple colors for the UI header
            let colorMap = { Purple: '#a855f7', Brown: '#d97706', Green: '#22c55e', Blue: '#3b82f6' };
            let displayColor = colorMap[team] || '#fff';

            html += `
            <div style="margin-bottom: 10px; font-size: 13px;">
                <strong style="color: ${displayColor}; font-size: 14px;">${team} Faction</strong><br/>
                TIEs: ${t.TIEFighter} | SDs: ${t.StarDestroyer}<br/>
                DS: ${t.DeathStar} | SKB: ${t.StarkillerBase}
            </div>`;
        }
    }
    
    if (!activeTeamsFound) html += `<div>No active ships.</div>`;
    panel.innerHTML = html;
    
    // Hide panel if user clicks modify
    panel.style.display = btnModify.classList.contains('hidden') ? 'none' : 'block';
}

function animate() {
    if (!simRunning) return;
    
    ctx.fillStyle = 'rgba(5, 5, 16, 0.4)';
    ctx.fillRect(0, 0, width, height);

    const planet = entities.find(e => e instanceof Planet);
    const planetTeam = planet ? planet.team : null;
    const centerX = planet ? planet.x : width / 2;
    const centerY = planet ? planet.y : height / 2;

    entities = entities.filter(e => e.active);
    
    let counts = {
        Purple: { TIEFighter: 0, StarDestroyer: 0, DeathStar: 0, StarkillerBase: 0, Planet: 0 },
        Brown: { TIEFighter: 0, StarDestroyer: 0, DeathStar: 0, StarkillerBase: 0, Planet: 0 },
        Green: { TIEFighter: 0, StarDestroyer: 0, DeathStar: 0, StarkillerBase: 0, Planet: 0 },
        Blue: { TIEFighter: 0, StarDestroyer: 0, DeathStar: 0, StarkillerBase: 0, Planet: 0 }
    };

    let teamTotals = { Purple: 0, Brown: 0, Green: 0, Blue: 0 };

    for (let entity of entities) {
        teamTotals[entity.team]++;
        if (counts[entity.team]) {
            counts[entity.team][entity.constructor.name]++;
        }
    }

    // PHASE 1: Spawning, Movement, and AI retreat
    for (let entity of entities) {
        let now = Date.now();

        // Passive Spawners with Reduced Limits
        if (entity instanceof StarDestroyer) {
            if (now - entity.lastSpawn > 30000) {
                let toSpawn = Math.min(10, LIMIT_TIE - counts[entity.team].TIEFighter);
                for (let i = 0; i < toSpawn; i++) {
                    entities.push(new TIEFighter(entity.x, entity.y, entity.team, currentMode));
                    counts[entity.team].TIEFighter++;
                }
                entity.lastSpawn = now;
            }
        } 

        if (entity instanceof DeathStar) {
            if (now - entity.lastSpawn > 60000) {
                let tiesToSpawn = Math.min(20, LIMIT_TIE - counts[entity.team].TIEFighter);
                for (let i = 0; i < tiesToSpawn; i++) {
                    entities.push(new TIEFighter(entity.x, entity.y, entity.team, currentMode));
                    counts[entity.team].TIEFighter++;
                }
                let sdsToSpawn = Math.min(2, LIMIT_SD - counts[entity.team].StarDestroyer);
                for (let i = 0; i < sdsToSpawn; i++) {
                    entities.push(new StarDestroyer(entity.x, entity.y, entity.team, currentMode));
                    counts[entity.team].StarDestroyer++;
                }
                entity.lastSpawn = now;
            }
        } 

        if (entity instanceof StarkillerBase) {
            if (now - entity.lastSpawn > 60000) {
                let tiesToSpawn = Math.min(50, LIMIT_TIE - counts[entity.team].TIEFighter);
                for (let i = 0; i < tiesToSpawn; i++) {
                    entities.push(new TIEFighter(entity.x, entity.y, entity.team, currentMode));
                    counts[entity.team].TIEFighter++;
                }
                let sdsToSpawn = Math.min(5, LIMIT_SD - counts[entity.team].StarDestroyer);
                for (let i = 0; i < sdsToSpawn; i++) {
                    entities.push(new StarDestroyer(entity.x, entity.y, entity.team, currentMode));
                    counts[entity.team].StarDestroyer++;
                }
                entity.lastSpawn = now;
            }
        }

        if (entity instanceof Planet) {
            if (now - entity.lastSpawn > 60000) {
                let tiesToSpawn = Math.min(100, LIMIT_TIE - counts[entity.team].TIEFighter);
                for (let i = 0; i < tiesToSpawn; i++) {
                    entities.push(new TIEFighter(entity.x, entity.y, entity.team, currentMode));
                    counts[entity.team].TIEFighter++;
                }
                let sdsToSpawn = Math.min(2, LIMIT_SD - counts[entity.team].StarDestroyer);
                for (let i = 0; i < sdsToSpawn; i++) {
                    entities.push(new StarDestroyer(entity.x, entity.y, entity.team, currentMode));
                    counts[entity.team].StarDestroyer++;
                }
                entity.lastSpawn = now;
            }
        }

        let isDefendingOrbit = (currentMode === 'B' && entity.team === planetTeam);
        
        // Let entity update its internal cooldowns/logic
        entity.update(width, height, isDefendingOrbit, centerX, centerY, entities, projectiles);

        // AI Retreat Logic: If Star Destroyer shields are very low, force movement to their safe zone
        if (entity instanceof StarDestroyer && entity.shield !== undefined && entity.maxShield !== undefined) {
            if (entity.shield < entity.maxShield * 0.25) {
                let homeX = (entity.team === 'Purple' || entity.team === 'Blue') ? 100 : width - 100;
                let homeY = height / 2;
                let angle = Math.atan2(homeY - entity.y, homeX - entity.x);
                
                // Override the coordinate modifications done inside entity.update()
                entity.x += Math.cos(angle) * (entity.speed || 1) * 1.8;
                entity.y += Math.sin(angle) * (entity.speed || 1) * 1.8;
            }
        }
    }

    // KAMIKAZE COLLISIONS (Updated with Alliance Logic)
    for (let e1 of entities) {
        if (!e1.active || !e1.isKamikaze) continue;
        for (let e2 of entities) {
            if (e1 !== e2 && areEnemies(e1.team, e2.team) && e2.active) {
                let dist = Math.hypot(e1.x - e2.x, e1.y - e2.y);
                if (dist < e1.collisionRadius + e2.collisionRadius) {
                    e2.takeDamage(e1.maxHealth * 5); 
                    e1.takeDamage(e1.health + e1.shield + 9999);
                }
            }
        }
    }

    // PHASE 2: Targeting, Firing, and Drawing
    for (let entity of entities) {
        if (!entity.active) continue;
        // Only target actual enemies
        let enemies = entities.filter(e => areEnemies(entity.team, e.team));
        entity.fireWeapons(enemies, projectiles);
        entity.draw(ctx);
    }

    // Projectile Updates
    projectiles = projectiles.filter(p => p.active);
    for (let p of projectiles) {
        p.update();
        p.draw(ctx);
        
        if (p.active) {
            for (let e of entities) {
                // Prevent friendly fire + alliance fire
                if (areEnemies(p.team, e.team) && e.active) {
                    let dist = Math.hypot(e.x - p.x, e.y - p.y);
                    if (dist < e.collisionRadius) {
                        e.takeDamage(p.damage);
                        p.active = false;
                        break;
                    }
                }
            }
        }
    }

    // UPDATE UI COUNTS
    if (!uiContainer.classList.contains('minimized')) {
        let pCount = document.getElementById('count-purple');
        if(pCount) pCount.innerText = teamTotals.Purple;
        let bCount = document.getElementById('count-brown');
        if(bCount) bCount.innerText = teamTotals.Brown;
    }
    
    // Fallback UI updaters if the user kept the old Advanced Stats blocks in HTML
    let ptc = document.getElementById('p-tie-c'); if(ptc) ptc.innerText = counts.Purple.TIEFighter;
    let psc = document.getElementById('p-sd-c'); if(psc) psc.innerText = counts.Purple.StarDestroyer;
    let pdc = document.getElementById('p-ds-c'); if(pdc) pdc.innerText = counts.Purple.DeathStar;
    let pkc = document.getElementById('p-skb-c'); if(pkc) pkc.innerText = counts.Purple.StarkillerBase;
    
    let btc = document.getElementById('b-tie-c'); if(btc) btc.innerText = counts.Brown.TIEFighter;
    let bsc = document.getElementById('b-sd-c'); if(bsc) bsc.innerText = counts.Brown.StarDestroyer;
    let bdc = document.getElementById('b-ds-c'); if(bdc) bdc.innerText = counts.Brown.DeathStar;
    let bkc = document.getElementById('b-skb-c'); if(bkc) bkc.innerText = counts.Brown.StarkillerBase;

    // Draw Dynamic Top Right Stats Panel
    updateTopRightPanel(counts);

    requestAnimationFrame(animate);
}
