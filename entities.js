const TEAM_PURPLE = '#9b59b6';
const TEAM_BROWN = '#a0522d';

// --- WEAPON FACTORIES ---
function createLightWeapon() {
    return { damage: 5, cooldown: 700, range: 200, speed: 10, color: '#f1c40f', radius: 1.2, priorities: ['TIEFighter', 'StarDestroyer', 'DeathStar', 'StarkillerBase', 'Planet'], lastFired: Date.now() - Math.random() * 500 };
}
function createHeavyWeapon() {
    return { damage: 50, cooldown: 1500, range: 500, speed: 10, color: '#e74c3c', radius: 3, priorities: ['StarDestroyer', 'DeathStar', 'StarkillerBase', 'Planet', 'TIEFighter'], lastFired: Date.now() - Math.random() * 1500 };
}
function createDSSuperlaser() {
    return { damage: 30000, cooldown: 30000, range: 10000, speed: 11, color: '#2ecc71', radius: 8, priorities: ['DeathStar', 'StarkillerBase', 'Planet', 'StarDestroyer', 'TIEFighter'], lastFired: Date.now() - Math.random() * 12000 };
}
function createSKBSuperlaser() {
    return { damage: 60000, cooldown: 60000, range: 15000, speed: 12, color: 'red', radius: 16, priorities: ['DeathStar', 'StarkillerBase', 'Planet', 'StarDestroyer', 'TIEFighter'], lastFired: Date.now() - Math.random() * 20000 };
}

class Projectile {
    constructor(x, y, vx, vy, damage, team, color, range, radius = 2) {
        this.x = x; this.y = y; this.vx = vx; this.vy = vy;
        this.damage = damage; this.team = team; this.color = color;
        this.distanceTraveled = 0;
        this.range = range;
        this.radius = radius;
        this.active = true;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        let speed = Math.sqrt(this.vx*this.vx + this.vy*this.vy);
        this.distanceTraveled += speed;
        if (this.distanceTraveled > this.range) this.active = false;
    }
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath(); 
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); 
        ctx.fill();
    }
}

class Entity {
    constructor(x, y, team) {
        this.x = x; this.y = y; this.team = team;
        this.color = team === 'Purple' ? TEAM_PURPLE : TEAM_BROWN;
        this.vx = 0; this.vy = 0; this.angle = 0;
        this.weapons = []; this.active = true;
        this.collisionRadius = 10; 
    }

    takeDamage(amount) {
        if (this.shield > 0) {
            this.shield -= amount;
            if (this.shield < 0) {
                this.health += this.shield; 
                this.shield = 0;
            }
        } else {
            this.health -= amount;
        }
        if (this.health <= 0) this.active = false;
    }

    fireWeapons(enemies, projectilesArray) {
        let now = Date.now();
        for (let w of this.weapons) {
            if (now - w.lastFired > w.cooldown) {
                let target = null;
                let minDist = w.range;

                for (let priority of w.priorities) {
                    for (let e of enemies) {
                        if (!e.active) continue;
                        if (e.constructor.name === priority) {
                            let dist = Math.hypot(e.x - this.x, e.y - this.y);
                            if (dist < minDist) { 
                                minDist = dist; 
                                target = e; 
                            }
                        }
                    }
                    if (target) break; 
                }
                
                if (target) {
                    w.lastFired = now + (Math.random() * 400 - 200);
                    let angle = Math.atan2(target.y - this.y, target.x - this.x);
                    angle += (Math.random() - 0.5) * 0.1; 
                    let pVx = Math.cos(angle) * w.speed;
                    let pVy = Math.sin(angle) * w.speed;
                    
                    projectilesArray.push(new Projectile(this.x, this.y, pVx, pVy, w.damage, this.team, w.color, w.range, w.radius));
                    
                    if(this instanceof TIEFighter) {
                        this.angle = angle; 
                    }
                }
            }
        }
    }

    drawBars(ctx, yOffset) {
        if (this.health <= 0 || this instanceof TIEFighter) return;
        const barWidth = this.collisionRadius * 1.5;
        const hpPercent = Math.max(0, this.health / this.maxHealth);
        
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x - barWidth/2, this.y - yOffset, barWidth, 4);
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(this.x - barWidth/2, this.y - yOffset, barWidth * hpPercent, 4);

        if (this.maxShield > 0) {
            const shPercent = Math.max(0, this.shield / this.maxShield);
            ctx.fillStyle = '#3498db';
            ctx.fillRect(this.x - barWidth/2, this.y - yOffset - 5, barWidth * shPercent, 3);
        }
    }
}

class Planet extends Entity {
    constructor(x, y, team) {
        super(x, y, team);
        this.radius = 140; this.collisionRadius = 140;
        this.maxHealth = 10000; this.health = this.maxHealth;
        this.maxShield = 10000; this.shield = this.maxShield;
        
        for(let i=0; i<1; i++) this.weapons.push(createHeavyWeapon());

        this.lastSpawn = Date.now(); 
    }
    update() {} 
    draw(ctx) {
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = this.color; 
        ctx.lineWidth = 4; ctx.stroke();
        this.drawBars(ctx, this.radius + 15);
    }
}

class StarkillerBase extends Entity {
    constructor(x, y, team) {
        super(x, y, team);
        this.radius = 90; this.collisionRadius = 90;
        this.maxHealth = 70000; this.health = this.maxHealth;
        this.maxShield = 50000; this.shield = this.maxShield;
        
        this.weapons.push(createSKBSuperlaser());
        for(let i=0; i<10; i++) this.weapons.push(createHeavyWeapon());
        for(let i=0; i<40; i++) this.weapons.push(createLightWeapon());

        this.lastSpawn = Date.now(); 
    }
    update() {} 
    draw(ctx) {
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color; ctx.fill();
        ctx.beginPath(); ctx.arc(this.x + 30, this.y - 20, 20, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill();
        this.drawBars(ctx, this.radius + 15);
    }
}

class DeathStar extends Entity {
    constructor(x, y, team) {
        super(x, y, team);
        this.radius = 55; this.collisionRadius = 55;
        this.maxHealth = 40000; this.health = this.maxHealth;
        this.maxShield = 20000; this.shield = this.maxShield;
        
        this.weapons.push(createDSSuperlaser());
        for(let i=0; i<5; i++) this.weapons.push(createHeavyWeapon());
        for(let i=0; i<15; i++) this.weapons.push(createLightWeapon());

        this.lastSpawn = Date.now(); 
    }
    update() {} 
    draw(ctx) {
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color; ctx.fill();
        ctx.beginPath(); ctx.arc(this.x + 15, this.y - 15, 12, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fill();
        this.drawBars(ctx, this.radius + 15);
    }
}

class StarDestroyer extends Entity {
    constructor(x, y, team, mode) {
        super(x, y, team);
        this.mode = mode;
        this.length = mode === 'A' ? 16 : 35;
        this.width = mode === 'A' ? 10 : 20;
        this.collisionRadius = this.length;
        
        this.maxHealth = 2000; this.health = this.maxHealth;
        this.maxShield = 1000; this.shield = this.maxShield;
        
        for(let i=0; i<2; i++) this.weapons.push(createHeavyWeapon());
        for(let i=0; i<10; i++) this.weapons.push(createLightWeapon());
        
        this.vx = (Math.random() - 0.5);
        this.vy = (Math.random() - 0.5);
        this.lastSpawn = Date.now();
    }

    update(width, height, isDefendingOrbit, centerX, centerY, allEntities) {
        let dx = centerX - this.x; let dy = centerY - this.y;
        let dist = Math.hypot(dx, dy);

        if (this.mode === 'B') {
            if (isDefendingOrbit) {
                if (dist > 0) {
                    this.vx += (dx / dist) * 0.02; 
                    this.vy += (dy / dist) * 0.02;
                }
            } else {
                let idealDist = 380; 
                if (dist > 0) {
                    let radialForce = (dist - idealDist) * 0.001; 
                    this.vx += (dx / dist) * radialForce;
                    this.vy += (dy / dist) * radialForce;
                    this.vx += (-dy / dist) * 0.015;
                    this.vy += (dx / dist) * 0.015;
                }
            }
        } else {
            // Mode A: Deep Space Battle. Drift towards center to engage enemy fleet.
            if (dist > 0) {
                this.vx += (dx / dist) * 0.000001; 
                this.vy += (dy / dist) * 0.000001;
            }
        }

        // Avoid crashing into other large capital ships
        for (let other of allEntities) {
            if (other === this || other instanceof TIEFighter) continue;
            let checkDx = this.x - other.x; let checkDy = this.y - other.y;
            let checkDist = Math.hypot(checkDx, checkDy);
            let minDist = this.collisionRadius + other.collisionRadius + 20;
            
            if (checkDist < minDist && checkDist > 0) {
                this.vx += (checkDx / checkDist) * 0.1;
                this.vy += (checkDy / checkDist) * 0.1;
            }
        }

        let speed = Math.hypot(this.vx, this.vy);
        if (speed > 1.2) { this.vx = (this.vx / speed) * 1.2; this.vy = (this.vy / speed) * 1.2; }

        this.x += this.vx; this.y += this.vy;
        this.angle = Math.atan2(this.vy, this.vx);

        if (this.x < 0) this.x = width; if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height; if (this.y > height) this.y = 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y); ctx.rotate(this.angle);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(this.length / 2, 0); 
        ctx.lineTo(-this.length / 2, -this.width / 2);
        ctx.lineTo(-this.length / 2, this.width / 2);
        ctx.closePath(); ctx.fill();
        ctx.restore();
        this.drawBars(ctx, this.width + 10);
    }
}

class TIEFighter extends Entity {
    constructor(x, y, team, mode) {
        super(x, y, team);
        this.mode = mode;
        this.maxHealth = 20; this.health = 20;
        this.maxShield = 0; this.shield = 0;
        this.collisionRadius = mode === 'A' ? 2 : 6;
        
        this.weapons.push(createLightWeapon());

        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
    }
    
    update(width, height, isDefendingOrbit, centerX, centerY) {
        let dx = centerX - this.x; let dy = centerY - this.y;
        let dist = Math.hypot(dx, dy);

        if (this.mode === 'B') {
            let idealDist = 320; 
            if (dist > 0) {
                let radialForce = (dist - idealDist) * 0.003;
                this.vx += (dx / dist) * radialForce;
                this.vy += (dy / dist) * radialForce;

                let direction = isDefendingOrbit ? 1 : -1;
                this.vx += (-dy / dist) * 0.04 * direction;
                this.vy += (dx / dist) * 0.04 * direction;
            }
        } else {
            // Mode A: Deep Space Battle. Swarm towards the center to fight.
            if (dist > 0) {
                this.vx += (dx / dist) * 0.005;
                this.vy += (dy / dist) * 0.005;
            }
        }
        
        this.vx += (Math.random() - 0.5) * 0.5;
        this.vy += (Math.random() - 0.5) * 0.5;
        
        let speed = Math.hypot(this.vx, this.vy);
        if (speed > 4) { this.vx = (this.vx / speed) * 4; this.vy = (this.vy / speed) * 4; }

        this.x += this.vx; this.y += this.vy;
        if (speed > 1) this.angle = Math.atan2(this.vy, this.vx);

        if (this.x < 0) this.x = width; if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height; if (this.y > height) this.y = 0;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        if (this.mode === 'A') {
            ctx.beginPath(); ctx.arc(this.x, this.y, 1.5, 0, Math.PI * 2); ctx.fill();
        } else {
            ctx.save();
            ctx.translate(this.x, this.y); ctx.rotate(this.angle);
            ctx.fillRect(-3, -3, 2, 6); 
            ctx.fillRect(1, -3, 2, 6);  
            ctx.fillRect(-1, -1, 2, 2); 
            ctx.restore();
        }
    }
}
