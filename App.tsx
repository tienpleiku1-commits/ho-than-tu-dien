import React, { useState, useEffect } from "react";
import GameCanvas from "./components/GameCanvas";
import { GameState, MaskType, Item } from "./types";
import { LEVELS, MASK_STATS, ITEMS } from "./constants";

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [gameMessage, setGameMessage] = useState("");

  // Inventory State
  const [inventory, setInventory] = useState<Item[]>([]);
  const [activeBuffs, setActiveBuffs] = useState<Item[]>([]);

  // Player UI State
  const [playerStats, setPlayerStats] = useState({
    hp: 100,
    maxHp: 100,
    mana: 100,
    mask: MaskType.TEU,
  });

  // Boss UI State
  const [bossStats, setBossStats] = useState({
    hp: 100,
    maxHp: 100,
    name: "Boss",
  });

  const startGame = () => {
    setCurrentLevel(1);
    setGameState(GameState.PLAYING);
    setGameMessage("");
    setInventory([]);
    setActiveBuffs([]);
  };

  const nextLevel = () => {
    setCurrentLevel((prev) => prev + 1);
    setGameState(GameState.PLAYING);
  };

  const retryLevel = (levelId: number) => {
    setCurrentLevel(levelId);
    setGameState(GameState.PLAYING);
    setGameMessage("");
    // We keep inventory/buffs as is for retry convenience or you can reset if hard mode desired
  };

  const handleLevelComplete = (levelId: number) => {
    const rewardItem = ITEMS[levelId];
    if (rewardItem) {
      // Check if already has item
      if (
        !inventory.some((i) => i.id === rewardItem.id) &&
        !activeBuffs.some((i) => i.id === rewardItem.id)
      ) {
        setInventory((prev) => [...prev, rewardItem]);
      }
    }
  };

  const activateBuff = (item: Item) => {
    // Move from inventory to active buffs
    setInventory((prev) => prev.filter((i) => i.id !== item.id));
    setActiveBuffs((prev) => [...prev, item]);
    setGameMessage(`Kích hoạt: ${item.name}!`);
    setTimeout(() => setGameMessage(""), 1500);
  };

  const renderUI = () => {
    if (gameState === GameState.MENU) {
      return (
        <div
          className='absolute inset-0 flex flex-col items-center justify-end pb-24 bg-black/90 text-white z-50 bg-cover bg-center'
          style={{
            backgroundImage: "url('Backgroundmodau.png')",
          }}
        >
          {/* Dark overlay for better text contrast if needed */}
          <div className='absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/30'></div>

          <div className='z-10 text-center mb-10 transform translate-y-4'>
            <h1
              className='text-5xl md:text-7xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-b from-[#ffd700] to-[#b8860b] fantasy-font drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]'
              style={{ textShadow: "0 0 20px rgba(255, 215, 0, 0.6)" }}
            >
              HỘ THẦN TỨ DIỆN
            </h1>
            <p className='text-xl md:text-2xl text-[#f0e68c] tracking-[0.4em] font-serif uppercase drop-shadow-md border-t border-b border-[#f0e68c]/50 py-2 inline-block'>
              — THỦ HỘ MÙA XUÂN —
            </p>
          </div>

          <button
            onClick={startGame}
            className='z-10 px-12 py-3 bg-[#3e2723]/90 hover:bg-[#5d4037] text-[#ffecb3] font-bold rounded-full text-xl border-2 border-[#ffa000] shadow-[0_0_20px_rgba(255,160,0,0.6)] transition-all transform hover:scale-105 active:scale-95 fantasy-font tracking-widest'
          >
            START
          </button>

          {/* Discreet Controls Info */}
          <div className='absolute top-4 right-4 z-20 text-[10px] text-white/60 text-right font-mono bg-black/50 p-2 rounded backdrop-blur-sm'>
            <p>A/D: Move | Space: Jump</p>
            <p>Q: Dash | Z: Skill | 1-4: Mask</p>
          </div>
        </div>
      );
    }

    if (gameState === GameState.LEVEL_TRANSITION) {
      const prevLevelData = LEVELS[currentLevel - 1];
      return (
        <div className='absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white z-50 pixel-font'>
          <h2 className='text-4xl text-green-400 mb-4'>
            HOÀN THÀNH MÀN {currentLevel}
          </h2>
          <div className='text-center mb-8 space-y-4'>
            <p className='text-2xl text-yellow-300'>
              {prevLevelData.rewardMsg}
            </p>
            <p className='text-xl text-blue-300'>{prevLevelData.unlockMsg}</p>
            {inventory.length > 0 && (
              <div className='mt-4 p-4 bg-gray-800 rounded border border-yellow-500'>
                <p className='text-white mb-2'>Vật phẩm mới trong túi đồ:</p>
                <div className='flex justify-center gap-2'>
                  {inventory.map((item) => (
                    <div key={item.id} className='flex flex-col items-center'>
                      <span className='text-3xl'>{item.icon}</span>
                      <span className='text-xs text-yellow-200 pixel-font'>
                        {item.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={nextLevel}
            className='px-6 py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded shadow border border-white'
          >
            TIẾP TỤC HÀNH TRÌNH
          </button>
        </div>
      );
    }

    if (gameState === GameState.GAME_OVER) {
      return (
        <div className='absolute inset-0 flex flex-col items-center justify-center bg-red-900/90 text-white z-50'>
          <h2 className='text-5xl mb-6 pixel-font'>THẤT BẠI</h2>
          <p className='mb-8'>Bạn đã gục ngã trước thềm năm mới...</p>

          <div className='flex flex-col gap-4 items-center'>
            <p className='text-yellow-300 mb-2'>Chọn màn để chơi lại:</p>
            <div className='flex gap-4 flex-wrap justify-center'>
              {LEVELS.slice(0, currentLevel).map((level) => (
                <button
                  key={level.id}
                  onClick={() => retryLevel(level.id)}
                  className='px-4 py-2 bg-gray-700 hover:bg-gray-600 border border-yellow-500 text-white rounded font-bold'
                >
                  Màn {level.id}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (gameState === GameState.VICTORY) {
      return (
        <div className='absolute inset-0 flex flex-col items-center justify-center bg-black/40 text-white z-50'>
          {/* Fireworks handled by Canvas, this is just overlay text */}
          <div className='text-center animate-bounce'>
            <h1 className='text-5xl md:text-7xl font-bold mb-4 text-yellow-300 pixel-font drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)]'>
              HAPPY NEW YEAR
            </h1>
            <h1 className='text-6xl md:text-8xl font-bold text-red-500 pixel-font drop-shadow-[0_5px_5px_rgba(255,255,255,0.5)]'>
              2026
            </h1>
          </div>
          <p className='text-2xl mt-8 text-white drop-shadow-md'>
            Bạn đã đánh bại Niên Thú và mang lại bình yên!
          </p>
          <div className='flex gap-4 mt-8'>
            <button
              onClick={startGame}
              className='px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded border-2 border-yellow-400 shadow-xl'
            >
              CHƠI LẠI TỪ ĐẦU
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  // Reusable Stat Component matching the image style
  const StatBox = ({
    label,
    current,
    max,
    colorStart,
    colorEnd,
    subLabel,
    level,
  }: {
    label: string;
    current: number;
    max: number;
    colorStart: string;
    colorEnd: string;
    subLabel?: string | React.ReactNode;
    level?: number;
  }) => (
    <div className='bg-black border-2 border-red-600 rounded-lg p-3 w-80 shadow-[0_0_10px_rgba(220,38,38,0.5)] mb-2 relative'>
      {/* Header Row */}
      <div className='flex justify-between items-end mb-2'>
        <div className='flex gap-2 items-center'>
          <span className='text-yellow-400 font-bold pixel-font text-xs uppercase tracking-widest'>
            {label}
          </span>
          <span className='text-yellow-400 font-mono text-sm font-bold tracking-widest'>
            - HP: {Math.ceil(current)}/{Math.ceil(max)}
          </span>
        </div>
        {level && (
          <span className='text-gray-400 text-xs pixel-font'>LV {level}</span>
        )}
      </div>

      {/* Bar Container */}
      <div className='w-full bg-gray-900/80 h-6 rounded border border-gray-700 relative overflow-hidden'>
        {/* The Bar */}
        <div
          className={`h-full transition-all duration-200 bg-gradient-to-r ${colorStart} ${colorEnd}`}
          style={{ width: `${Math.max(0, (current / max) * 100)}%` }}
        ></div>
        {/* Gloss overlay */}
        <div className='absolute top-0 left-0 w-full h-1/2 bg-white/10 pointer-events-none'></div>
      </div>

      {subLabel && (
        <div className='mt-2 text-[10px] text-gray-400 font-mono italic'>
          {subLabel}
        </div>
      )}
    </div>
  );

  const renderHUD = () => {
    if (gameState === GameState.MENU) return null;

    const maskInfo = MASK_STATS[playerStats.mask];

    return (
      <div className='absolute top-0 left-0 w-full p-4 pointer-events-none flex justify-between items-start'>
        {/* Player Stats Left */}
        <div className='flex flex-col pointer-events-auto'>
          {/* Player HP */}
          <StatBox
            label='PLAYER'
            current={playerStats.hp}
            max={playerStats.maxHp}
            colorStart='from-red-800'
            colorEnd='to-orange-500 via-red-600'
            subLabel={
              <div className='text-yellow-200'>
                Mặt nạ:{" "}
                <span
                  style={{ color: maskInfo.color }}
                  className='font-bold uppercase'
                >
                  {maskInfo.name}
                </span>
              </div>
            }
          />

          {/* Player Mana (Customized StatBox for Mana) */}
          <div className='bg-black border-2 border-blue-600 rounded-lg p-3 w-80 shadow-[0_0_10px_rgba(37,99,235,0.5)] mb-2 relative'>
            <div className='flex justify-between items-end mb-2'>
              <div className='flex gap-2 items-center'>
                <span className='text-cyan-400 font-bold pixel-font text-xs uppercase tracking-widest'>
                  MANA
                </span>
                <span className='text-cyan-400 font-mono text-sm font-bold tracking-widest'>
                  - MP: {Math.ceil(playerStats.mana)}/100
                </span>
              </div>
            </div>
            <div className='w-full bg-gray-900/80 h-4 rounded border border-gray-700 relative overflow-hidden'>
              <div
                className='h-full transition-all duration-200 bg-gradient-to-r from-blue-900 via-blue-600 to-cyan-400'
                style={{
                  width: `${Math.max(0, (playerStats.mana / 100) * 100)}%`,
                }}
              ></div>
              <div className='absolute top-0 left-0 w-full h-1/2 bg-white/10 pointer-events-none'></div>
            </div>
          </div>

          {/* Inventory / Buffs */}
          <div className='flex gap-2 mt-2'>
            {activeBuffs.map((buff) => (
              <div
                key={`buff-${buff.id}`}
                className='w-10 h-10 bg-green-900/80 border border-green-400 rounded flex items-center justify-center text-xl relative group shadow-md'
                title={buff.desc}
              >
                {buff.icon}
                <div className='absolute -bottom-8 bg-black text-xs text-white p-1 rounded hidden group-hover:block whitespace-nowrap z-50'>
                  {buff.desc}
                </div>
              </div>
            ))}

            {inventory.map((item) => (
              <button
                key={`inv-${item.id}`}
                onClick={() => activateBuff(item)}
                className='w-10 h-10 bg-gray-800/80 border border-yellow-400 rounded flex items-center justify-center text-xl hover:bg-gray-700 transition-colors animate-pulse relative group shadow-md'
                title='Bấm để dùng'
              >
                {item.icon}
                <div className='absolute -bottom-8 bg-black text-xs text-white p-1 rounded hidden group-hover:block whitespace-nowrap z-50'>
                  Dùng: {item.desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Message Overlay */}
        {gameMessage && (
          <div className='absolute top-24 left-1/2 transform -translate-x-1/2 bg-black/80 border-2 border-yellow-500 px-6 py-3 rounded text-yellow-400 font-bold text-xl animate-pulse z-40 notify-font shadow-lg'>
            {gameMessage}
          </div>
        )}

        {/* Boss Stats Right */}
        {gameState === GameState.PLAYING && bossStats.hp > 0 && (
          <div className='pointer-events-auto'>
            <StatBox
              label={bossStats.name.split(" ")[0]} // Short name
              current={bossStats.hp}
              max={bossStats.maxHp}
              colorStart='from-purple-900'
              colorEnd='to-red-600 via-purple-600'
              level={currentLevel}
              subLabel={bossStats.name}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className='w-screen h-screen bg-neutral-900 flex items-center justify-center relative overflow-hidden'>
      <div className='relative'>
        <GameCanvas
          gameState={gameState}
          setGameState={setGameState}
          currentLevel={currentLevel}
          setCurrentLevel={setCurrentLevel}
          setPlayerStats={setPlayerStats}
          setBossStats={setBossStats}
          setGameMessage={setGameMessage}
          activeBuffs={activeBuffs}
          onLevelComplete={handleLevelComplete}
        />
        {renderHUD()}
        {renderUI()}
      </div>
    </div>
  );
};

export default App;
