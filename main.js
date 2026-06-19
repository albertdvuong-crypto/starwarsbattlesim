const canvas = document.getElementById('sim-canvas');
const ctx = canvas.getContext('2d');

let allEntities = [];
let projectiles = [];
let gameMode = 'A'; // A = Deep Space, B = Planet Orbit
let isSimulating = false;
let animationId;

// Teams configurations
const TEAMS_CFG = {
    'purple': { name: 'Purple', color: '#9b59b6' },
    'brown': { name: 'Brown', color: '#a0522d' },
    'pink': { name: 'Pink', color: '#ffb6c1' },
    'lightbrown': { name: 'LightBrown', color: '#d2b48c' }
};

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- UI Logic & Dynamic Caps ---
function updateCaps() {
    const teamKeys = Object.keys(TEAMS_CFG);
    const activeCount = teamKeys.filter(id => document.getElementById(`active-${id}`).checked).length || 1;

    // Apply strict bounds logic
    const maxTie = Math.floor(420 / activeCount);
    const maxSd = Math.floor(84 / activeCount);
    const maxDs = 2;
    const maxSkb = 1;

    teamKeys.forEach(id => {
        const tieInput = document.getElementById(`${id}-tie`);
        const sdInput = document.getElementById(`${id}-sd`);
        const dsInput = document.getElementById(`${id}-ds`);
        const skbInput = document.getElementById(`${id}-skb`);

        // Update Max HTML attributes
        tieInput.max = maxTie;
        sdInput.max = maxSd;
        dsInput.max = maxDs;
        skbInput.max = maxSkb;

        // Clamp values if they exceed new maxes dynamically
        if(parseInt(tieInput.value) > maxTie) tieInput.value = maxTie;
        if(parseInt(sdInput.value) > maxSd) sdInput.value = maxSd;
        if(parseInt(dsInput.value) > maxDs) dsInput.value = maxDs;
        if(parseInt(skbInput.value) > maxSkb) skbInput.value = maxSkb;
    });
}

// Bind events to update caps on checking/unchecking teams
document.querySelectorAll('.team-toggle').forEach(el => {
    el.addEventListener('change', updateCaps);
});

// Initial caps calculation
updateCaps();

document.getElementById('btn-mode-a').addEventListener('click', () => {
    gameMode = 'A';
    document.getElementById('btn-mode-a').classList.add('active');
    document.getElementById('btn-mode-b').classList.remove('active');
    document.getElementById('planet-setup').classList.add('hidden');
});

document.getElementById('btn-mode-b').addEventListener('click', () => {
    gameMode = 'B';
    document.getElementById('btn-mode-b').classList.add('active');
    document.getElementById('btn-mode-a').classList.remove('active');
    document.getElementById('planet-setup').classList.remove('hidden');
});

document.getElementById('btn-modify').addEventListener('click', () => {
    isSimulating = false;
    cancelAnimationFrame(animationId);
    document.getElementById('setup-panel').classList.remove('hidden');
    document.getElementById('btn-modify').classList.add('hidden');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

document.getElementById('btn-run').addEventListener('click', () => {
    initiateBattle();
});

// --- Battle Initialization ---
function initiateBattle() {
    allEntities = [];
    projectiles = [];
    
    // 1. Gather Active Teams
    const activeTeams = [];
    Object.keys(TEAMS_CFG).forEach(id => {
        if (document.getElementById(`active-${id}`).checked) {
            activeTeams.push({
                id: id,
                name: TEAMS_CFG[id].name,
                color: TEAMS_CFG[id].color,
                alliance: document.getElementById(`alliance-${id}`).value,
                skb: parseInt(document.getElementById(`${id}-skb`).value) || 0,
                ds: parseInt(document.getElementById(`${id}-ds`).value) || 0,
                sd: parseInt(document.getElementById(`${id}-sd`).value) || 0,
                tie: parseInt(document.getElementById(`${id}-tie`).value) || 0
            });
        }
    });

    if (activeTeams.length === 0) return alert("Please select at least one active team.");

    // 2. Setup Quadrants Based on Active Teams
    const w = canvas.width;
    const h = canvas.height;
    
    // We create 4 potential quadrant centers
    const quadrants = [
        { x: w * 0.25, y: h * 0.25 }, // Top-Left
        { x: w * 0.75, y: h * 0.25 }, // Top-Right
        { x: w * 0.25, y: h * 0.75 }, // Bottom-Left
        { x: w * 0.75, y: h * 0.75 }  // Bottom-Right
    ];

    // Shuffle quadrants dynamically for random placement
    quadrants.sort(() => Math.random() - 0.5);

    // 3. Spawn Planet (if Mode B)
    if (gameMode === 'B') {
        const planetTeamName = document.getElementById('planet-team').value;
        const matchingTeam = activeTeams.find(t => t.name === planetTeamName);
        if (matchingTeam) {
            allEntities.push(new Planet(w / 2, h / 2, matchingTeam.name, matchingTeam.alliance, matchingTeam.color));
        } else {
            // Default to neutral/first team if selected planet defender is inactive
            allEntities.push(new Planet(w / 2, h / 2, activeTeams[0].name, activeTeams[0].alliance, activeTeams[0].color));
        }
    }

    // 4. Spawn Fleets
    activeTeams.forEach((team, index) => {
        // Assign a shuffled quadrant center
        let cx = quadrants[index % quadrants.length].x;
        let cy = quadrants[index % quadrants.length].y;
        
        let r = () => (Math.random() - 0.5) * 300; // Random spread
        
        for (let i = 0; i < team.skb; i++) allEntities.push(new StarkillerBase(cx + r(), cy + r(), team.name, team.alliance, team.color));
        for (let i = 0; i < team.ds; i++) allEntities.push(new DeathStar(cx + r(), cy + r(), team.name, team.alliance, team.color));
        for (let i = 0; i < team.sd; i++) allEntities.push(new StarDestroyer(cx + r(), cy + r(), team.name, team.alliance, team.color, gameMode));
        for (let i = 0; i < team.tie; i++) allEntities.push(new TIEFighter(cx + r(), cy + r(), team.name, team.alliance, team.color, gameMode));
    });

    // Hide UI
    document.getElementById('setup-panel').classList.add('hidden');
    document.getElementById('btn-modify').classList.remove('hidden');
    isSimulating = true;
    gameLoop();
}

// --- Main Loop ---
function gameLoop() {
    if (!isSimulating) return;

    // Fade effect for trails
    ctx.fillStyle = 'rgba(5, 5, 16, 0.3)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Filter dead objects
    allEntities = allEntities.filter(e => e.active);
    projectiles = projectiles.filter(p => p.active);

    const w = canvas.width;
    const h = canvas.height;
    const centerX = w / 2;
    const centerY = h / 2;

    // Process Entities
    for (let e of allEntities) {
        // Fire logic
        let enemies = allEntities.filter(en => en.alliance !== e.alliance && en.active);
        e.fireWeapons(enemies, projectiles);
        
        // Update Movement
        if (e.update) {
            let isDefendingOrbit = false;
            if (gameMode === 'B' && e instanceof StarDestroyer || e instanceof TIEFighter) {
                // Defender checking
                const planet = allEntities.find(p => p instanceof Planet);
                if (planet && planet.alliance === e.alliance) isDefendingOrbit = true;
            }
            e.update(w, h, isDefendingOrbit, centerX, centerY, allEntities, projectiles);
        }
        
        e.draw(ctx);
    }

    // Process Projectiles
    for (let p of projectiles) {
        p.update();
        p.draw(ctx);
        
        // Collision detection
        if (p.active) {
            for (let e of allEntities) {
                if (e.alliance !== p.alliance && e.active) {
                    let dist = Math.hypot(p.x - e.x, p.y - e.y);
                    if (dist < e.collisionRadius) {
                        e.takeDamage(p.damage);
                        p.active = false;
                        break;
                    }
                }
            }
        }
    }

    animationId = requestAnimationFrame(gameLoop);
}
