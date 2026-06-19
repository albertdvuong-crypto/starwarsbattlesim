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
    constructor(x, y, vx, vy, damage, team, alliance, color, range, radius = 2) {
        this.x = x; this.y = y; this.vx = vx; this.vy = vy;
        this.damage = damage; this.team = team; this.alliance = alliance; this.color = color;
        this.distanceTraveled = 0;
        this.range = range;
        this.radius = radius;
        this.active = true;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        let speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
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
    constructor(x, y, team, alliance, color) {
        this.x = x; this.y = y; 
        this.team = team; 
        this.alliance = alliance;
        this.color = color;
        this.vx = 0; this.vy = 0; this.angle = 0;
        this.weapons = []; this.active = true;
        this.collisionRadius = 10; 
        
        this.lastDamageTime = 0;
        this.lastRegenTime = Date.now();
    }

    takeDamage(amount) {
        this.lastDamageTime = Date.now(); 
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

    regenerateShields() {
        let now = Date.now();
        let elapsed = now - this.lastRegenTime;
        this.lastRegenTime = now;

        if (this.maxShield > 0 && this.shield < this.maxShield) {
            if (now - this.lastDamageTime > 3000) {
                let regenAmount = (elapsed / 1000) * (this.maxShield * 0.02);
                this.shield = Math.min(this.maxShield, this.shield + regenAmount);
            }
        }
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
                    
                    projectilesArray.push(new Projectile(this.x, this.y, pVx, pVy, w.damage, this.team, this.alliance, w.color, w.range, w.radius));
                    
                    if (this instanceof TIEFighter && !this.broadsideLock) {
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
    constructor(x, y, team, alliance, color) {
        super(x, y, team, alliance, color);
        this.radius = 140; this.collisionRadius = 140;
        this.maxHealth = 10000; this.health = this.maxHealth;
        this.maxShield = 10000; this.shield = this.maxShield;
        for(let i=0; i<10; i++) this.weapons.push(createHeavyWeapon());
    }
    update() { this.regenerateShields(); } 
    draw(ctx) {
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff'; ctx.fill();
        ctx.strokeStyle = this.color; 
        ctx.lineWidth = 4; ctx.stroke();
        this.drawBars(ctx, this.radius + 15);
    }
}

class StarkillerBase extends Entity {
    constructor(x, y, team, alliance, color) {
        super(x, y, team, alliance, color);
        this.radius = 90; this.collisionRadius = 90;
        this.maxHealth = 70000; this.health = this.maxHealth;
        this.maxShield = 50000; this.shield = this.maxShield;
        this.weapons.push(createSKBSuperlaser());
        for(let i=0; i<10; i++) this.weapons.push(createHeavyWeapon());
        for(let i=0; i<40; i++) this.weapons.push(createLightWeapon());
    }
    update() { this.regenerateShields(); } 
    draw(ctx) {
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color; ctx.fill();
        ctx.beginPath(); ctx.arc(this.x + 30, this.y - 20, 20, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill();
        this.drawBars(ctx, this.radius + 15);
    }
}

class DeathStar extends Entity {
    constructor(x, y, team, alliance, color) {
        super(x, y, team, alliance, color);
        this.radius = 55; this.collisionRadius = 55;
        this.maxHealth = 40000; this.health = this.maxHealth;
        this.maxShield = 20000; this.shield = this.maxShield;
        this.weapons.push(createDSSuperlaser());
        for(let i=0; i<5; i++) this.weapons.push(createHeavyWeapon());
        for(let i=0; i<15; i++) this.weapons.push(createLightWeapon());
    }
    update() { this.regenerateShields(); } 
    draw(ctx) {
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color; ctx.fill();
        ctx.beginPath(); ctx.arc(this.x + 15, this.y - 15, 12, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fill();
        this.drawBars(ctx, this.radius + 15);
    }
}

class StarDestroyer extends Entity {
    constructor(x, y, team, alliance, color, mode) {
        super(x, y, team, alliance, color);
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

        const roll = Math.random();
        if (roll < 0.25) this.role = 'flanker';
        else if (roll < 0.5) this.role = 'escort';
        else this.role = 'brawler';

        this.flankY = Math.random() < 0.5 ? 150 : window.innerHeight - 150;
        this.escortTarget = null;
        this.orbitOffset = Math.random() * Math.PI * 2;
        this.isKamikaze = false;
        this.broadsideLock = false; 
    }

    update(width, height, isDefendingOrbit, centerX, centerY, allEntities) {
        this.regenerateShields();
        
        if (this.health < this.maxHealth * 0.35 && this.shield <= 0) {
            this.isKamikaze = true;
        }

        let enemies = allEntities.filter(e => e.alliance !== this.alliance && e.active);
        let allies = allEntities.filter(e => e.alliance === this.alliance && e.active && (e instanceof DeathStar || e instanceof StarkillerBase || e instanceof Planet));

        if (this.role === 'escort' && !this.escortTarget && allies.length > 0) {
            this.escortTarget = allies[Math.floor(Math.random() * allies.length)];
        }
        if (this.escortTarget && !this.escortTarget.active) this.escortTarget = null;

        this.broadsideLock = false;
        let speedCap = this.isKamikaze ? 2.5 : 1.2;

        if (this.isKamikaze) {
            let target = enemies.find(e => e instanceof Planet || e instanceof StarkillerBase || e instanceof DeathStar) || enemies[0];
            if (target) {
                let dx = target.x - this.x; let dy = target.y - this.y;
                let dist = Math.hypot(dx, dy);
                this.vx += (dx / dist) * 0.05;
                this.vy += (dy / dist) * 0.05;
            }
        } else if (this.role === 'escort' && this.escortTarget) {
            this.orbitOffset += 0.005;
            let idealX = this.escortTarget.x + Math.cos(this.orbitOffset) * (this.escortTarget.radius + 150);
            let idealY = this.escortTarget.y + Math.sin(this.orbitOffset) * (this.escortTarget.radius + 150);
            
            let dx = idealX - this.x; let dy = idealY - this.y;
            this.vx += dx * 0.005;
            this.vy += dy * 0.005;
        } else if (this.mode === 'B') {
            let dx = centerX - this.x; let dy = centerY - this.y;
            let dist = Math.hypot(dx, dy);
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
            let shieldPercent = this.maxShield > 0 ? (this.shield / this.maxShield) : 0;
            // Generalized push towards center/enemy
            let targetX = width / 2;
            let enemy = enemies[0];
            if(enemy) targetX = enemy.x;

            if (this.role === 'flanker' && shieldPercent >= 0.4) {
                let targetY = this.flankY;
                let dx = targetX - this.x; let dy = targetY - this.y;
                let dist = Math.hypot(dx, dy);
                if (dist > 200) {
                    this.vx += (dx / dist) * 0.01;
                    this.vy += (dy / dist) * 0.02;
                } else {
                    this.role = 'brawler'; 
                }
            } else {
                let sideDx = targetX - this.x;
                this.vx += Math.sign(sideDx) * 0.008;
            }
        }

        // Broadside Logic
        if (!this.isKamikaze && !this.escortTarget) {
            let nearestMajorEnemy = enemies.find(e => (e instanceof StarDestroyer || e instanceof DeathStar || e instanceof StarkillerBase) && Math.hypot(e.x - this.x, e.y - this.y) < 350);
            if (nearestMajorEnemy) {
                let dx = nearestMajorEnemy.x - this.x;
                let dy = nearestMajorEnemy.y - this.y;
                let dist = Math.hypot(dx, dy);
                
                // Set AI velocity to perpendicular strafe
                let strafeVx = -dy / dist;
                let strafeVy = dx / dist;
                
                this.vx += strafeVx * 0.02;
                this.vy += strafeVy * 0.02;
                this.broadsideLock = true;
            }
        }

        // Avoid crashing into other large capital ships
        if (!this.isKamikaze) {
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
        }

        // --- NATURAL MOVEMENT FIX ---
        // Instead of sliding based on vx/vy directly, we align our ship to the desired vector
        // and move ONLY forward.
        let desiredSpeed = Math.hypot(this.vx, this.vy);
        if (desiredSpeed > speedCap) desiredSpeed = speedCap;

        if (desiredSpeed > 0.05) {
            let desiredAngle = Math.atan2(this.vy, this.vx);
            
            // Smoothly rotate heading toward the desired angle
            let angleDiff = desiredAngle - this.angle;
            angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
            this.angle += angleDiff * 0.05; 

            // Move ship strictly forward to prevent sideways drifting
            this.x += Math.cos(this.angle) * desiredSpeed;
            this.y += Math.sin(this.angle) * desiredSpeed;

            // Decay forces (friction)
            this.vx *= 0.95;
            this.vy *= 0.95;
        }

        if (this.x < 0) this.x = width; if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height; if (this.y > height) this.y = 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y); ctx.rotate(this.angle);
        
        if (this.isKamikaze) {
            ctx.fillStyle = Date.now() % 400 < 200 ? 'red' : this.color;
        } else {
            ctx.fillStyle = this.color;
        }

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
    constructor(x, y, team, alliance, color, mode) {
        super(x, y, team, alliance, color);
        this.mode = mode;
        this.maxHealth = 20; this.health = 20;
        this.maxShield = 0; this.shield = 0;
        this.collisionRadius = mode === 'A' ? 2 : 6;
        this.weapons.push(createLightWeapon());

        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        
        const roll = Math.random();
        if (roll < 0.3) this.role = 'interceptor';
        else if (roll < 0.6) this.role = 'escort';
        else this.role = 'swarm';

        this.escortTarget = null;
        this.orbitOffset = Math.random() * Math.PI * 2;
    }
    
    update(width, height, isDefendingOrbit, centerX, centerY, allEntities, projectiles) {
        this.regenerateShields();

        if (this.role === 'interceptor') {
            let threat = projectiles.find(p => p.alliance !== this.alliance && p.active && p.damage > 20 && Math.hypot(p.x - this.x, p.y - this.y) < 250);
            if (threat) {
                let dx = threat.x - this.x; let dy = threat.y - this.y;
                let dist = Math.hypot(dx, dy);
                this.vx += (dx / dist) * 0.15;
                this.vy += (dy / dist) * 0.15;

                if (dist < 30) {
                    threat.active = false; 
                    this.weapons[0].lastFired = Date.now(); 
                }
            }
        } 
        
        if (this.role === 'escort' && !this.escortTarget) {
            let allies = allEntities.filter(e => e.alliance === this.alliance && e.active && (e instanceof StarDestroyer || e instanceof DeathStar || e instanceof StarkillerBase));
            if (allies.length > 0) this.escortTarget = allies[Math.floor(Math.random() * allies.length)];
        }
        if (this.escortTarget && !this.escortTarget.active) this.escortTarget = null;

        if (this.role === 'escort' && this.escortTarget) {
            this.orbitOffset += 0.02; 
            let idealX = this.escortTarget.x + Math.cos(this.orbitOffset) * (this.escortTarget.radius || this.escortTarget.length * 1.5);
            let idealY = this.escortTarget.y + Math.sin(this.orbitOffset) * (this.escortTarget.radius || this.escortTarget.length * 1.5);
            
            let dx = idealX - this.x; let dy = idealY - this.y;
            let dist = Math.hypot(dx, dy);
            if (dist > 0) {
                this.vx += (dx / dist) * 0.05;
                this.vy += (dy / dist) * 0.05;
            }
        } else {
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
                if (dist > 0) {
                    this.vx += (dx / dist) * 0.015;
                    this.vy += (dy / dist) * 0.015;
                }
            }
        }
        
        this.vx += (Math.random() - 0.5) * 0.5;
        this.vy += (Math.random() - 0.5) * 0.5;
        
        // --- NATURAL MOVEMENT FIX ---
        let desiredSpeed = Math.hypot(this.vx, this.vy);
        if (desiredSpeed > 4) desiredSpeed = 4;

        if (desiredSpeed > 0.1) {
            let desiredAngle = Math.atan2(this.vy, this.vx);
            let angleDiff = desiredAngle - this.angle;
            angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
            this.angle += angleDiff * 0.2; // Quick turn rate for fighters

            this.x += Math.cos(this.angle) * desiredSpeed;
            this.y += Math.sin(this.angle) * desiredSpeed;

            this.vx *= 0.9;
            this.vy *= 0.9;
        }

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
