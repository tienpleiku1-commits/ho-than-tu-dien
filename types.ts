export enum GameState {
  MENU,
  PLAYING,
  LEVEL_TRANSITION,
  GAME_OVER,
  VICTORY,
}

export enum MaskType {
  TEU = 1, // Chú Tễu
  LAN = 2, // Đầu Lân
  EN = 3,  // Chim Én
  DIA = 4, // Ông Địa
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Entity extends Rect {
  vx: number;
  vy: number;
  color: string;
  faceRight: boolean;
}

export interface Player extends Entity {
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  mask: MaskType;
  unlockedMasks: MaskType[];
  isGrounded: boolean;
  isDashing: boolean;
  isShielded: boolean;
  lastAttackTime: number;
  lastSkillTime: number;
  lastDashTime: number;
  invulnerableUntil: number;
  // Status Effects
  stunnedUntil: number;
  burnTicks: number;
  nextBurnTime: number;
}

export interface Boss extends Entity {
  hp: number;
  maxHp: number;
  name: string;
  state: 'IDLE' | 'CHASE' | 'ATTACK' | 'SKILL';
  attackCooldown: number;
  level: number;
  // Status effects
  burnTicks: number; 
  nextBurnTime: number;
  stunnedUntil: number; // New: Boss can be stunned
  // AI
  lastSummonTime: number;
  dodgeCooldown: number;
  lastSkillTime: number; // Added for separate skill cooldown
  // Shields & Phases
  shieldHp: number;     // Shield health
  maxShieldHp: number;
  shieldType: 'NONE' | 'FIRE' | 'WIND';
  phase: 1 | 2 | 3;
  lastOrbSpawnTime: number; // For phase 3 orbs
}

export interface Minion extends Entity {
  hp: number;
  damage: number;
  type: 'GROUND' | 'FLYING';
  hasUsedSkill: boolean;
  bossLevel?: number; // which boss spawned this minion (1..4)
}

export interface Obstacle extends Rect {
  hp: number;
  maxHp: number;
  active: boolean;
  type: 'STONE_WALL'; 
}

export interface Projectile extends Entity {
  damage: number;
  isPlayerOwner: boolean;
  lifeTime: number;
  type?: 'FIRE' | 'NORMAL' | 'LIGHTNING' | 'VINE' | 'ORB_FIRE' | 'ORB_THUNDER' | 'ORB_GRASS';
  // Orbit logic
  isOrbiting?: boolean;
  orbitAngle?: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface LevelData {
  id: number;
  name: string;
  description: string;
  bossName: string;
  bossHp: number;
  bossDmg: number;
  bossColor: string;
  unlockMsg: string;
  rewardMsg: string;
  background: string;
  platforms: Rect[];
  obstacles?: Obstacle[];
}

export enum BuffType {
  DAMAGE = 'DAMAGE',
  SPEED = 'SPEED',
  HP = 'HP'
}

export interface Item {
  id: number;
  name: string;
  desc: string;
  buffType: BuffType;
  value: number; // e.g. 1.2 for 20% increase
  icon: string;
}