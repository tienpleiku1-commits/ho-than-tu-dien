import React, { useRef, useEffect, useState, useCallback } from 'react';
import { GameState, MaskType, Player, Boss, Projectile, Particle, Rect, BuffType, Item, Minion, Obstacle } from '../types';
import { LEVELS, GRAVITY, FRICTION, JUMP_FORCE, MOVE_SPEED, MASK_STATS, GAME_WIDTH, GAME_HEIGHT, GROUND_Y } from '../constants';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  currentLevel: number;
  setCurrentLevel: (level: number) => void;
  setPlayerStats: (stats: { hp: number; maxHp: number; mana: number; mask: MaskType }) => void;
  setBossStats: (stats: { hp: number; maxHp: number; name: string }) => void;
  setGameMessage: (msg: string) => void;
  activeBuffs: Item[]; // Props from App
  onLevelComplete: (levelId: number) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  setGameState,
  currentLevel,
  setCurrentLevel,
  setPlayerStats,
  setBossStats,
  setGameMessage,
  activeBuffs,
  onLevelComplete
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const isLevelEndingRef = useRef(false);
  
  // Game State Refs
  const playerRef = useRef<Player>({
    x: 100, y: 400, w: 40, h: 60, vx: 0, vy: 0,
    color: MASK_STATS[MaskType.TEU].color,
    faceRight: true,
    hp: 100, maxHp: 100, mana: 100, maxMana: 100, // Updated Mana to 100
    mask: MaskType.TEU,
    unlockedMasks: [MaskType.TEU],
    isGrounded: false,
    isDashing: false,
    isShielded: false,
    lastAttackTime: 0,
    lastSkillTime: 0,
    lastDashTime: 0,
    invulnerableUntil: 0,
    stunnedUntil: 0,
    burnTicks: 0,
    nextBurnTime: 0
  });

  const bossRef = useRef<Boss>({
    x: 800, y: 400, w: 80, h: 100, vx: 0, vy: 0,
    color: '#000', faceRight: false,
    hp: 100, maxHp: 100, name: '', state: 'IDLE', attackCooldown: 0, level: 1,
    burnTicks: 0, nextBurnTime: 0, stunnedUntil: 0,
    lastSummonTime: 0, dodgeCooldown: 0,
    lastSkillTime: 0,
    shieldHp: 0, maxShieldHp: 0, shieldType: 'NONE', phase: 1, lastOrbSpawnTime: 0
  });

  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const minionsRef = useRef<Minion[]>([]);
  const obstaclesRef = useRef<Obstacle[]>([]);

    const keysRef = useRef<{ [key: string]: boolean }>({});
    const mouseRef = useRef<{ x: number, y: number, down: boolean }>({ x: 0, y: 0, down: false });
    const bossImageRef = useRef<HTMLImageElement | null>(null);
    const boss2ImageRef = useRef<HTMLImageElement | null>(null);
    const boss3ImageRef = useRef<HTMLImageElement | null>(null);
    const boss4ImageRef = useRef<HTMLImageElement | null>(null);
    const playerImageRef = useRef<HTMLImageElement | null>(null);
    const player2ImageRef = useRef<HTMLImageElement | null>(null);
    const player3ImageRef = useRef<HTMLImageElement | null>(null);
    const player4ImageRef = useRef<HTMLImageElement | null>(null);
    const background1Ref = useRef<HTMLImageElement | null>(null);
    const background2Ref = useRef<HTMLImageElement | null>(null);
    const background3Ref = useRef<HTMLImageElement | null>(null);
    const background4Ref = useRef<HTMLImageElement | null>(null);

  // Helper to spawn particles
  const spawnParticles = (x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1.0,
        color,
        size: Math.random() * 5 + 2
      });
    }
  };

  // Helper collision
  const checkCollision = (r1: Rect, r2: Rect) => {
    return r1.x < r2.x + r2.w &&
           r1.x + r1.w > r2.x &&
           r1.y < r2.y + r2.h &&
           r1.y + r1.h > r2.y;
  };

  // Calculate Buffs
  const getBuffMultipliers = () => {
      let dmg = 1;
      let speed = 1;
      let hp = 1;
      activeBuffs.forEach(buff => {
          if (buff.buffType === BuffType.DAMAGE) dmg += buff.value;
          if (buff.buffType === BuffType.SPEED) speed += buff.value;
          if (buff.buffType === BuffType.HP) hp += buff.value;
      });
      return { dmg, speed, hp };
  };

  const initLevel = useCallback((levelIndex: number) => {
    const levelData = LEVELS[levelIndex];
    const player = playerRef.current;
    
    // Unlock Masks
    const unlocked = [MaskType.TEU];
    if (levelIndex >= 1) unlocked.push(MaskType.LAN);
    if (levelIndex >= 2) unlocked.push(MaskType.EN);
    if (levelIndex >= 3) unlocked.push(MaskType.DIA);
    player.unlockedMasks = unlocked;

    // Default to Teu on new level
    if (!unlocked.includes(player.mask)) {
        player.mask = MaskType.TEU;
        player.color = MASK_STATS[MaskType.TEU].color;
    }

    // Apply Mask Stats & Buffs to set Max HP
    const stats = MASK_STATS[player.mask];
    const buffs = getBuffMultipliers();
    player.maxHp = 100 * stats.hpMod * buffs.hp;

    // Reset Player State
    player.x = 100;
    player.y = 300;
    player.vx = 0;
    player.vy = 0;
    player.hp = player.maxHp; 
    player.mana = player.maxMana;
    player.isShielded = false;
    player.stunnedUntil = 0;
    player.burnTicks = 0;

    // Reset level ending flag
    isLevelEndingRef.current = false;

    // Setup boss
    let shieldType: 'NONE' | 'FIRE' | 'WIND' = 'NONE';
    let shieldHp = 0;
    if (levelIndex === 1) { // Boss 2
        shieldType = 'FIRE';
        shieldHp = 50; 
    } else if (levelIndex === 2) { // Boss 3
        shieldType = 'WIND';
        shieldHp = 1; // 1 Hit from En Skill to break
    }

    // Determine Boss Size
    const isBoss1 = levelIndex === 0;
    const isBoss2 = levelIndex === 1; // Hoa Than
    const isBoss3 = levelIndex === 2; // Loi Dieu
    
    let bossW = 80;
    let bossH = 100;

    if (isBoss1) { bossW = 140; bossH = 120; }
    else if (isBoss2) { bossW = 120; bossH = 120; }
    else if (isBoss3) { bossW = 160; bossH = 120; } 
    else if (levelIndex === 3) { bossW = 160; bossH = 120; } // Boss 4: Nien Thu (Quadruped)

    // Scale specified bosses by 1.5x (boss 1, boss 2, boss 4)
    if (isBoss1 || isBoss2 || levelIndex === 3) {
        bossW = Math.round(bossW * 1.5);
        bossH = Math.round(bossH * 1.5);
    }

    bossRef.current = {
      x: GAME_WIDTH - 150,
      y: 300,
      w: bossW, 
      h: bossH, 
      vx: 0,
      vy: 0,
      color: levelData.bossColor,
      faceRight: false,
      hp: levelData.bossHp,
      maxHp: levelData.bossHp,
      name: levelData.bossName,
      state: 'IDLE',
      attackCooldown: Date.now() + 2000,
      level: levelData.id,
      burnTicks: 0,
      nextBurnTime: 0,
      stunnedUntil: 0,
      lastSummonTime: Date.now(),
      dodgeCooldown: 0,
      lastSkillTime: 0,
      shieldHp,
      maxShieldHp: shieldHp,
      shieldType,
      phase: 1,
      lastOrbSpawnTime: 0
    };

    projectilesRef.current = [];
    particlesRef.current = [];
    minionsRef.current = [];
    
    // Load Obstacles
    obstaclesRef.current = levelData.obstacles ? JSON.parse(JSON.stringify(levelData.obstacles)) : [];
  }, [activeBuffs]); 

  // Handle Input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;

      if (gameState === GameState.PLAYING) {
        const keyMap: { [key: string]: MaskType } = { 'Digit1': MaskType.TEU, 'Digit2': MaskType.LAN, 'Digit3': MaskType.EN, 'Digit4': MaskType.DIA };
        if (keyMap[e.code]) {
          const newMask = keyMap[e.code];
          const player = playerRef.current;
          
          if (player.unlockedMasks.includes(newMask) && player.mask !== newMask) {
            player.mask = newMask;
            const stats = MASK_STATS[newMask];
            player.color = stats.color;
            
            const buffs = getBuffMultipliers();
            const newMaxHp = 100 * stats.hpMod * buffs.hp;
            const hpPercent = player.hp / player.maxHp;
            player.maxHp = newMaxHp;
            player.hp = newMaxHp * hpPercent;

            spawnParticles(player.x + player.w/2, player.y + player.h/2, '#fff', 10);
            setGameMessage(`Dạng: ${stats.name}`);
            setTimeout(() => setGameMessage(""), 1000);
          } else if (!player.unlockedMasks.includes(newMask)) {
              setGameMessage("Chưa mở khóa!");
              setTimeout(() => setGameMessage(""), 1000);
          }
        }
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current[e.code] = false; };
    const handleMouseDown = () => { mouseRef.current.down = true; };
    const handleMouseUp = () => { mouseRef.current.down = false; };
    const handleMouseMove = (e: MouseEvent) => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = GAME_WIDTH / rect.width;
        const scaleY = GAME_HEIGHT / rect.height;
        mouseRef.current.x = (e.clientX - rect.left) * scaleX;
        mouseRef.current.y = (e.clientY - rect.top) * scaleY;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [gameState, activeBuffs]); 

  // Initial Setup
  useEffect(() => {
    initLevel(currentLevel - 1);
  }, [currentLevel, initLevel]);

    // Load boss images (level 1, 2, 3 and 4)
    useEffect(() => {
        bossImageRef.current = new Image();
        bossImageRef.current.src = '/boss_map_1.png';
        boss2ImageRef.current = new Image();
        boss2ImageRef.current.src = '/boss_map_2.png';
        boss3ImageRef.current = new Image();
        boss3ImageRef.current.src = '/boss_map_3.png';
        boss4ImageRef.current = new Image();
        boss4ImageRef.current.src = '/Boss_map_4.png';
        // Player external sprites
        // TEU form (Dang_1.png)
        playerImageRef.current = new Image();
        playerImageRef.current.src = '/Dang_1.png';
        // LAN form (Dang_2.png)
        player2ImageRef.current = new Image();
        player2ImageRef.current.src = '/Dang_2.png';
        // EN form (Dang_3.png)
        player3ImageRef.current = new Image();
        player3ImageRef.current.src = '/Dang_3.png';
        // DIA form (Dang_4.png)
        player4ImageRef.current = new Image();
        player4ImageRef.current.src = '/Dang_4.png';
        // Level 1 background image
        background1Ref.current = new Image();
        background1Ref.current.src = '/backman_1.png';
        // Level 2 background image
        background2Ref.current = new Image();
        background2Ref.current.src = '/backman_2.png';
        // Level 3 background image
        background3Ref.current = new Image();
        background3Ref.current.src = '/backman_3.png';
        // Level 4 background image
        background4Ref.current = new Image();
        background4Ref.current.src = '/backman_4.png';
    }, []);

  // Main Game Loop
  const update = useCallback((time: number) => {
    // --- VICTORY FIREWORKS LOGIC ---
    if (gameState === GameState.VICTORY) {
         if (Math.random() < 0.1) { 
             const fx = Math.random() * GAME_WIDTH;
             const fy = Math.random() * (GAME_HEIGHT / 2); 
             const color = `hsl(${Math.random() * 360}, 100%, 50%)`;
             spawnParticles(fx, fy, color, 20);
         }
         for (let i = particlesRef.current.length - 1; i >= 0; i--) {
            const p = particlesRef.current[i];
            p.x += p.vx; p.y += p.vy; p.life -= 0.02; 
            p.vy += 0.05; 
            if (p.life <= 0) particlesRef.current.splice(i, 1);
        }
        return;
    }

    if (gameState !== GameState.PLAYING) return;

    const dt = 16.67; 
    const now = Date.now();
    const player = playerRef.current;
    const boss = bossRef.current;
    const levelData = LEVELS[currentLevel - 1];
    const maskStats = MASK_STATS[player.mask];
    const buffs = getBuffMultipliers();

    // --- Player Logic ---
    if (player.burnTicks > 0 && now > player.nextBurnTime) {
        player.hp -= 2;
        player.burnTicks--;
        player.nextBurnTime = now + 1000;
        spawnParticles(player.x, player.y, '#e74c3c', 3);
    }
    if (now < player.stunnedUntil) {
        player.vx = 0;
        player.vy += GRAVITY;
        player.y += player.vy;
        for (const plat of levelData.platforms) {
            if (player.vy > 0 && player.y + player.h - player.vy <= plat.y && player.y + player.h >= plat.y && player.x + player.w > plat.x && player.x < plat.x + plat.w) {
                player.y = plat.y - player.h;
                player.vy = 0;
            }
        }
        setPlayerStats({ hp: player.hp, maxHp: player.maxHp, mana: player.mana, mask: player.mask });
        setBossStats({ hp: boss.hp, maxHp: boss.maxHp, name: boss.name });
        return; 
    }

    let speed = MOVE_SPEED * maskStats.speedMod * buffs.speed;
    if (maskStats.hpMod > 1.2) speed *= 0.8; 

    // Horizontal Movement
    if (keysRef.current['KeyA']) {
      player.vx = -speed;
      player.faceRight = false;
    } else if (keysRef.current['KeyD']) {
      player.vx = speed;
      player.faceRight = true;
    } else {
      player.vx *= FRICTION;
    }

    // OBSTACLE COLLISION (Horizontal)
    for (const obs of obstaclesRef.current) {
        if (!obs.active) continue;
        if (checkCollision({ ...player, x: player.x + player.vx }, obs)) {
             player.vx = 0;
        }
    }

    if (keysRef.current['Space'] && player.isGrounded) {
      player.vy = JUMP_FORCE;
      if (player.mask === MaskType.EN) player.vy *= 1.2;
      player.isGrounded = false;
    }

    if (keysRef.current['KeyQ'] && now - player.lastDashTime > 1000) {
      player.lastDashTime = now;
      player.isDashing = true;
      const dashDir = player.faceRight ? 1 : -1;
      const dashPower = player.mask === MaskType.EN ? 25 : 15;
      player.vx = dashPower * dashDir;
      setTimeout(() => { playerRef.current.isDashing = false; }, 200);
    }

    player.vy += GRAVITY;
    player.x += player.vx;
    player.y += player.vy;

    if (player.x < 0) player.x = 0;
    if (player.x + player.w > GAME_WIDTH) player.x = GAME_WIDTH - player.w;

    player.isGrounded = false;
    for (const plat of levelData.platforms) {
      if (player.vy > 0 && player.y + player.h - player.vy <= plat.y && player.y + player.h >= plat.y && player.x + player.w > plat.x && player.x < plat.x + plat.w) {
        player.y = plat.y - player.h;
        player.vy = 0;
        player.isGrounded = true;
      }
    }
    
    // OBSTACLE COLLISION (Vertical - treat as wall/block)
    for (const obs of obstaclesRef.current) {
        if (!obs.active) continue;
        if (checkCollision(player, obs)) {
            // Simple resolve: Push out based on center
            const pCenter = player.x + player.w/2;
            const oCenter = obs.x + obs.w/2;
            if (pCenter < oCenter) player.x = obs.x - player.w - 1;
            else player.x = obs.x + obs.w + 1;
        }
    }

    // MANA REGENERATION: 5 mana/s after 2s delay
    if (now - player.lastSkillTime > 2000 && player.mana < player.maxMana) {
      player.mana += 5 * (dt / 1000); 
      if (player.mana > player.maxMana) player.mana = player.maxMana;
    }

    const damageBoss = (dmg: number, isSkill: boolean) => {
        if (boss.shieldType === 'FIRE' && boss.shieldHp > 0) {
             if (player.mask === MaskType.LAN) {
                 boss.shieldHp -= dmg;
                 spawnParticles(boss.x + boss.w/2, boss.y + boss.h/2, '#e74c3c', 5);
                 if(boss.shieldHp <= 0) setGameMessage("Giáp Lửa đã vỡ!");
             } else {
                 spawnParticles(boss.x + boss.w/2, boss.y + boss.h/2, '#888', 2);
             }
        } 
        else if (boss.shieldType === 'WIND' && boss.shieldHp > 0) {
             if (player.mask === MaskType.EN && isSkill) {
                 boss.shieldHp = 0;
                 spawnParticles(boss.x + boss.w/2, boss.y + boss.h/2, '#00ffff', 10);
                 setGameMessage("Giáp Gió đã vỡ!");
                 boss.stunnedUntil = now + 3000;
             } else {
                 spawnParticles(boss.x + boss.w/2, boss.y + boss.h/2, '#888', 2);
             }
        }
        else {
            boss.hp -= dmg;
            spawnParticles(boss.x + boss.w/2, boss.y + boss.h/2, '#fff', 5);
            player.mana = Math.min(player.maxMana, player.mana + 5);
        }
    };

    if (mouseRef.current.down && now - player.lastAttackTime > 500) {
      player.lastAttackTime = now;
      const dmg = 5 * maskStats.dmgMod * buffs.dmg; 
      const range = player.mask === MaskType.LAN ? 100 : 60;
      const attackX = player.faceRight ? player.x + player.w : player.x - range;
      const attackRect = { x: attackX, y: player.y, w: range, h: player.h };
      
      if (checkCollision(attackRect, boss)) damageBoss(dmg, false);

      for (let i = minionsRef.current.length - 1; i >= 0; i--) {
          if (checkCollision(attackRect, minionsRef.current[i])) {
              minionsRef.current[i].hp -= dmg;
              spawnParticles(minionsRef.current[i].x, minionsRef.current[i].y, '#fff', 3);
          }
      }
    }

    if (keysRef.current['KeyZ'] && now - player.lastSkillTime > maskStats.skillCd) {
      if (player.mana >= maskStats.skillCost) {
        player.lastSkillTime = now;
        player.mana -= maskStats.skillCost;
        const skillDmgMult = buffs.dmg;

        switch (player.mask) {
          case MaskType.TEU: 
             projectilesRef.current.push({
              x: player.x + (player.faceRight ? player.w : 0), y: player.y + player.h/2, w: 15, h: 15,
              vx: player.faceRight ? 12 : -12, vy: -2, color: '#ffff00', faceRight: player.faceRight, damage: 10 * skillDmgMult, isPlayerOwner: true, lifeTime: 1000
            });
            break;
          case MaskType.LAN: 
            for(let i=0; i<8; i++) {
                projectilesRef.current.push({
                    x: player.x + (player.faceRight ? player.w : -20), y: player.y + 10 + Math.random()*20, w: 25, h: 25,
                    vx: (player.faceRight ? 6 : -6) + Math.random()*4, vy: (Math.random()-0.5) * 2,
                    color: '#e74c3c', faceRight: player.faceRight, damage: 2.5 * skillDmgMult, isPlayerOwner: true, lifeTime: 500, type: 'FIRE'
                });
            }
            const fireRange = { x: player.faceRight ? player.x + player.w : player.x - 150, y: player.y, w: 150, h: player.h };
            if (checkCollision(fireRange, boss)) {
                 damageBoss(20 * skillDmgMult, true);
                 // Special Immunity Logic for Level 2 Boss against LAN
                 if (boss.shieldHp <= 0 && currentLevel !== 2) {
                    boss.burnTicks = 3;
                    boss.nextBurnTime = now + 1000;
                    setGameMessage("Boss bị thiêu đốt!");
                 } else if (currentLevel === 2) {
                    setGameMessage("Boss miễn nhiễm lửa!");
                 }
            }
            break;
          case MaskType.EN: 
            player.vx = (player.faceRight ? 30 : -30);
            player.vy = -5;
            player.invulnerableUntil = now + 500;
            const enSkillRect = { x: player.x - 50, y: player.y - 50, w: 150, h: 150 };
             projectilesRef.current.push({
                x: player.x, y: player.y, w: 100, h: 100, vx: 0, vy: 0, color: 'transparent', faceRight: player.faceRight,
                damage: 15 * skillDmgMult, isPlayerOwner: true, lifeTime: 100 
            });
            if (checkCollision(enSkillRect, boss)) damageBoss(15 * skillDmgMult, true);
            break;
          case MaskType.DIA:
            player.isShielded = true;
            setGameMessage("Bật Khiên Ông Địa!");
            setTimeout(() => { if(playerRef.current) playerRef.current.isShielded = false; }, 3000);
            break;
        }
      }
    }

    // --- Boss Logic (AI) ---
    if (boss.hp > 0) {
        if (boss.level === 4) {
            if (boss.hp > 200) boss.phase = 1;
            else if (boss.hp > 100) boss.phase = 2;
            else {
                boss.phase = 3;
                // Phase 3: Shoot elemental orbs every 3 seconds
                if (now - boss.lastOrbSpawnTime > 3000) {
                    boss.lastOrbSpawnTime = now;
                    setGameMessage("Mưa Cầu Nguyên Tố!");
                    const orbTypes: ('ORB_FIRE' | 'ORB_THUNDER' | 'ORB_GRASS')[] = ['ORB_FIRE', 'ORB_THUNDER', 'ORB_GRASS'];
                    const orbColors = { 'ORB_FIRE': '#e74c3c', 'ORB_THUNDER': '#f1c40f', 'ORB_GRASS': '#2ecc71' };
                    
                    for (let i = 0; i < 3; i++) {
                         // Aim at player
                         const angle = Math.atan2((player.y + player.h/2) - (boss.y + boss.h/2), (player.x + player.w/2) - (boss.x + boss.w/2));
                         const spread = (i - 1) * 0.3; // Spread angle
                         const speed = 6;
                         
                         projectilesRef.current.push({
                            x: boss.x + boss.w/2, y: boss.y + boss.h/2, w: 25, h: 25,
                            vx: Math.cos(angle + spread) * speed,
                            vy: Math.sin(angle + spread) * speed,
                            color: orbColors[orbTypes[i]],
                            faceRight: false,
                            damage: 10, 
                            isPlayerOwner: false,
                            lifeTime: 4000, 
                            type: orbTypes[i],
                            isOrbiting: false
                        });
                    }
                }
            }
        }

        if (now < boss.stunnedUntil) {
             // Boss Stunned
        } else {
             if (boss.burnTicks > 0 && now > boss.nextBurnTime) {
                boss.hp -= 5;
                boss.burnTicks--;
                boss.nextBurnTime = now + 1000;
                spawnParticles(boss.x + boss.w/2, boss.y + boss.h/2, '#ff4400', 5);
            }

            if (now > boss.dodgeCooldown && boss.shieldHp <= 0) { 
                for (const p of projectilesRef.current) {
                    if (p.isPlayerOwner) {
                        const dist = Math.sqrt(Math.pow(p.x - boss.x, 2) + Math.pow(p.y - boss.y, 2));
                        if (dist < 150) {
                            if (currentLevel !== 3) boss.vy = -12; 
                            else boss.vy = -10; 
                            boss.dodgeCooldown = now + 2000; 
                            spawnParticles(boss.x + boss.w/2, boss.y, '#ccc', 5);
                            break;
                        }
                    }
                }
            }

            if (now - boss.lastSummonTime > 10000) {
                boss.lastSummonTime = now;
                setGameMessage("Boss triệu hồi thuộc hạ!");
                const isFlying = currentLevel === 3 || currentLevel === 2; 
                // Spawn minion sized to player and remember which boss level spawned it
                const player = playerRef.current;
                minionsRef.current.push({
                    x: boss.x + (Math.random() * 100 - 50), y: boss.y - 20, w: player.w, h: player.h,
                    vx: 0, vy: 0, color: currentLevel === 1 ? '#00aa00' : (currentLevel === 2 ? '#e74c3c' : (currentLevel === 3 ? '#ffff00' : '#4a1b4d')),
                    faceRight: false, hp: 5, damage: 1, type: isFlying ? 'FLYING' : 'GROUND', hasUsedSkill: false, bossLevel: currentLevel
                });
            }

            // --- MOVEMENT LOGIC ---
            const distToPlayer = Math.abs((player.x + player.w/2) - (boss.x + boss.w/2));
            const dirToPlayer = player.x > boss.x ? 1 : -1;
            boss.faceRight = dirToPlayer > 0;
            
            let isBossGrounded = false;

            if (currentLevel !== 3) {
                boss.vy += GRAVITY;
                boss.y += boss.vy;
                for (const plat of levelData.platforms) {
                    if (boss.vy > 0 && boss.y + boss.h - boss.vy <= plat.y && boss.y + boss.h >= plat.y && boss.x + boss.w > plat.x && boss.x < plat.x + plat.w) {
                        boss.y = plat.y - boss.h;
                        boss.vy = 0;
                        isBossGrounded = true;
                    }
                }
                
                // Obstacle collision for Boss
                for (const obs of obstaclesRef.current) {
                     if (!obs.active) continue;
                     if (checkCollision(boss, obs)) {
                        // Boss stops at wall
                        boss.x -= boss.vx; 
                     }
                }

                if (boss.y + boss.h > GAME_HEIGHT) { boss.y = GAME_HEIGHT - boss.h; boss.vy = 0; isBossGrounded = true; }
            } else {
                boss.y += (player.y - boss.y - 100) * 0.02; 
            }
            
            // Continuous Chase Logic
            if (boss.state === 'CHASE') {
                 const bossSpeed = (currentLevel === 3) ? 3.5 : 2.5; 
                 boss.vx = dirToPlayer * bossSpeed;
                 
                 // Jump if needed (Ground bosses)
                 if (currentLevel !== 3 && isBossGrounded && player.y < boss.y - 80) {
                     // Jump randomly or if aligned
                     if (Math.random() < 0.05) boss.vy = JUMP_FORCE;
                 }
            } else if (boss.state === 'IDLE') {
                boss.vx = 0;
            }

            boss.x += boss.vx;

            // --- AI DECISION ---
            if (now > boss.attackCooldown) {
                const bossSpeed = (currentLevel === 3) ? 3 : 2; 

                if (boss.state === 'IDLE' || boss.state === 'CHASE') {
                    boss.state = 'CHASE'; // Default to Chase
                    
                    const canUseSkill = now - boss.lastSkillTime > 5000;
                    const useSkill = canUseSkill && Math.random() < 0.05; 
                    
                    if (useSkill) {
                        boss.state = 'SKILL';
                        boss.lastSkillTime = now;
                    } else if (distToPlayer < 80) {
                        boss.vx = 0;
                        boss.state = 'ATTACK';
                        boss.attackCooldown = now + 1000; 
                    } else {
                         // Continue Chasing
                         boss.attackCooldown = now + 200;
                    }
                }

                if (boss.state === 'SKILL') {
                    boss.vx = 0;
                    // Skill Logic...
                    let skillType = currentLevel;
                    if (currentLevel === 4) {
                        const availableSkills = [1];
                        if (boss.phase >= 2) availableSkills.push(2);
                        if (boss.phase >= 3) availableSkills.push(3);
                        skillType = availableSkills[Math.floor(Math.random() * availableSkills.length)];
                    }

                    // Aiming Logic
                    const aimAngle = Math.atan2((player.y + player.h/2) - (boss.y + boss.h/2), (player.x + player.w/2) - (boss.x + boss.w/2));
                    const projSpeed = 8;
                    const vx = Math.cos(aimAngle) * projSpeed;
                    const vy = Math.sin(aimAngle) * projSpeed;

                    if (skillType === 1) { // Vine
                        projectilesRef.current.push({
                            x: boss.faceRight ? boss.x + boss.w : boss.x - 100, y: boss.y + boss.h/2 - 20, w: 100, h: 40,
                            vx: 0, vy: 0, color: '#2ecc71', faceRight: boss.faceRight, damage: 5, isPlayerOwner: false, lifeTime: 300, type: 'VINE'
                        });
                        setGameMessage(`${boss.name}: Quất Dây Gai!`);
                    } else if (skillType === 2) { // Fire
                        // Boss shoots fireball towards player
                        projectilesRef.current.push({
                            x: boss.x + boss.w/2, y: boss.y + boss.h/2, w: 30, h: 30,
                            vx: vx, vy: vy, color: '#e74c3c', faceRight: boss.faceRight, damage: 5, isPlayerOwner: false, lifeTime: 2000, type: 'FIRE'
                        });
                        setGameMessage(`${boss.name}: Phun Cầu Lửa!`);
                    } else if (skillType === 3) { // Thunder
                        projectilesRef.current.push({
                            x: player.x, y: 0, w: 40, h: 600, vx: 0, vy: 20, color: '#f1c40f', faceRight: false, damage: 7, isPlayerOwner: false, lifeTime: 500, type: 'LIGHTNING'
                        });
                        setGameMessage(`${boss.name}: Giáng Sấm Sét!`);
                    } 
                    
                    // Resume Chasing quickly after skill
                    boss.state = 'CHASE';
                    boss.attackCooldown = now + 1500; 
                }
                
                if (boss.state === 'ATTACK') {
                    const bossAttackRect = { x: boss.faceRight ? boss.x + boss.w : boss.x - 60, y: boss.y, w: 60, h: boss.h };
                    if (checkCollision(bossAttackRect, player) && now > player.invulnerableUntil) {
                        if (!player.isShielded) {
                            player.hp -= levelData.bossDmg;
                            player.invulnerableUntil = now + 1000;
                            player.vx = boss.faceRight ? 10 : -10; 
                            player.vy = -5;
                        }
                    }
                    boss.state = 'CHASE'; // Resume chase
                    boss.attackCooldown = now + 1000; 
                }
            }
        }
    } else {
        if (!isLevelEndingRef.current) {
            isLevelEndingRef.current = true;
            setGameMessage(`${levelData.bossName} Đã Bại!`);
            onLevelComplete(currentLevel);
            setTimeout(() => {
                if (currentLevel === 4) {
                    setGameState(GameState.VICTORY);
                } else {
                    setGameState(GameState.LEVEL_TRANSITION);
                }
            }, 1000);
        }
    }

    for (let i = minionsRef.current.length - 1; i >= 0; i--) {
        const m = minionsRef.current[i];
        const mDir = player.x > m.x ? 1 : -1;
        m.vx = mDir * 2;
        if (m.type === 'GROUND') {
            m.vy += GRAVITY;
            m.y += m.vy;
            for (const plat of levelData.platforms) {
                if (m.vy > 0 && m.y + m.h - m.vy <= plat.y && m.y + m.h >= plat.y && m.x + m.w > plat.x && m.x < plat.x + plat.w) {
                    m.y = plat.y - m.h; m.vy = 0;
                }
            }
            if (m.y + m.h > GAME_HEIGHT) { m.y = GAME_HEIGHT - m.h; m.vy = 0; }
        } else { m.y += (player.y - m.y) * 0.02; }
        m.x += m.vx;

        if (!m.hasUsedSkill) {
             let used = false;
            const dist = Math.abs(player.x - m.x);
             if (currentLevel === 1 && dist < 100) { 
                projectilesRef.current.push({ x: player.x > m.x ? m.x + m.w : m.x - 50, y: m.y + 10, w: 50, h: 20, vx: 0, vy: 0, color: '#2ecc71', faceRight: player.x > m.x, damage: 1, isPlayerOwner: false, lifeTime: 300, type: 'VINE' }); used = true;
            } else if (currentLevel === 2 && dist < 300) {
                 projectilesRef.current.push({ x: m.x, y: m.y + 10, w: 15, h: 15, vx: player.x > m.x ? 6 : -6, vy: 0, color: '#e74c3c', faceRight: player.x > m.x, damage: 1, isPlayerOwner: false, lifeTime: 2000, type: 'FIRE' }); used = true;
            } else if (currentLevel === 3 && dist < 300) {
                 projectilesRef.current.push({ x: player.x, y: 0, w: 20, h: 600, vx: 0, vy: 20, color: '#f1c40f', faceRight: false, damage: 1, isPlayerOwner: false, lifeTime: 500, type: 'LIGHTNING' }); used = true;
            } else if (currentLevel === 4 && dist < 150) {
                 projectilesRef.current.push({ x: m.x + (player.x > m.x ? 30 : -30), y: m.y + 10, w: 20, h: 20, vx: player.x > m.x ? 5 : -5, vy: 0, color: '#8e44ad', faceRight: player.x > m.x, damage: 1, isPlayerOwner: false, lifeTime: 1000 }); used = true;
            }
            if (used) { m.hasUsedSkill = true; spawnParticles(m.x, m.y, '#fff', 3); }
        }

        if (checkCollision(m, player) && now > player.invulnerableUntil) {
            if (!player.isShielded) {
                player.hp -= m.damage;
                player.invulnerableUntil = now + 1000;
            } else { minionsRef.current.splice(i, 1); continue; }
        }
        if (m.hp <= 0) minionsRef.current.splice(i, 1);
    }

    for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
        const p = projectilesRef.current[i];
        
        p.x += p.vx;
        p.y += p.vy;
        p.lifeTime -= dt;
        
        // Wall Collision for Player Projectiles
        if (p.isPlayerOwner) {
            for (const obs of obstaclesRef.current) {
                if (obs.active && checkCollision(p, obs)) {
                    if (p.type === 'FIRE') {
                        // Lan Skill breaks wall
                        obs.active = false;
                        spawnParticles(obs.x + obs.w/2, obs.y + obs.h/2, '#888', 10);
                        setGameMessage("Tường đã vỡ!");
                    } else {
                        // Other projectiles destroy on wall
                         spawnParticles(p.x, p.y, p.color, 2);
                    }
                    p.lifeTime = 0; 
                }
            }
        } else {
             // Boss projectiles hitting wall
             for (const obs of obstaclesRef.current) {
                if (obs.active && checkCollision(p, obs)) {
                     p.lifeTime = 0;
                     spawnParticles(p.x, p.y, p.color, 2);
                }
             }
        }

        if (player.mask === MaskType.EN && p.isPlayerOwner && p.color === 'transparent') {
            p.x = player.x - 30; p.y = player.y - 20;
        }

        let hit = false;
        if (p.isPlayerOwner) {
            if (checkCollision(p, boss)) {
                if(p.type !== 'FIRE') { 
                    damageBoss(p.damage, false); 
                    hit = true;
                }
            }
            for (const m of minionsRef.current) {
                if (checkCollision(p, m)) { m.hp -= p.damage; hit = true; }
            }
        } else {
            if (checkCollision(p, player) && now > player.invulnerableUntil) {
                 if (!player.isShielded) {
                    // Check Immunity Level 2 for LAN
                    if (currentLevel === 2 && player.mask === MaskType.LAN && (p.type === 'FIRE' || p.type === 'ORB_FIRE')) {
                        player.hp -= p.damage; // Raw damage only
                        player.invulnerableUntil = now + 1000;
                        setGameMessage("Đầu Lân kháng lửa đốt!");
                    } else {
                        player.hp -= p.damage;
                        player.invulnerableUntil = now + 1000;
                        
                        if (p.type === 'FIRE' || p.type === 'ORB_FIRE') {
                            player.burnTicks = 3; player.nextBurnTime = now + 1000; setGameMessage("Bị cháy!");
                        } else if (p.type === 'LIGHTNING' || p.type === 'ORB_THUNDER') {
                            player.stunnedUntil = now + 2000; setGameMessage("Bị choáng!");
                        }
                    }
                } else {
                    spawnParticles(player.x, player.y, '#ddaa44', 3);
                }
                
                if (!p.isOrbiting) {
                   hit = true;
                }
            }
        }

        if (hit || p.lifeTime <= 0 || (p.x < -100 || p.x > GAME_WIDTH + 100)) {
            projectilesRef.current.splice(i, 1);
        }
    }

    if (player.hp <= 0) setGameState(GameState.GAME_OVER);

    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx; p.y += p.vy; p.life -= 0.05;
        if (p.life <= 0) particlesRef.current.splice(i, 1);
    }

    setPlayerStats({ hp: player.hp, maxHp: player.maxHp, mana: player.mana, mask: player.mask });
    setBossStats({ hp: boss.hp, maxHp: boss.maxHp, name: boss.name });

  }, [currentLevel, gameState]); 

  const drawMocTinhSprite = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, faceRight: boolean) => {
    ctx.save();
    
    // Calculate center for flipping logic
    const cx = x + w / 2;
    if (!faceRight) {
        ctx.translate(cx, y);
        ctx.scale(-1, 1);
        ctx.translate(-cx, -y);
    }

    // Palette based on the provided image
    const barkDark = '#2c1e18'; 
    const barkLight = '#4a3b32';
    const leafDark = '#1a2e1a'; 
    const leafLight = '#2d5a27';
    const eyeColor = '#ff0000';

    // 1. ROOTS & TRUNK (Base)
    ctx.fillStyle = barkDark;
    ctx.beginPath();
    // Start bottom left root
    ctx.moveTo(x - 20, y + h); 
    ctx.quadraticCurveTo(x + w * 0.2, y + h - 10, x + w * 0.3, y + h * 0.7); // Root up to trunk
    ctx.lineTo(x + w * 0.3, y + h * 0.4); // Left side of trunk
    // Top of trunk (connection to canopy)
    ctx.lineTo(x + w * 0.7, y + h * 0.4); 
    // Right side down
    ctx.lineTo(x + w * 0.7, y + h * 0.7);
    ctx.quadraticCurveTo(x + w * 0.8, y + h - 10, x + w + 20, y + h); // Right root
    // Close bottom
    ctx.lineTo(x - 20, y + h);
    ctx.fill();

    // Trunk Texture (Highlights)
    ctx.fillStyle = barkLight;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.35, y + h);
    ctx.lineTo(x + w * 0.4, y + h * 0.5);
    ctx.lineTo(x + w * 0.45, y + h);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x + w * 0.65, y + h);
    ctx.lineTo(x + w * 0.6, y + h * 0.5);
    ctx.lineTo(x + w * 0.55, y + h);
    ctx.fill();

    // 2. ARMS (Twisted Branches)
    ctx.strokeStyle = barkDark;
    ctx.lineWidth = 12;
    ctx.lineCap = 'round';
    
    // Left Arm
    ctx.beginPath();
    ctx.moveTo(x + w * 0.3, y + h * 0.5);
    ctx.bezierCurveTo(x, y + h * 0.5, x - 20, y + h * 0.3, x - 40, y + h * 0.6); 
    ctx.stroke();
    // Claws Left
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x - 40, y + h * 0.6);
    ctx.lineTo(x - 50, y + h * 0.7);
    ctx.moveTo(x - 40, y + h * 0.6);
    ctx.lineTo(x - 30, y + h * 0.7);
    ctx.stroke();

    // Right Arm
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.7, y + h * 0.5);
    ctx.bezierCurveTo(x + w, y + h * 0.5, x + w + 20, y + h * 0.3, x + w + 40, y + h * 0.6);
    ctx.stroke();
    // Claws Right
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(x + w + 40, y + h * 0.6);
    ctx.lineTo(x + w + 50, y + h * 0.7);
    ctx.moveTo(x + w + 40, y + h * 0.6);
    ctx.lineTo(x + w + 30, y + h * 0.7);
    ctx.stroke();

    // 3. CANOPY (Leaves)
    // Draw a big leafy shape on top
    ctx.fillStyle = leafDark;
    ctx.beginPath();
    ctx.ellipse(cx, y + h * 0.2, w * 0.8, h * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Lighter leaves on top
    ctx.fillStyle = leafLight;
    ctx.beginPath();
    ctx.ellipse(cx, y + h * 0.15, w * 0.7, h * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Hanging Vines
    ctx.strokeStyle = '#3a5f0b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.3);
    ctx.quadraticCurveTo(x + 10, y + h * 0.5, x, y + h * 0.7);
    ctx.moveTo(x + w, y + h * 0.3);
    ctx.quadraticCurveTo(x + w - 10, y + h * 0.5, x + w, y + h * 0.7);
    ctx.stroke();

    // 4. FACE
    // Eyes (Glowing Red)
    ctx.fillStyle = eyeColor;
    ctx.shadowColor = eyeColor;
    ctx.shadowBlur = 15;
    // Left Eye
    ctx.beginPath();
    ctx.moveTo(cx - 15, y + h * 0.5);
    ctx.lineTo(cx - 5, y + h * 0.55);
    ctx.lineTo(cx - 20, y + h * 0.55);
    ctx.fill();
    // Right Eye
    ctx.beginPath();
    ctx.moveTo(cx + 15, y + h * 0.5);
    ctx.lineTo(cx + 5, y + h * 0.55);
    ctx.lineTo(cx + 20, y + h * 0.55);
    ctx.fill();
    ctx.shadowBlur = 0; // Reset shadow

    // Mouth (Jagged)
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.moveTo(cx - 15, y + h * 0.65);
    // Top teeth
    ctx.lineTo(cx - 10, y + h * 0.7);
    ctx.lineTo(cx - 5, y + h * 0.65);
    ctx.lineTo(cx, y + h * 0.7);
    ctx.lineTo(cx + 5, y + h * 0.65);
    ctx.lineTo(cx + 10, y + h * 0.7);
    ctx.lineTo(cx + 15, y + h * 0.65);
    // Bottom lip
    ctx.quadraticCurveTo(cx, y + h * 0.75, cx - 15, y + h * 0.65);
    ctx.fill();

    ctx.restore();
  }, []);

  const drawHoaThanSprite = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, faceRight: boolean) => {
    ctx.save();
    const cx = x + w / 2;
    // Flip logic
    if (!faceRight) {
        ctx.translate(cx, y);
        ctx.scale(-1, 1);
        ctx.translate(-cx, -y);
    }

    // Colors
    const bodyDark = '#2a0a0a'; // Dark skin/armor
    const bodyLight = '#6e1a1a'; // Muscles
    const lavaGlow = '#ff5500'; // Veins
    const fireOuter = '#ff0000';
    const fireInner = '#ffcc00';

    // 1. Lower Body (Fire Vortex)
    const gradient = ctx.createLinearGradient(cx, y + h * 0.5, cx, y + h);
    gradient.addColorStop(0, bodyDark);
    gradient.addColorStop(0.5, '#d32f2f');
    gradient.addColorStop(1, fireInner);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.3, y + h * 0.5); // Waist left
    ctx.quadraticCurveTo(cx - w * 0.4, y + h * 0.8, cx, y + h); // Bottom tip
    ctx.quadraticCurveTo(cx + w * 0.4, y + h * 0.8, cx + w * 0.3, y + h * 0.5); // Waist right
    ctx.fill();
    
    // Vortex swirls
    ctx.strokeStyle = fireInner;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 10, y + h * 0.7);
    ctx.quadraticCurveTo(cx, y + h * 0.8, cx + 10, y + h * 0.65);
    ctx.stroke();

    // 2. Torso
    ctx.fillStyle = bodyDark;
    // V-taper shape
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.4, y + h * 0.2); // Shoulder L
    ctx.lineTo(cx + w * 0.4, y + h * 0.2); // Shoulder R
    ctx.lineTo(cx + w * 0.25, y + h * 0.5); // Hip R
    ctx.lineTo(cx - w * 0.25, y + h * 0.5); // Hip L
    ctx.fill();

    // Muscle Highlights (Abs/Pecs) - glowing lava style
    ctx.fillStyle = lavaGlow;
    // Pecs
    ctx.fillRect(cx - 15, y + h * 0.25, 12, 10);
    ctx.fillRect(cx + 3, y + h * 0.25, 12, 10);
    // Abs
    ctx.fillRect(cx - 10, y + h * 0.35, 8, 6);
    ctx.fillRect(cx + 2, y + h * 0.35, 8, 6);
    ctx.fillRect(cx - 8, y + h * 0.42, 6, 5);
    ctx.fillRect(cx + 2, y + h * 0.42, 6, 5);

    // 3. Arms (4 Arms)
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Back Arms (Darker)
    ctx.strokeStyle = '#1a0505';
    ctx.lineWidth = 8;
    // Upper Left (raised)
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.3, y + h * 0.25);
    ctx.lineTo(cx - w * 0.5, y + h * 0.1); 
    ctx.stroke();
    // Upper Right (raised)
    ctx.beginPath();
    ctx.moveTo(cx + w * 0.3, y + h * 0.25);
    ctx.lineTo(cx + w * 0.5, y + h * 0.1);
    ctx.stroke();

    // Front Arms (Main Color)
    ctx.strokeStyle = bodyLight;
    ctx.lineWidth = 10;
    // Lower Left (holding whip/down)
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.35, y + h * 0.25);
    ctx.lineTo(cx - w * 0.5, y + h * 0.4);
    ctx.stroke();
    // Lower Right (holding sword/forward)
    ctx.beginPath();
    ctx.moveTo(cx + w * 0.35, y + h * 0.25);
    ctx.lineTo(cx + w * 0.6, y + h * 0.4);
    ctx.stroke();

    // 4. Weapons
    // Flaming Sword (Right Hand)
    ctx.save();
    ctx.translate(cx + w * 0.6, y + h * 0.4);
    ctx.rotate(-Math.PI / 4);
    // Hilt
    ctx.fillStyle = '#333';
    ctx.fillRect(-5, -5, 10, 15);
    ctx.fillRect(-10, -5, 20, 5); // Guard
    // Blade
    const bladeGrad = ctx.createLinearGradient(0, -5, 0, -60);
    bladeGrad.addColorStop(0, '#ff4500'); // Red-Orange
    bladeGrad.addColorStop(0.5, '#ffcc00'); // Yellow
    bladeGrad.addColorStop(1, '#ffffff'); // White hot tip
    ctx.fillStyle = bladeGrad;
    ctx.beginPath();
    ctx.moveTo(-8, -5);
    ctx.lineTo(8, -5);
    ctx.lineTo(0, -60); // Tip
    ctx.fill();
    // Fire around blade
    ctx.strokeStyle = fireOuter;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, -5);
    ctx.quadraticCurveTo(-15, -30, 0, -65);
    ctx.quadraticCurveTo(15, -30, 8, -5);
    ctx.stroke();
    ctx.restore();

    // Fire Whip (Left Hand) - simplified as a curve
    ctx.strokeStyle = fireInner;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 10;
    ctx.shadowColor = fireOuter;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.5, y + h * 0.4);
    ctx.bezierCurveTo(cx - w * 0.7, y + h * 0.6, cx - w * 0.3, y + h * 0.8, cx - w * 0.8, y + h * 0.9);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 5. Head
    // Neck
    ctx.fillStyle = bodyDark;
    ctx.fillRect(cx - 8, y + h * 0.15, 16, 10);
    
    // Skull Shape
    ctx.fillStyle = '#b35d36'; // Bone-ish color tinted red/orange
    ctx.beginPath();
    ctx.arc(cx, y + h * 0.12, 15, 0, Math.PI * 2);
    ctx.fill();

    // Horns
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.moveTo(cx - 10, y + h * 0.08);
    ctx.quadraticCurveTo(cx - 25, y, cx - 15, y - 10); // Left Horn
    ctx.lineTo(cx - 10, y + h * 0.05);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 10, y + h * 0.08);
    ctx.quadraticCurveTo(cx + 25, y, cx + 15, y - 10); // Right Horn
    ctx.lineTo(cx + 10, y + h * 0.05);
    ctx.fill();

    // Face Details
    ctx.fillStyle = fireInner; // Glowing eyes/mouth
    // Eyes
    ctx.beginPath();
    ctx.moveTo(cx - 8, y + h * 0.11);
    ctx.lineTo(cx - 2, y + h * 0.13);
    ctx.lineTo(cx - 8, y + h * 0.13);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 8, y + h * 0.11);
    ctx.lineTo(cx + 2, y + h * 0.13);
    ctx.lineTo(cx + 8, y + h * 0.13);
    ctx.fill();
    // Grinning Teeth
    ctx.fillStyle = '#fff';
    ctx.fillRect(cx - 6, y + h * 0.16, 12, 3);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, y + h * 0.16);
    ctx.lineTo(cx, y + h * 0.16 + 3);
    ctx.stroke();

    // 6. Fire Mane / Aura
    // Draw spiky flames behind head/shoulders
    ctx.fillStyle = 'rgba(255, 69, 0, 0.6)';
    ctx.beginPath();
    // Left flames
    ctx.moveTo(cx - 20, y + h * 0.2);
    ctx.lineTo(cx - 35, y + h * 0.1);
    ctx.lineTo(cx - 25, y + h * 0.05);
    ctx.lineTo(cx - 40, y - 10);
    ctx.lineTo(cx, y);
    // Right flames
    ctx.lineTo(cx + 40, y - 10);
    ctx.lineTo(cx + 25, y + h * 0.05);
    ctx.lineTo(cx + 35, y + h * 0.1);
    ctx.lineTo(cx + 20, y + h * 0.2);
    ctx.fill();

    ctx.restore();
  }, []);

  const drawLoiDieuSprite = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, faceRight: boolean) => {
    ctx.save();
    const cx = x + w / 2;
    
    // Flip if facing right (assuming default is left or front)
    if (faceRight) {
        ctx.translate(cx, y);
        ctx.scale(-1, 1);
        ctx.translate(-cx, -y);
    }

    const featherBase = '#1a1a2e';
    const featherMid = '#30336b';
    const featherHighlight = '#8e44ad'; // Purple
    const lightningColor = '#00d2ff';
    const beakColor = '#dcdde1';

    // 1. Wings (Spread out)
    const drawWing = (isLeft: boolean) => {
        const dir = isLeft ? -1 : 1;
        
        // Base Wing Shape
        ctx.fillStyle = featherBase;
        ctx.beginPath();
        ctx.moveTo(cx + (10 * dir), y + h * 0.4);
        // Top edge arching up
        ctx.quadraticCurveTo(cx + (w * 0.4 * dir), y, cx + (w * 0.5 * dir), y + h * 0.3);
        // Bottom edge (feathers)
        ctx.lineTo(cx + (w * 0.45 * dir), y + h * 0.6);
        ctx.lineTo(cx + (w * 0.35 * dir), y + h * 0.5); // Jagged
        ctx.lineTo(cx + (w * 0.25 * dir), y + h * 0.7);
        ctx.lineTo(cx + (10 * dir), y + h * 0.5);
        ctx.fill();

        // Inner feathers (Purple/Blue layers)
        ctx.fillStyle = featherMid;
        ctx.beginPath();
        ctx.moveTo(cx + (10 * dir), y + h * 0.45);
        ctx.quadraticCurveTo(cx + (w * 0.3 * dir), y + h * 0.2, cx + (w * 0.35 * dir), y + h * 0.4);
        ctx.lineTo(cx + (10 * dir), y + h * 0.55);
        ctx.fill();
        
        // Purple accents
        ctx.fillStyle = featherHighlight;
        ctx.beginPath();
        ctx.moveTo(cx + (15 * dir), y + h * 0.42);
        ctx.lineTo(cx + (w * 0.25 * dir), y + h * 0.35);
        ctx.lineTo(cx + (w * 0.2 * dir), y + h * 0.5);
        ctx.fill();
    };

    drawWing(true); // Left
    drawWing(false); // Right

    // 2. Tail
    ctx.fillStyle = featherBase;
    ctx.beginPath();
    ctx.moveTo(cx, y + h * 0.6);
    ctx.lineTo(cx - 15, y + h * 0.9);
    ctx.lineTo(cx, y + h); // Tip
    ctx.lineTo(cx + 15, y + h * 0.9);
    ctx.fill();
    // Tail highlight
    ctx.fillStyle = featherHighlight;
    ctx.beginPath();
    ctx.moveTo(cx, y + h * 0.7);
    ctx.lineTo(cx - 5, y + h * 0.85);
    ctx.lineTo(cx, y + h * 0.95);
    ctx.lineTo(cx + 5, y + h * 0.85);
    ctx.fill();

    // 3. Body/Chest
    ctx.fillStyle = featherMid;
    ctx.beginPath();
    ctx.ellipse(cx, y + h * 0.5, 20, 25, 0, 0, Math.PI * 2);
    ctx.fill();
    // Chest pattern (V shape)
    ctx.fillStyle = featherBase;
    ctx.beginPath();
    ctx.moveTo(cx - 10, y + h * 0.45);
    ctx.lineTo(cx, y + h * 0.6);
    ctx.lineTo(cx + 10, y + h * 0.45);
    ctx.fill();

    // 4. Talons
    ctx.fillStyle = '#111';
    // Left Talon
    ctx.beginPath();
    ctx.moveTo(cx - 10, y + h * 0.7);
    ctx.lineTo(cx - 20, y + h * 0.8);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#333';
    ctx.stroke();
    // Right Talon
    ctx.beginPath();
    ctx.moveTo(cx + 10, y + h * 0.7);
    ctx.lineTo(cx + 20, y + h * 0.8);
    ctx.stroke();


    // 5. Head
    // Neck ruff
    ctx.fillStyle = featherHighlight;
    ctx.beginPath();
    ctx.moveTo(cx - 15, y + h * 0.35);
    ctx.lineTo(cx, y + h * 0.45);
    ctx.lineTo(cx + 15, y + h * 0.35);
    ctx.lineTo(cx, y + h * 0.25);
    ctx.fill();

    // Head shape
    ctx.fillStyle = featherBase;
    ctx.beginPath();
    ctx.arc(cx, y + h * 0.25, 15, 0, Math.PI * 2);
    ctx.fill();

    // Spiky Crest
    ctx.fillStyle = featherMid;
    ctx.beginPath();
    ctx.moveTo(cx - 10, y + h * 0.2);
    ctx.lineTo(cx - 15, y + h * 0.1);
    ctx.lineTo(cx - 5, y + h * 0.15);
    ctx.lineTo(cx, y + h * 0.05);
    ctx.lineTo(cx + 5, y + h * 0.15);
    ctx.lineTo(cx + 15, y + h * 0.1);
    ctx.lineTo(cx + 10, y + h * 0.2);
    ctx.fill();

    // Beak
    ctx.fillStyle = beakColor;
    ctx.beginPath();
    ctx.moveTo(cx, y + h * 0.25);
    ctx.quadraticCurveTo(cx + 15, y + h * 0.3, cx + 5, y + h * 0.4); // Hook down
    ctx.lineTo(cx, y + h * 0.35);
    ctx.fill();

    // Eyes (Glowing)
    ctx.fillStyle = lightningColor;
    ctx.shadowColor = lightningColor;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    // Eye is usually on the side if profile, or two eyes if front. Let's do angled profile look (facing slightly forward/right)
    // Actually simpler to do 2 fierce eyes
    ctx.moveTo(cx - 5, y + h * 0.22);
    ctx.lineTo(cx - 10, y + h * 0.2);
    ctx.lineTo(cx - 8, y + h * 0.25);
    ctx.fill();
    
    ctx.moveTo(cx + 5, y + h * 0.22);
    ctx.lineTo(cx + 10, y + h * 0.2);
    ctx.lineTo(cx + 8, y + h * 0.25);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 6. Lightning Aura (Random crackles)
    ctx.strokeStyle = lightningColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = lightningColor;
    ctx.shadowBlur = 5;
    
    const time = Date.now();
    if (Math.floor(time / 100) % 2 === 0) {
        // Draw some random bolts
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.4, y + h * 0.2);
        ctx.lineTo(cx - w * 0.5, y + h * 0.4);
        ctx.lineTo(cx - w * 0.35, y + h * 0.5);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(cx + w * 0.4, y + h * 0.2);
        ctx.lineTo(cx + w * 0.5, y + h * 0.4);
        ctx.lineTo(cx + w * 0.35, y + h * 0.5);
        ctx.stroke();
    }
    ctx.shadowBlur = 0;

    ctx.restore();
  }, []);

  const drawNienThuSprite = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, faceRight: boolean) => {
    ctx.save();
    const cx = x + w / 2;

    if (!faceRight) {
        ctx.translate(cx, y);
        ctx.scale(-1, 1);
        ctx.translate(-cx, -y);
    }

    const furDark = '#4a0e0e';
    const furRed = '#b71c1c';
    const furGold = '#f39c12';
    const skin = '#c0392b';
    const eyeGlow = '#ff0000'; // or yellow
    const hornColor = '#dcdde1';

    // 1. Back Legs
    ctx.fillStyle = furDark;
    // Back Left
    ctx.beginPath();
    ctx.moveTo(x + 20, y + h - 10);
    ctx.lineTo(x + 10, y + h);
    ctx.lineTo(x + 40, y + h);
    ctx.lineTo(x + 50, y + h - 40);
    ctx.fill();
    // Front Left
    ctx.beginPath();
    ctx.moveTo(x + w - 40, y + h - 10);
    ctx.lineTo(x + w - 50, y + h);
    ctx.lineTo(x + w - 20, y + h);
    ctx.lineTo(x + w - 30, y + h - 40);
    ctx.fill();

    // 2. Body
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(cx, y + h * 0.6, w * 0.4, h * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    // Fur texture on back
    ctx.fillStyle = furRed;
    ctx.beginPath();
    ctx.ellipse(cx, y + h * 0.55, w * 0.38, h * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // 3. Tail
    ctx.strokeStyle = furRed;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x + 20, y + h * 0.6);
    ctx.bezierCurveTo(x - 20, y + h * 0.5, x - 20, y + h * 0.2, x + 10, y + h * 0.1);
    ctx.stroke();
    // Tail Tuft
    ctx.fillStyle = furGold;
    ctx.beginPath();
    ctx.arc(x + 10, y + h * 0.1, 10, 0, Math.PI * 2);
    ctx.fill();

    // 4. Front Legs (Foreground)
    ctx.fillStyle = skin;
    // Back Right
    ctx.beginPath();
    ctx.moveTo(x + 30, y + h * 0.6);
    ctx.quadraticCurveTo(x + 10, y + h * 0.8, x + 30, y + h);
    ctx.lineTo(x + 50, y + h);
    ctx.lineTo(x + 60, y + h * 0.6);
    ctx.fill();
    // Front Right
    ctx.beginPath();
    ctx.moveTo(x + w - 50, y + h * 0.6);
    ctx.quadraticCurveTo(x + w - 70, y + h * 0.8, x + w - 50, y + h);
    ctx.lineTo(x + w - 30, y + h);
    ctx.lineTo(x + w - 20, y + h * 0.6);
    ctx.fill();

    // Claws
    ctx.fillStyle = '#111';
    const drawClaw = (lx: number, ly: number) => {
        ctx.beginPath();
        ctx.moveTo(lx, ly); ctx.lineTo(lx+5, ly); ctx.lineTo(lx+2, ly+5); ctx.fill();
    };
    drawClaw(x + 30, y+h); drawClaw(x + 38, y+h); drawClaw(x + 46, y+h);
    drawClaw(x + w - 50, y+h); drawClaw(x + w - 42, y+h); drawClaw(x + w - 34, y+h);


    // 5. Head & Mane
    // Mane Base
    ctx.fillStyle = furDark;
    ctx.beginPath();
    ctx.arc(x + w * 0.8, y + h * 0.4, h * 0.35, 0, Math.PI * 2);
    ctx.fill();
    
    // Head Face
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(x + w * 0.85, y + h * 0.45, h * 0.2, h * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mane Highlights (Gold/Red)
    ctx.fillStyle = furRed;
    for(let i=0; i<8; i++) {
        ctx.beginPath();
        const angle = (i / 8) * Math.PI * 1.5 + Math.PI; // Fan around left/top
        const mx = x + w * 0.8 + Math.cos(angle) * h * 0.35;
        const my = y + h * 0.4 + Math.sin(angle) * h * 0.35;
        ctx.moveTo(x + w * 0.8, y + h * 0.4);
        ctx.lineTo(mx, my);
        ctx.lineTo(mx + 10, my + 10);
        ctx.fill();
    }

    // Horns
    ctx.fillStyle = hornColor;
    ctx.beginPath();
    // Top Horn
    ctx.moveTo(x + w * 0.85, y + h * 0.3);
    ctx.quadraticCurveTo(x + w * 0.8, y, x + w * 0.95, y + h * 0.1);
    ctx.lineTo(x + w * 0.9, y + h * 0.3);
    ctx.fill();

    // Eyes
    ctx.fillStyle = eyeGlow;
    ctx.shadowColor = eyeGlow;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.82, y + h * 0.42);
    ctx.lineTo(x + w * 0.9, y + h * 0.45);
    ctx.lineTo(x + w * 0.82, y + h * 0.48);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Mouth / Teeth
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.85, y + h * 0.55);
    ctx.lineTo(x + w * 0.88, y + h * 0.6); // Fang
    ctx.lineTo(x + w * 0.91, y + h * 0.55);
    ctx.fill();

    // Nose
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(x + w * 0.95, y + h * 0.45, 5, 0, Math.PI*2);
    ctx.fill();

    // 6. Decorations (Firecrackers / Ribbons)
    ctx.strokeStyle = furGold;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.7, y + h * 0.3);
    ctx.bezierCurveTo(x + w * 0.6, y + h * 0.5, x + w * 0.7, y + h * 0.8, x + w * 0.6, y + h * 0.9);
    ctx.stroke();

    // Firecrackers
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(x + w * 0.6, y + h * 0.6, 8, 15);
    ctx.fillRect(x + w * 0.62, y + h * 0.7, 8, 15);

    ctx.restore();
}, []);

  const drawTeuSprite = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, faceRight: boolean) => {
    // Flip context if facing left
    ctx.save();
    if (!faceRight) {
        ctx.translate(x + w, y);
        ctx.scale(-1, 1);
        x = 0; // Relative to translate
        y = 0; // Y stays same relative to translate logic, but we need to adjust
    } else {
        ctx.translate(x, y);
        x = 0;
        y = 0;
    }

    // Colors
    const skinColor = '#ffffff'; // White mask
    const redColor = '#d32f2f'; // Shirt/Details
    const yellowColor = '#fbc02d'; // Trim
    const blackColor = '#212121'; // Pants/Eyes

    // --- LEGS/PANTS ---
    ctx.fillStyle = blackColor;
    ctx.fillRect(x + 10, y + h - 15, 8, 15); // Left leg
    ctx.fillRect(x + w - 18, y + h - 15, 8, 15); // Right leg

    // --- BODY (SHIRT) ---
    ctx.fillStyle = redColor;
    // Main torso
    ctx.fillRect(x + 5, y + 25, w - 10, 25);
    // Sleeves
    ctx.fillRect(x, y + 25, 8, 20); // Left sleeve
    ctx.fillRect(x + w - 8, y + 25, 8, 20); // Right sleeve
    // Yellow Trim (Cuffs)
    ctx.fillStyle = yellowColor;
    ctx.fillRect(x, y + 40, 8, 5);
    ctx.fillRect(x + w - 8, y + 40, 8, 5);
    // Yellow Sash (Cross body)
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 50);
    ctx.lineTo(x + w - 5, y + 25);
    ctx.lineTo(x + w - 5, y + 30);
    ctx.lineTo(x + 5, y + 55); // Adjust for diagonal
    ctx.fill();
    // Neck trim
    ctx.fillRect(x + 12, y + 25, 16, 5);

    // --- HEAD (MASK) ---
    // Face shape
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.ellipse(x + w/2, y + 15, 14, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Hat (Top knot)
    ctx.fillStyle = redColor;
    ctx.beginPath();
    ctx.arc(x + w/2, y, 6, 0, Math.PI, true); // Top of head
    ctx.fill();
    ctx.fillRect(x + w/2 - 2, y - 4, 4, 4); // Knot
    ctx.fillStyle = yellowColor;
    ctx.fillRect(x + w/2 - 1, y - 3, 2, 2); // Knot detail

    // Eyes (Happy arcs)
    ctx.strokeStyle = blackColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + w/2 - 6, y + 12, 3, Math.PI, 0); // Left Eye
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x + w/2 + 6, y + 12, 3, Math.PI, 0); // Right Eye
    ctx.stroke();

    // Cheeks
    ctx.fillStyle = '#ff8a80'; // Pinkish red
    ctx.beginPath();
    ctx.arc(x + w/2 - 9, y + 18, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + w/2 + 9, y + 18, 3, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.fillStyle = redColor;
    ctx.beginPath();
    ctx.arc(x + w/2, y + 20, 5, 0, Math.PI, false);
    ctx.fill();

    ctx.restore();
  }, []);

  const drawLanSprite = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, faceRight: boolean) => {
    // Flip context if facing left
    ctx.save();
    if (!faceRight) {
        ctx.translate(x + w, y);
        ctx.scale(-1, 1);
        x = 0; // Relative to translate
        y = 0; // Y stays same relative to translate logic, but we need to adjust
    } else {
        ctx.translate(x, y);
        x = 0;
        y = 0;
    }

    // Colors
    const redColor = '#d32f2f'; // Main Red
    const brightRed = '#ff5252'; // Mask Red
    const yellowColor = '#fbc02d'; // Gold/Yellow
    const whiteColor = '#ffffff'; // Fur/Eyes
    const blackColor = '#212121'; // Pants/Details

    // --- LEGS/PANTS ---
    ctx.fillStyle = blackColor;
    ctx.fillRect(x + 10, y + h - 15, 8, 15); // Left leg
    ctx.fillRect(x + w - 18, y + h - 15, 8, 15); // Right leg

    // --- BODY (SHIRT) ---
    ctx.fillStyle = redColor;
    ctx.fillRect(x + 5, y + 25, w - 10, 25); // Main torso
    
    // Sash/Trim
    ctx.fillStyle = yellowColor;
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 25);
    ctx.lineTo(x + w - 5, y + 45);
    ctx.lineTo(x + w - 5, y + 50);
    ctx.lineTo(x + 5, y + 30);
    ctx.fill();
    
    // Sleeves
    ctx.fillStyle = redColor;
    ctx.fillRect(x, y + 25, 8, 18); 
    ctx.fillRect(x + w - 8, y + 25, 8, 18);
    // Yellow Cuffs
    ctx.fillStyle = yellowColor;
    ctx.fillRect(x, y + 38, 8, 5);
    ctx.fillRect(x + w - 8, y + 38, 8, 5);


    // --- HEAD (LION MASK) ---
    // The mask is larger than the head usually.
    const headX = x + w/2;
    const headY = y + 15;
    const headRadius = 18;

    // White Fur mane (Back/Outline)
    ctx.fillStyle = whiteColor;
    ctx.beginPath();
    ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
    ctx.fill();

    // Red Face Base
    ctx.fillStyle = brightRed;
    ctx.beginPath();
    ctx.arc(headX, headY, headRadius - 4, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    // Left Eye
    ctx.fillStyle = whiteColor; // Sclera
    ctx.beginPath();
    ctx.arc(headX - 6, headY - 2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = blackColor; // Pupil
    ctx.beginPath();
    ctx.arc(headX - 6, headY - 2, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Right Eye
    ctx.fillStyle = whiteColor;
    ctx.beginPath();
    ctx.arc(headX + 6, headY - 2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = blackColor;
    ctx.beginPath();
    ctx.arc(headX + 6, headY - 2, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Yellow Eyebrows/Rim
    ctx.strokeStyle = yellowColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(headX - 6, headY - 2, 5, Math.PI, 0); 
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(headX + 6, headY - 2, 5, Math.PI, 0); 
    ctx.stroke();

    // Nose/Forehead decoration
    ctx.fillStyle = yellowColor;
    ctx.fillRect(headX - 3, headY - 10, 6, 6);
    ctx.fillStyle = blackColor;
    ctx.fillRect(headX - 1, headY - 8, 2, 2); // Center dot

    // Mouth (Wide open)
    ctx.fillStyle = blackColor;
    ctx.beginPath();
    ctx.ellipse(headX, headY + 8, 8, 5, 0, 0, Math.PI, false); // Bottom half arc
    ctx.fill();
    
    // Teeth
    ctx.fillStyle = whiteColor;
    ctx.fillRect(headX - 5, headY + 8, 2, 3);
    ctx.fillRect(headX - 1, headY + 8, 2, 3);
    ctx.fillRect(headX + 3, headY + 8, 2, 3);

    // Horn (Top center)
    ctx.fillStyle = yellowColor;
    ctx.beginPath();
    ctx.moveTo(headX - 3, headY - 14);
    ctx.lineTo(headX + 3, headY - 14);
    ctx.lineTo(headX, headY - 22);
    ctx.fill();
    
    // Ears/Side Fur
    ctx.fillStyle = whiteColor;
    ctx.beginPath();
    ctx.arc(headX - 16, headY - 5, 5, 0, Math.PI * 2); // Left ear
    ctx.fill();
    ctx.beginPath();
    ctx.arc(headX + 16, headY - 5, 5, 0, Math.PI * 2); // Right ear
    ctx.fill();

    ctx.restore();
  }, []);

  const drawEnSprite = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, faceRight: boolean) => {
    // Flip context if facing left
    ctx.save();
    if (!faceRight) {
        ctx.translate(x + w, y);
        ctx.scale(-1, 1);
        x = 0; // Relative to translate
        y = 0; // Y stays same relative to translate logic, but we need to adjust
    } else {
        ctx.translate(x, y);
        x = 0;
        y = 0;
    }

    // Colors
    const deepRed = '#8e0000'; // Mask base
    const brightRed = '#d32f2f'; // Shirt
    const yellow = '#fbc02d';
    const white = '#ffffff';
    const black = '#212121';
    const grey = '#424242';

    // Pants (Dark Grey)
    ctx.fillStyle = grey; 
    ctx.fillRect(x + 10, y + h - 15, 8, 15);
    ctx.fillRect(x + w - 18, y + h - 15, 8, 15);
    // Shoes
    ctx.fillStyle = black;
    ctx.fillRect(x + 8, y + h - 5, 12, 5);
    ctx.fillRect(x + w - 20, y + h - 5, 12, 5);

    // Body (Red Tunic)
    ctx.fillStyle = brightRed;
    ctx.fillRect(x + 5, y + 25, w - 10, 25);
    
    // Sash (Yellow)
    ctx.fillStyle = yellow;
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 50); // Bottom Left
    ctx.lineTo(x + w - 5, y + 25); // Top Right
    ctx.lineTo(x + w - 5, y + 30);
    ctx.lineTo(x + 5, y + 55); 
    ctx.fill();

    // Sleeves
    ctx.fillStyle = brightRed;
    ctx.fillRect(x - 2, y + 25, 10, 18); // Left
    ctx.fillRect(x + w - 8, y + 25, 10, 18); // Right
    // Gold Cuffs
    ctx.fillStyle = yellow;
    ctx.fillRect(x - 2, y + 38, 10, 5);
    ctx.fillRect(x + w - 8, y + 38, 10, 5);

    // --- HEAD (Bird Mask) ---
    const headX = x + w/2;
    const headY = y + 15;
    
    // Mask Base (Spiky feathers)
    ctx.fillStyle = deepRed;
    
    // Draw spikes around head
    // Top spikes
    ctx.beginPath();
    // Center top
    ctx.moveTo(headX, headY - 20); 
    ctx.lineTo(headX + 5, headY - 10);
    ctx.lineTo(headX - 5, headY - 10);
    ctx.fill();

    // Side spikes/feathers fan
    for(let i = 0; i < 5; i++) {
        // Left side
        ctx.beginPath();
        ctx.moveTo(headX - 5 - (i*3), headY - 10 + (i*4));
        ctx.lineTo(headX - 15 - (i*2), headY - 15 + (i*4));
        ctx.lineTo(headX - 5 - (i*3), headY - 5 + (i*4));
        ctx.fill();

        // Right side
        ctx.beginPath();
        ctx.moveTo(headX + 5 + (i*3), headY - 10 + (i*4));
        ctx.lineTo(headX + 15 + (i*2), headY - 15 + (i*4));
        ctx.lineTo(headX + 5 + (i*3), headY - 5 + (i*4));
        ctx.fill();
    }

    // Face shape
    ctx.beginPath();
    ctx.ellipse(headX, headY, 12, 14, 0, 0, Math.PI*2);
    ctx.fill();
    
    // Beak (Long red beak)
    ctx.fillStyle = '#b71c1c'; // Slightly lighter red for beak
    ctx.beginPath();
    ctx.moveTo(headX - 3, headY + 2);
    ctx.lineTo(headX + 3, headY + 2);
    ctx.lineTo(headX, headY + 12); // Pointy down
    ctx.fill();

    // Eyes (White, fierce)
    ctx.fillStyle = white;
    ctx.beginPath();
    // Left eye (slanted)
    ctx.moveTo(headX - 2, headY);
    ctx.lineTo(headX - 8, headY - 4);
    ctx.lineTo(headX - 8, headY + 2);
    ctx.fill();
    // Right eye
    ctx.beginPath();
    ctx.moveTo(headX + 2, headY);
    ctx.lineTo(headX + 8, headY - 4);
    ctx.lineTo(headX + 8, headY + 2);
    ctx.fill();

    ctx.restore();
  }, []);

  const drawDiaSprite = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, faceRight: boolean) => {
    ctx.save();
    if (!faceRight) {
        ctx.translate(x + w, y);
        ctx.scale(-1, 1);
        x = 0;
        y = 0;
    } else {
        ctx.translate(x, y);
        x = 0;
        y = 0;
    }

    const faceColor = '#e53935'; // Red face
    const hatColor = '#1565c0'; // Blue hat
    const greenMakeup = '#2e7d32'; // Green eyebrows
    const yellow = '#ffd600';
    const shirtColor = '#c62828';
    const black = '#212121';

    // Pants
    ctx.fillStyle = black;
    ctx.fillRect(x + 10, y + h - 15, 8, 15);
    ctx.fillRect(x + w - 18, y + h - 15, 8, 15);
    
    // Shirt
    ctx.fillStyle = shirtColor;
    ctx.fillRect(x + 5, y + 25, w - 10, 25);
    // Sash
    ctx.fillStyle = yellow;
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 50);
    ctx.lineTo(x + w - 5, y + 25);
    ctx.lineTo(x + w - 5, y + 30);
    ctx.lineTo(x + 5, y + 55);
    ctx.fill();
    // Sleeves
    ctx.fillStyle = shirtColor;
    ctx.fillRect(x, y + 25, 8, 18);
    ctx.fillRect(x + w - 8, y + 25, 8, 18);
    // Cuffs
    ctx.fillStyle = yellow;
    ctx.fillRect(x, y + 38, 8, 5);
    ctx.fillRect(x + w - 8, y + 38, 8, 5);
    // Neck trim
    ctx.beginPath();
    ctx.moveTo(x+15, y+25);
    ctx.lineTo(x+w/2, y+35);
    ctx.lineTo(x+w-15, y+25);
    ctx.strokeStyle = yellow;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Head
    const headX = x + w/2;
    const headY = y + 15;
    const headRadius = 16;
    
    // Face Circle
    ctx.fillStyle = faceColor;
    ctx.beginPath();
    ctx.arc(headX, headY, headRadius, 0, Math.PI * 2);
    ctx.fill();

    // Blue Hat/Hair (Top segment of circle)
    ctx.fillStyle = hatColor;
    ctx.beginPath();
    ctx.arc(headX, headY, headRadius, Math.PI, 0); // Top half
    ctx.fill();
    
    // Small yellow knot on top
    ctx.fillStyle = yellow;
    ctx.fillRect(headX - 2, headY - headRadius - 3, 4, 4);

    // Green Eyebrows / Makeup (Large distinct shapes)
    ctx.fillStyle = greenMakeup;
    // Left
    ctx.beginPath();
    ctx.moveTo(headX - 2, headY - 5);
    ctx.quadraticCurveTo(headX - 8, headY - 12, headX - 14, headY - 2);
    ctx.quadraticCurveTo(headX - 8, headY - 6, headX - 2, headY - 2);
    ctx.fill();
    // Right
    ctx.beginPath();
    ctx.moveTo(headX + 2, headY - 5);
    ctx.quadraticCurveTo(headX + 8, headY - 12, headX + 14, headY - 2);
    ctx.quadraticCurveTo(headX + 8, headY - 6, headX + 2, headY - 2);
    ctx.fill();

    // Yellow Dot on forehead
    ctx.fillStyle = yellow;
    ctx.beginPath();
    ctx.arc(headX, headY - 6, 2, 0, Math.PI * 2);
    ctx.fill();

    // Eyes (Closed happy eyes - black arcs)
    ctx.strokeStyle = black;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(headX - 7, headY + 1, 3, Math.PI, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(headX + 7, headY + 1, 3, Math.PI, 0);
    ctx.stroke();

    // Nose
    ctx.fillStyle = '#b71c1c'; // Darker red
    ctx.beginPath();
    ctx.arc(headX, headY + 5, 2, 0, Math.PI*2);
    ctx.fill();

    // Mouth (Wide white smile)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(headX, headY + 8, 6, 0, Math.PI, false); // Semicircle
    ctx.fill();
    
    // Cheeks (Darker red circles)
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath();
    ctx.arc(headX - 10, headY + 8, 3, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(headX + 10, headY + 8, 3, 0, Math.PI*2);
    ctx.fill();

    ctx.restore();
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const levelData = LEVELS[currentLevel - 1];
    const player = playerRef.current;
    const boss = bossRef.current;

    // Clear Canvas & Draw Background
    if (currentLevel === 1 && background1Ref.current && background1Ref.current.complete) {
        ctx.drawImage(background1Ref.current, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    } else if (currentLevel === 2 && background2Ref.current && background2Ref.current.complete) {
        ctx.drawImage(background2Ref.current, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    } else if (currentLevel === 3 && background3Ref.current && background3Ref.current.complete) {
        ctx.drawImage(background3Ref.current, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    } else if (currentLevel === 4 && background4Ref.current && background4Ref.current.complete) {
        ctx.drawImage(background4Ref.current, 0, 0, GAME_WIDTH, GAME_HEIGHT);
    } else {
        ctx.fillStyle = levelData.background;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }

    // Draw Platforms
    ctx.fillStyle = '#654321';
    for (const plat of levelData.platforms) {
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
        ctx.strokeStyle = '#4e342e';
        ctx.lineWidth = 2;
        ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
    }
    
    // Draw Obstacles (Walls)
    for (const obs of obstaclesRef.current) {
        if (!obs.active) continue;
        ctx.fillStyle = '#7f8c8d'; // Grey stone
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
        
        // Stone texture detail
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 2;
        ctx.strokeRect(obs.x, obs.y, obs.w, obs.h);
        ctx.beginPath();
        ctx.moveTo(obs.x, obs.y + obs.h/2);
        ctx.lineTo(obs.x + obs.w, obs.y + obs.h/2);
        ctx.stroke();
    }

    // Draw Boss
    if (boss.hp > 0) {
        if (boss.level === 1) {
            // Draw external image if available, otherwise fallback to procedural sprite
            if (bossImageRef.current && bossImageRef.current.complete) {
                ctx.drawImage(bossImageRef.current, boss.x, boss.y, boss.w, boss.h);
            } else {
                drawMocTinhSprite(ctx, boss.x, boss.y, boss.w, boss.h, boss.faceRight);
            }
        } else if (boss.level === 2) {
            // Draw external image for boss level 2 if available, otherwise fallback
            if (boss2ImageRef.current && boss2ImageRef.current.complete) {
                ctx.drawImage(boss2ImageRef.current, boss.x, boss.y, boss.w, boss.h);
            } else {
                drawHoaThanSprite(ctx, boss.x, boss.y, boss.w, boss.h, boss.faceRight);
            }
        } else if (boss.level === 3) {
            // Draw external image for boss level 3 if available, otherwise fallback
            if (boss3ImageRef.current && boss3ImageRef.current.complete) {
                ctx.drawImage(boss3ImageRef.current, boss.x, boss.y, boss.w, boss.h);
            } else {
                drawLoiDieuSprite(ctx, boss.x, boss.y, boss.w, boss.h, boss.faceRight);
            }
        } else if (boss.level === 4) {
            // Draw external image for boss level 4 if available, otherwise fallback
            if (boss4ImageRef.current && boss4ImageRef.current.complete) {
                ctx.drawImage(boss4ImageRef.current, boss.x, boss.y, boss.w, boss.h);
            } else {
                drawNienThuSprite(ctx, boss.x, boss.y, boss.w, boss.h, boss.faceRight);
            }
        } else {
            ctx.fillStyle = boss.color;
            ctx.fillRect(boss.x, boss.y, boss.w, boss.h);
            
            // Boss Eyes (Generic)
            ctx.fillStyle = '#fff';
            const eyeOff = boss.faceRight ? 20 : 0;
            ctx.fillRect(boss.x + 10 + eyeOff, boss.y + 15, 15, 15);
            ctx.fillRect(boss.x + 45 + eyeOff, boss.y + 15, 15, 15);
        }

        // Shield (Overlay)
        if (boss.shieldHp > 0) {
            ctx.strokeStyle = boss.shieldType === 'FIRE' ? '#e74c3c' : '#00ffff';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(boss.x + boss.w/2, boss.y + boss.h/2, Math.max(boss.w, boss.h) * 0.7, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    // Draw Minions (use boss image scaled to player size when available)
    for (const m of minionsRef.current) {
        const bossLevel = (m as any).bossLevel as number | undefined;
        let img: HTMLImageElement | null = null;
        if (bossLevel === 1) img = bossImageRef.current;
        else if (bossLevel === 2) img = boss2ImageRef.current;
        else if (bossLevel === 3) img = boss3ImageRef.current;
        else if (bossLevel === 4) img = boss4ImageRef.current;

        if (img && img.complete) {
            // draw boss-like image scaled to player's size (m.w/m.h already set to player size)
            ctx.drawImage(img, m.x, m.y, m.w, m.h);
        } else {
            ctx.fillStyle = m.color;
            ctx.fillRect(m.x, m.y, m.w, m.h);
            ctx.fillStyle = '#fff';
            ctx.fillRect(m.x + 5, m.y + 5, Math.min(5, m.w / 3), Math.min(5, m.h / 3));
        }
    }

    // Draw Player
    if (gameState === GameState.PLAYING || gameState === GameState.VICTORY) {
        ctx.save();
        // Invulnerable blinking
        if (Date.now() < player.invulnerableUntil && Math.floor(Date.now() / 100) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        // Draw Player Sprite based on Mask
        if (player.mask === MaskType.TEU) {
            // Use external image if available, otherwise fallback to procedural sprite
            if (playerImageRef.current && playerImageRef.current.complete) {
                ctx.drawImage(playerImageRef.current, player.x, player.y, player.w, player.h);
            } else {
                drawTeuSprite(ctx, player.x, player.y, player.w, player.h, player.faceRight);
            }
        } else if (player.mask === MaskType.LAN) {
            // Use external image for LAN form if available, otherwise fallback
            if (player2ImageRef.current && player2ImageRef.current.complete) {
                ctx.drawImage(player2ImageRef.current, player.x, player.y, player.w, player.h);
            } else {
                drawLanSprite(ctx, player.x, player.y, player.w, player.h, player.faceRight);
            }
        } else if (player.mask === MaskType.EN) {
            // Use external image for EN form if available, otherwise fallback
            if (player3ImageRef.current && player3ImageRef.current.complete) {
                ctx.drawImage(player3ImageRef.current, player.x, player.y, player.w, player.h);
            } else {
                drawEnSprite(ctx, player.x, player.y, player.w, player.h, player.faceRight);
            }
        } else if (player.mask === MaskType.DIA) {
            // Use external image for DIA form if available, otherwise fallback
            if (player4ImageRef.current && player4ImageRef.current.complete) {
                ctx.drawImage(player4ImageRef.current, player.x, player.y, player.w, player.h);
            } else {
                drawDiaSprite(ctx, player.x, player.y, player.w, player.h, player.faceRight);
            }
        } else {
            // Default Rect Drawing for other masks
            ctx.fillStyle = player.color;
            ctx.fillRect(player.x, player.y, player.w, player.h);

            // Face
            ctx.fillStyle = '#000';
            const pEyeOff = player.faceRight ? 15 : 5;
            ctx.fillRect(player.x + pEyeOff, player.y + 10, 5, 5);
            ctx.fillRect(player.x + pEyeOff + 15, player.y + 10, 5, 5);
        }

        // Shield
        if (player.isShielded) {
             ctx.strokeStyle = '#f1c40f';
             ctx.lineWidth = 3;
             ctx.beginPath();
             ctx.arc(player.x + player.w/2, player.y + player.h/2, player.w, 0, Math.PI * 2);
             ctx.stroke();
        }
        ctx.restore();
    }

    // Draw Projectiles
    for (const p of projectilesRef.current) {
        ctx.fillStyle = p.color;
        if (p.type === 'VINE' || p.type === 'LIGHTNING') {
             ctx.fillRect(p.x, p.y, p.w, p.h);
        } else {
             ctx.beginPath();
             ctx.arc(p.x + p.w/2, p.y + p.h/2, p.w/2, 0, Math.PI * 2);
             ctx.fill();
        }
    }

    // Draw Particles
    for (const p of particlesRef.current) {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1.0;
    }

    // --- FEATURE: Center Screen Cooldown Indicator ---
    const now = Date.now();
    const stats = MASK_STATS[player.mask];
    const cooldownRemaining = Math.max(0, (player.lastSkillTime + stats.skillCd - now) / 1000);
    
    if (cooldownRemaining > 0) {
        ctx.font = "bold 30px 'Patrick Hand', 'Press Start 2P', monospace";
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
        ctx.strokeStyle = "black";
        ctx.lineWidth = 4;
        const text = cooldownRemaining.toFixed(1);
        const textWidth = ctx.measureText(text).width;
        
        // MOVED TO BOTTOM
        const centerX = GAME_WIDTH / 2;
        const bottomY = GAME_HEIGHT - 50; 

        ctx.strokeText(text, centerX - textWidth / 2, bottomY);
        ctx.fillText(text, centerX - textWidth / 2, bottomY);
        
        ctx.font = "12px 'Patrick Hand', sans-serif";
        const label = "Hồi chiêu";
        const labelWidth = ctx.measureText(label).width;
        ctx.fillText(label, centerX - labelWidth / 2, bottomY + 20);
    }

  }, [currentLevel, gameState, drawTeuSprite, drawLanSprite, drawEnSprite, drawDiaSprite, drawMocTinhSprite, drawHoaThanSprite, drawLoiDieuSprite, drawNienThuSprite]);

  // Game Loop
  useEffect(() => {
    let lastTime = 0;
    const loop = (time: number) => {
      const dt = time - lastTime;
      lastTime = time;
      
      update(time);
      draw();
      requestRef.current = requestAnimationFrame(loop);
    };
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [update, draw]);

  return (
    <canvas
      ref={canvasRef}
      width={GAME_WIDTH}
      height={GAME_HEIGHT}
      className="border-4 border-yellow-600 shadow-2xl bg-black rounded-lg max-w-full"
    />
  );
};

export default GameCanvas;