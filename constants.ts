import { LevelData, MaskType, BuffType, Item } from './types';

export const GRAVITY = 0.6;
export const FRICTION = 0.85;
export const JUMP_FORCE = -14;
export const MOVE_SPEED = 5;

// Screen dimensions logic
export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 640;

export const MASK_STATS = {
  [MaskType.TEU]: {
    name: "Chú Tễu",
    desc: "Cân bằng. Skill: Pháo Tép (Tầm xa)",
    color: "#ffccaa", // Skin tone
    speedMod: 1.0,
    dmgMod: 1.0,
    hpMod: 1.0, // Base 100
    skillCost: 20,
    skillCd: 3000,
  },
  [MaskType.LAN]: {
    name: "Đầu Lân",
    desc: "Công cao, -20% Máu. Skill: Phun Lửa",
    color: "#ff4444", // Red
    speedMod: 1.0,
    dmgMod: 1.3,
    hpMod: 0.8, // Reduced by 20% (was 0.2)
    skillCost: 40,
    skillCd: 5000,
  },
  [MaskType.EN]: {
    name: "Chim Én",
    desc: "Siêu tốc, đánh nhanh, dame thấp. Skill: Chém Lướt",
    color: "#4488ff", // Blue
    speedMod: 1.5,
    dmgMod: 0.7,
    hpMod: 1.0,
    skillCost: 10,
    skillCd: 2000,
  },
  [MaskType.DIA]: {
    name: "Ông Địa",
    desc: "Trâu bò, chậm chạp. Skill: Khiên",
    color: "#ddaa44", // Gold/Brown
    speedMod: 0.5,
    dmgMod: 0.9,
    hpMod: 1.4,
    skillCost: 0, // Shield handles differently or custom cost
    skillCd: 6000,
  },
};

export const ITEMS: Record<number, Item> = {
  1: { id: 1, name: "Ngọc Lửa", desc: "+20% Sát thương", buffType: BuffType.DAMAGE, value: 0.2, icon: "🔥" },
  2: { id: 2, name: "Lông Vũ", desc: "+20% Tốc độ", buffType: BuffType.SPEED, value: 0.2, icon: "🪶" },
  3: { id: 3, name: "Thổ Địa Phù", desc: "+20% Máu tối đa", buffType: BuffType.HP, value: 0.2, icon: "🛡️" }
};

export const GROUND_Y = GAME_HEIGHT - 60;

export const LEVELS: LevelData[] = [
  {
    id: 1,
    name: "Màn 1: Đêm 28 Tết - Làng Gốm",
    description: "Khởi đầu hành trình. Học cách di chuyển và dùng Pháo Tép.",
    bossName: "Mộc Tinh (Cây Đa)",
    bossHp: 100,
    bossDmg: 5,
    bossColor: "#4a7c59",
    unlockMsg: "Mở khóa: Mặt Nạ Đầu Lân (Phím 2)",
    rewardMsg: "Nhận: Ngọc Lửa (+20% Dame)",
    background: "#2c3e50",
    platforms: [
      { x: 0, y: GROUND_Y, w: GAME_WIDTH, h: 60 },
      { x: 200, y: 450, w: 150, h: 20 },
      { x: 600, y: 350, w: 150, h: 20 },
    ]
  },
  {
    id: 2,
    name: "Màn 2: Đêm 29 Tết - Lò Rèn Cổ",
    description: "Dùng kỹ năng Lửa để phá tường đá và hạ Hỏa Thần.",
    bossName: "Hỏa Thần",
    bossHp: 120,
    bossDmg: 8,
    bossColor: "#e74c3c",
    unlockMsg: "Mở khóa: Mặt Nạ Chim Én (Phím 3)",
    rewardMsg: "Nhận: Lông Vũ (+20% Tốc độ)",
    background: "#4a2323",
    platforms: [
      { x: 0, y: GROUND_Y, w: GAME_WIDTH, h: 60 },
      { x: 100, y: 400, w: 100, h: 20 },
      { x: 400, y: 300, w: 160, h: 20 }, // Higher platform
      { x: 750, y: 450, w: 100, h: 20 },
    ],
    obstacles: [
      { x: 500, y: GROUND_Y - 200, w: 40, h: 200, hp: 1, maxHp: 1, active: true, type: 'STONE_WALL' }
    ]
  },
  {
    id: 3,
    name: "Màn 3: Chiều 30 Tết - Đỉnh Núi",
    description: "Sử dụng sự linh hoạt của Én để đối đầu Lôi Điểu.",
    bossName: "Lôi Điểu",
    bossHp: 140,
    bossDmg: 9,
    bossColor: "#f1c40f",
    unlockMsg: "Mở khóa: Mặt Nạ Ông Địa (Phím 4)",
    rewardMsg: "Nhận: Thổ Địa Phù (+20% HP)",
    background: "#5D6D7E",
    platforms: [
      { x: 0, y: GROUND_Y, w: GAME_WIDTH, h: 60 },
      { x: 50, y: 500, w: 100, h: 20 },
      { x: 250, y: 400, w: 80, h: 20 },
      { x: 450, y: 300, w: 80, h: 20 },
      { x: 650, y: 200, w: 80, h: 20 },
      { x: 850, y: 350, w: 80, h: 20 },
    ]
  },
  {
    id: 4,
    name: "Màn 4: Giao Thừa - Sân Đình",
    description: "Trận chiến cuối cùng với Niên Thú. Kết hợp tất cả kỹ năng!",
    bossName: "Niên Thú Hắc Ám",
    bossHp: 250, // Updated to 250
    bossDmg: 10,
    bossColor: "#8e44ad",
    unlockMsg: "CHIẾN THẮNG!",
    rewardMsg: "HAPPY NEW YEAR 2026",
    background: "#4a1b4d",
    platforms: [
      { x: 0, y: GROUND_Y, w: GAME_WIDTH, h: 60 },
      { x: 100, y: 450, w: 200, h: 20 },
      { x: 660, y: 450, w: 200, h: 20 },
      { x: 380, y: 300, w: 200, h: 20 },
    ]
  }
];