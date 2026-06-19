const canvas = document.getElementById('sim-canvas');
const ctx = canvas.getContext('2d');
let width, height;
let entities = [];
let projectiles = [];
let currentMode = 'A';
let simRunning = false;

// UI Elements
const uiContainer = document.getElementById('ui-container');
const btnModeA = document.getElementById('btn-mode-a');
const btnModeB = document.getElementById('btn-mode-b');
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
    btnModeA.classList.toggle('active', mode === 'A');
    btnModeB.classList.toggle('active', mode === 'B');
    modeDisplay.innerText = mode === 'A' ? "Deep Space Battle" : "Planetary Orbit Battle";
    
    // Maximize menu back to default if they switch modes
    uiContainer.classList.remove('minimized');
    setupPanel.classList.remove('hidden');
    btnModify.classList.add('hidden');
    
    // Disable inputs for SKB and DS in Mode B
    const disableBig = (mode === 'B');
    document.getElementById('p-skb').disabled = disableBig;
    document.getElementById('p-ds').disabled = disableBig;
    document.getElementById('b-skb').disabled = disableBig;
    document.getElementById('b-ds').disabled = disableBig;
    
    // Show/Hide Planet Setup
    if(mode === 'B') planetSetup.classList.remove('hidden');
    else planetSetup.classList.add('hidden');
}

btnModeA.addEventListener('click', () => toggleMode('A'));
btnModeB.addEventListener('click', () => toggleMode('B'));

// Helper to spawn ships on the correct side of the screen
function getSpawnCoords(team) {
    const edgePadding = 200;   // Distance from the very edge of the screen
    const centerPadding = 300; // Distance from the middle split line

    const minX = team === 'Purple' ? edgePadding : width / 2 + centerPadding;
    const maxX = team === 'Purple' ? width / 2 - centerPadding : width - edgePadding;
    
    return {
        x: Math.random() * (maxX - minX) + minX,
        y: Math.random() * (height - (edgePadding * 2)) + edgePadding
    };
}

function spawnFleet(team, prefix) {
    let skbCount = currentMode === 'A' ? Math.min(parseInt(document.getElementById(`${prefix}-skb`).value), 2) : 0;
    let dsCount = currentMode === 'A' ? Math.min(parseInt(document.getElementById(`${prefix}-ds`).value), 5) : 0;
    
    // Enforce base limits on initial spawn too just in case user typed large numbers
    let sdCount = Math.min(parseInt(document.getElementById(`${prefix}-sd`).value), 50);
    let tieCount = Math.min(parseInt(document.getElementById(`${prefix}-tie`).value), 200);

    if (currentMode === 'B') sdCount = Math.min(sdCount, 10);

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
        const planetTeam = planetTeamSelect.value;
        const planetX = planetTeam === 'Purple' ? width / 3 : (width / 3) * 2;
        entities.push(new Planet(planetX, height / 2, planetTeam));
    }

    spawnFleet('Purple', 'p');
    spawnFleet('Brown', 'b');
    
    // Minimize the container layout entirely & show tiny button
    uiContainer.classList.add('minimized');
    btnModify.classList.remove('hidden');
    stats.classList.remove("hidden");
    advancedStats.classList.remove("hidden");
    
    if (!simRunning) {
        simRunning = true;
        animate();
    }
});

btnModify.addEventListener('click', () => {
    uiContainer.classList.remove('minimized');
    setupPanel.classList.remove('hidden');
    btnModify.classList.add('hidden');
    stats.classList.add("hidden");
    advancedStats.classList.add("hidden");
});

function animate() {
    if (!simRunning) return;
    
    ctx.fillStyle = 'rgba(5, 5, 16, 0.4)';
    ctx.fillRect(0, 0, width, height);

    const planet = entities.find(e => e instanceof Planet);
    const planetTeam = planet ? planet.team : null;
    const centerX = planet ? planet.x : width / 2;
    const centerY = planet ? planet.y : height / 2;

    // Filter out inactive entities first
    entities = entities.filter(e => e.active);
    
    let purpleTotal = 0; 
    let brownTotal = 0;

    // Initialize counts for accurate limiting and UI
    let counts = {
        Purple: { TIEFighter: 0, StarDestroyer: 0, DeathStar: 0, StarkillerBase: 0, Planet: 0 },
        Brown: { TIEFighter: 0, StarDestroyer: 0, DeathStar: 0, StarkillerBase: 0, Planet: 0 }
    };

    // Pre-calculate current totals to enforce limits properly
    for (let entity of entities) {
        if (entity.team === 'Purple') purpleTotal++;
        else brownTotal++;
        counts[entity.team][entity.constructor.name]++;
    }

    // PHASE 1: Spawning and Movement
    for (let entity of entities) {
        let now = Date.now();

        // Star Destroyers passively spawn 2 TIEs every 3 seconds (Limit: 750)
        if (entity instanceof StarDestroyer) {
            if (now - entity.lastSpawn > 30000) {
                let toSpawn = Math.min(10, 200 - counts[entity.team].TIEFighter);
                for (let i = 0; i < toSpawn; i++) {
                    entities.push(new TIEFighter(entity.x, entity.y, entity.team, currentMode));
                    counts[entity.team].TIEFighter++;
                }
                entity.lastSpawn = now;
            }
        } 

        // Death Stars passively spawn 10 TIEs (Limit 750) & 2 SDs (Limit 50) every 10s
        if (entity instanceof DeathStar) {
            if (now - entity.lastSpawn > 60000) {
                let tiesToSpawn = Math.min(20, 200 - counts[entity.team].TIEFighter);
                for (let i = 0; i < tiesToSpawn; i++) {
                    entities.push(new TIEFighter(entity.x, entity.y, entity.team, currentMode));
                    counts[entity.team].TIEFighter++;
                }
                let sdsToSpawn = Math.min(2, 50 - counts[entity.team].StarDestroyer);
                for (let i = 0; i < sdsToSpawn; i++) {
                    entities.push(new StarDestroyer(entity.x, entity.y, entity.team, currentMode));
                    counts[entity.team].StarDestroyer++;
                }
                entity.lastSpawn = now;
            }
        } 

        // Starkiller Bases passively spawn 50 TIEs & 5 SDs every 20 seconds
        if (entity instanceof StarkillerBase) {
            if (now - entity.lastSpawn > 60000) {
                let tiesToSpawn = Math.min(50, 200 - counts[entity.team].TIEFighter);
                for (let i = 0; i < tiesToSpawn; i++) {
                    entities.push(new TIEFighter(entity.x, entity.y, entity.team, currentMode));
                    counts[entity.team].TIEFighter++;
                }
                let sdsToSpawn = Math.min(5, 50 - counts[entity.team].StarDestroyer);
                for (let i = 0; i < sdsToSpawn; i++) {
                    entities.push(new StarDestroyer(entity.x, entity.y, entity.team, currentMode));
                    counts[entity.team].StarDestroyer++;
                }
                entity.lastSpawn = now;
            }
        }

        // Planets passively spawn 100 TIEs & 2 SDs
        if (entity instanceof Planet) {
            if (now - entity.lastSpawn > 60000) {
                let tiesToSpawn = Math.min(100, 200 - counts[entity.team].TIEFighter);
                for (let i = 0; i < tiesToSpawn; i++) {
                    entities.push(new TIEFighter(entity.x, entity.y, entity.team, currentMode));
                    counts[entity.team].TIEFighter++;
                }
                let sdsToSpawn = Math.min(2, 50 - counts[entity.team].StarDestroyer);
                for (let i = 0; i < sdsToSpawn; i++) {
                    entities.push(new StarDestroyer(entity.x, entity.y, entity.team, currentMode));
                    counts[entity.team].StarDestroyer++;
                }
                entity.lastSpawn = now;
            }
        }

        // If Orbit mode is on, ONLY the defending team surrounds the planet. Attackers fly normally.
        let isDefendingOrbit = (currentMode === 'B' && entity.team === planetTeam);
        
        // Pass projectiles to update so Interceptors can hunt them
        entity.update(width, height, isDefendingOrbit, centerX, centerY, entities, projectiles);
    }

    // KAMIKAZE COLLISIONS (Entity vs Entity Ramming)
    for (let e1 of entities) {
        if (!e1.active || !e1.isKamikaze) continue;
        for (let e2 of entities) {
            if (e1 !== e2 && e1.team !== e2.team && e2.active) {
                let dist = Math.hypot(e1.x - e2.x, e1.y - e2.y);
                if (dist < e1.collisionRadius + e2.collisionRadius) {
                    e2.takeDamage(e1.maxHealth * 5); // Massive ramming damage
                    e1.takeDamage(e1.health + e1.shield + 9999); // Destroy the kamikaze ship immediately
                }
            }
        }
    }

    // PHASE 2: Targeting, Firing, and Drawing
    for (let entity of entities) {
        if (!entity.active) continue;
        let enemies = entities.filter(e => e.team !== entity.team);
        entity.fireWeapons(enemies, projectiles);
        entity.draw(ctx);
    }

    projectiles = projectiles.filter(p => p.active);
    for (let p of projectiles) {
        p.update();
        p.draw(ctx);
        
        if (p.active) {
            for (let e of entities) {
                if (e.team !== p.team && e.active) {
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
        document.getElementById('count-purple').innerText = purpleTotal;
        document.getElementById('count-brown').innerText = brownTotal;
    }
    
    // Update the Advanced Stats specific counters
    document.getElementById('p-tie-c').innerText = counts.Purple.TIEFighter;
    document.getElementById('p-sd-c').innerText = counts.Purple.StarDestroyer;
    document.getElementById('p-ds-c').innerText = counts.Purple.DeathStar;
    document.getElementById('p-skb-c').innerText = counts.Purple.StarkillerBase;
    
    document.getElementById('b-tie-c').innerText = counts.Brown.TIEFighter;
    document.getElementById('b-sd-c').innerText = counts.Brown.StarDestroyer;
    document.getElementById('b-ds-c').innerText = counts.Brown.DeathStar;
    document.getElementById('b-skb-c').innerText = counts.Brown.StarkillerBase;

    requestAnimationFrame(animate);
}
