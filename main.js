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
    let skbCount = currentMode === 'A' ? parseInt(document.getElementById(`${prefix}-skb`).value) : 0;
    let dsCount = currentMode === 'A' ? parseInt(document.getElementById(`${prefix}-ds`).value) : 0;
    let sdCount = parseInt(document.getElementById(`${prefix}-sd`).value);
    let tieCount = parseInt(document.getElementById(`${prefix}-tie`).value);

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
        const planetX = planetTeam === 'Purple' ? width / 4 : (width / 4) * 3;
        entities.push(new Planet(width / 2, height / 2, planetTeam));
    }

    spawnFleet('Purple', 'p');
    spawnFleet('Brown', 'b');
    
    // Minimize the container layout entirely & show tiny button
    uiContainer.classList.add('minimized');
    btnModify.classList.remove('hidden');
    stats.classList.remove("hidden");
    
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
});

function animate() {
    if (!simRunning) return;
    
    ctx.fillStyle = 'rgba(5, 5, 16, 0.4)';
    ctx.fillRect(0, 0, width, height);

    const planet = entities.find(e => e instanceof Planet);
    const planetTeam = planet ? planet.team : null;
    const centerX = planet ? planet.x : width / 2;
    const centerY = planet ? planet.y : height / 2;

    entities = entities.filter(e => e.active);
    
    let purpleCount = 0; let brownCount = 0;

    // PHASE 1: Spawning and Movement
    for (let entity of entities) {
        if (entity.team === 'Purple') purpleCount++;
        else brownCount++;

        let now = Date.now();

        // Star Destroyers passively spawn 2 TIEs every 3 seconds
        if (entity instanceof StarDestroyer) {
            if (now - entity.lastSpawn > 30000) {
                for (let i = 0; i < 10; i++) {
                    entities.push(new TIEFighter(entity.x, entity.y, entity.team, currentMode));
                }
                entity.lastSpawn = now;
            }
        } 

        // Death Stars passively spawn 10 TIEs every 10s
        if (entity instanceof DeathStar) {
            if (now - entity.lastSpawn > 60000) {
                for (let i = 0; i < 20; i++) {
                    entities.push(new TIEFighter(entity.x, entity.y, entity.team, currentMode));
                }
                for (let i = 0; i < 2; i++) {
                    entities.push(new StarDestroyer(entity.x, entity.y, entity.team, currentMode));
                }
                entity.lastSpawn = now;
            }
        } 

        // Starkiller Bases passively spawn 30 TIEs every 20 seconds
        if (entity instanceof StarkillerBase) {
            if (now - entity.lastSpawn > 60000) {
                for (let i = 0; i < 50; i++) {
                    entities.push(new TIEFighter(entity.x, entity.y, entity.team, currentMode));
                }
                for (let i = 0; i < 5; i++) {
                    entities.push(new StarDestroyer(entity.x, entity.y, entity.team, currentMode));
                }
                entity.lastSpawn = now;
            }
        }

        if (entity instanceof Planet) {
            if (now - entity.lastSpawn > 60000) {
                for (let i = 0; i < 100; i++) {
                    entities.push(new TIEFighter(entity.x, entity.y, entity.team, currentMode));
                }
                for (let i = 0; i < 2; i++) {
                    entities.push(new StarDestroyer(entity.x, entity.y, entity.team, currentMode));
                }
                entity.lastSpawn = now;
            }
        }

        // If Orbit mode is on, ONLY the defending team surrounds the planet. Attackers fly normally.
        let isDefendingOrbit = (currentMode === 'B' && entity.team === planetTeam);
        
        entity.update(width, height, isDefendingOrbit, centerX, centerY, entities);
    }

    // PHASE 2: Targeting, Firing, and Drawing
    for (let entity of entities) {
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

    if (!uiContainer.classList.contains('minimized')) {
        document.getElementById('count-purple').innerText = purpleCount;
        document.getElementById('count-brown').innerText = brownCount;
    }

    requestAnimationFrame(animate);
}