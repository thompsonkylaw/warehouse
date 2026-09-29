import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Warehouse, Shuffle, Maximize, X, Check } from 'lucide-react';

/* ===================== 基本設定 ===================== */

const PIXELS_PER_FT = 20; // 20px = 1 呎
const GRID_SIZE_PX = 20;  // 拖曳時對齊 1 呎格

const CELL_W = 80;   // 標準倉位闊度（4 呎）
const CELL_H = 100;  // 倉位深度（5 呎）
const MARGIN_X = 80;
const MARGIN_Y = 60;
const ROW_GAP = 60;  // 行與行之間嘅走道

// 示範擺位：每行由左至右，數字 = 該倉位佔幾多個標準格（1 = 4 呎、2 = 8 呎）
const LAYOUT_ROWS = [
  [2, 1, 1, 2, 1, 1],    // N101 – N106
  [1, 1, 2, 1, 1, 1, 1], // N107 – N113
  [1, 1, 1, 2, 1, 1, 1], // N114 – N120
];

const BOARD_W = MARGIN_X * 2 + 8 * CELL_W;
const BOARD_H =
  MARGIN_Y * 2 + LAYOUT_ROWS.length * CELL_H + (LAYOUT_ROWS.length - 1) * ROW_GAP;

/* ===================== 倉位狀態設定 ===================== */
// 之後加新狀態（例如：等候、問題、已刪除…）只需喺度加多一行 + 一個顏色
const STATUS = {
  occupied: { label: '使用中', color: '#2fdd52', text: '#07270f' },
  vacant: { label: '空置', color: '#2adcf2', text: '#05303a' },
  expiring: { label: '即將到期', color: '#fa4a35', text: '#420b05' },
};
const STATUS_KEYS = ['occupied', 'vacant', 'expiring'];

// 隨機示範用嘅狀態池（合共 20 個）
const STATUS_POOL = [
  ...Array(9).fill('occupied'),
  ...Array(6).fill('vacant'),
  ...Array(5).fill('expiring'),
];

/* ===================== 工具函式 ===================== */

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 隨機砌出一個示範平面圖（20 個倉位）
function buildUnits() {
  const statuses = shuffle(STATUS_POOL);
  const units = [];
  let n = 101;
  let idx = 0;

  LAYOUT_ROWS.forEach((row, r) => {
    let x = MARGIN_X;
    const y = MARGIN_Y + r * (CELL_H + ROW_GAP);
    row.forEach((cells) => {
      units.push({
        id: `unit-${n}`,
        name: `N${n}`,
        x,
        y,
        w: cells * CELL_W,
        h: CELL_H,
        status: statuses[idx],
      });
      x += cells * CELL_W;
      n += 1;
      idx += 1;
    });
  });

  return units;
}

/* ===================== 狀態選擇器 ===================== */

function StatusPicker({ value, onChange }) {
  return (
    <div className="space-y-1.5">
      {STATUS_KEYS.map((key) => {
        const s = STATUS[key];
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md border text-sm transition-colors ${
              active
                ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-400'
                : 'border-gray-200 hover:bg-gray-50 text-gray-700'
            }`}
          >
            <span
              className="w-4 h-3.5 rounded-[3px] border border-black/40 shrink-0"
              style={{ background: s.color }}
            />
            <span className={active ? 'font-semibold text-blue-700' : ''}>{s.label}</span>
            {active && <Check size={14} className="ml-auto text-blue-600" />}
          </button>
        );
      })}
    </div>
  );
}

/* ===================== 倉位欄位（側欄 / 彈窗共用） ===================== */

function UnitFields({ unit, onPatch, onResize }) {
  const area = ((unit.w / PIXELS_PER_FT) * (unit.h / PIXELS_PER_FT)).toFixed(0);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs text-gray-500 mb-1">倉號</label>
        <input
          type="text"
          value={unit.name}
          onChange={(e) => onPatch({ name: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1.5">狀態</label>
        <StatusPicker value={unit.status} onChange={(key) => onPatch({ status: key })} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">闊（呎）</label>
          <input
            type="number"
            value={unit.w / PIXELS_PER_FT}
            onChange={(e) => {
              const ft = Number(e.target.value);
              if (!ft || ft < 1) return;
              onResize(ft * PIXELS_PER_FT, unit.h);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">深（呎）</label>
          <input
            type="number"
            value={unit.h / PIXELS_PER_FT}
            onChange={(e) => {
              const ft = Number(e.target.value);
              if (!ft || ft < 1) return;
              onResize(unit.w, ft * PIXELS_PER_FT);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
        <span className="text-gray-500">面積</span>
        <span className="font-semibold text-gray-900">{area} 平方呎</span>
      </div>
    </div>
  );
}

/* ===================== 主程式 ===================== */

export default function App() {
  // --- State ---
  const [units, setUnits] = useState(buildUnits);
  const [selectedId, setSelectedId] = useState(null);
  const [editingUnitId, setEditingUnitId] = useState(null); // 雙擊快速編輯
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const boardRef = useRef(null);

  // --- 衍生資料 ---
  const selectedUnit = units.find((u) => u.id === selectedId);
  const editingUnit = units.find((u) => u.id === editingUnitId);

  const counts = useMemo(() => {
    const c = {};
    STATUS_KEYS.forEach((k) => {
      c[k] = units.filter((u) => u.status === k).length;
    });
    return c;
  }, [units]);

  // --- Helpers ---
  const checkCollision = (x, y, w, h, excludeId) =>
    units.some((u) => {
      if (u.id === excludeId) return false;
      return x < u.x + u.w && x + w > u.x && y < u.y + u.h && y + h > u.y;
    });

  const patchSelected = (updates) =>
    setUnits((prev) => prev.map((u) => (u.id === selectedId ? { ...u, ...updates } : u)));

  const patchEditing = (updates) =>
    setUnits((prev) => prev.map((u) => (u.id === editingUnitId ? { ...u, ...updates } : u)));

  const resizeUnit = (unit, w, h, apply) => {
    if (!w || !h || w < GRID_SIZE_PX || h < GRID_SIZE_PX) return;
    if (checkCollision(unit.x, unit.y, w, h, unit.id)) return;
    apply({ w, h });
  };

  // 重新隨機分配狀態（其餘資料不變）
  const randomizeStatuses = () => {
    const statuses = shuffle(STATUS_POOL);
    setUnits((prev) => prev.map((u, i) => ({ ...u, status: statuses[i] })));
  };

  // --- 拖曳邏輯 ---
  const handlePointerDown = (e, id) => {
    e.stopPropagation();
    setSelectedId(id);
    setIsDragging(true);

    const unit = units.find((u) => u.id === id);
    const rect = boardRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left - unit.x,
      y: e.clientY - rect.top - unit.y,
    });
  };

  const handleDoubleClick = (e, id) => {
    e.stopPropagation();
    setSelectedId(id);
    setEditingUnitId(id);
  };

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!isDragging || !selectedId || !boardRef.current) return;

      const unit = units.find((u) => u.id === selectedId);
      if (!unit) return;

      const rect = boardRef.current.getBoundingClientRect();
      let newX = e.clientX - rect.left - dragOffset.x;
      let newY = e.clientY - rect.top - dragOffset.y;

      // 邊界
      if (newX < 0) newX = 0;
      if (newY < 0) newY = 0;
      if (newX + unit.w > BOARD_W) newX = BOARD_W - unit.w;
      if (newY + unit.h > BOARD_H) newY = BOARD_H - unit.h;

      // 對齊格
      newX = Math.round(newX / GRID_SIZE_PX) * GRID_SIZE_PX;
      newY = Math.round(newY / GRID_SIZE_PX) * GRID_SIZE_PX;

      // 防重疊（碰邊可以滑行）
      if (checkCollision(newX, newY, unit.w, unit.h, selectedId)) {
        const collidesX = checkCollision(newX, unit.y, unit.w, unit.h, selectedId);
        const collidesY = checkCollision(unit.x, newY, unit.w, unit.h, selectedId);

        if (!collidesX && newX !== unit.x) {
          newY = unit.y;
        } else if (!collidesY && newY !== unit.y) {
          newX = unit.x;
        } else {
          return;
        }
      }

      setUnits((prev) =>
        prev.map((u) => (u.id === selectedId ? { ...u, x: newX, y: newY } : u))
      );
    };

    const handlePointerUp = () => {
      if (isDragging) setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, selectedId, dragOffset, units]);

  // --- 畫面 ---
  return (
    <div className="h-screen flex flex-col bg-gray-100 font-sans overflow-hidden text-gray-800">
      {/* 頂欄 */}
      <header className="h-14 shrink-0 flex items-center justify-between px-5 bg-white border-b border-gray-200 shadow-sm z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
            <Warehouse size={18} />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight">迷你倉管理系統</h1>
            <p className="text-[11px] text-gray-500 leading-tight">示範平面圖・20 個倉位</p>
          </div>
        </div>

        {/* 狀態圖例 */}
        <div className="flex items-center gap-4 text-xs text-gray-600">
          {STATUS_KEYS.map((k) => (
            <span key={k} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-[3px] border border-black/30"
                style={{ background: STATUS[k].color }}
              />
              {STATUS[k].label}
              <b className="text-gray-800">{counts[k]}</b>
            </span>
          ))}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* 側欄 */}
        <aside className="w-72 shrink-0 bg-white border-r border-gray-200 flex flex-col shadow-sm z-10">
          <div className="flex-1 overflow-y-auto p-4">
            {selectedUnit ? (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold text-gray-500 tracking-wider uppercase">
                    倉位詳情
                  </h3>
                  <span
                    className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                    style={{
                      background: STATUS[selectedUnit.status].color,
                      color: STATUS[selectedUnit.status].text,
                    }}
                  >
                    {STATUS[selectedUnit.status].label}
                  </span>
                </div>
                <UnitFields
                  unit={selectedUnit}
                  onPatch={patchSelected}
                  onResize={(w, h) => resizeUnit(selectedUnit, w, h, patchSelected)}
                />
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400 flex flex-col items-center">
                <Maximize size={32} className="mb-3 text-gray-300" />
                <p className="text-sm leading-relaxed">
                  喺平面圖點選一個倉位
                  <br />
                  查看同編輯詳情
                </p>
              </div>
            )}
          </div>

          {/* 統計 */}
          <div className="p-4 border-t border-gray-200 bg-gray-50 text-sm space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>倉位總數</span>
              <span className="font-semibold text-gray-900">{units.length}</span>
            </div>
            {STATUS_KEYS.map((k) => (
              <div key={k} className="flex items-center justify-between text-gray-600">
                <span className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-black/20"
                    style={{ background: STATUS[k].color }}
                  />
                  {STATUS[k].label}
                </span>
                <span className="font-semibold text-gray-900">{counts[k]}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* 平面圖 */}
        <main
          className="flex-1 overflow-auto p-6"
          onClick={() => setSelectedId(null)}
        >
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 w-max mx-auto">
            <div className="mb-4 flex items-center justify-between gap-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-700">樓層平面圖</h2>
                <p className="text-xs text-gray-400">
                  拖曳移動倉位・點選查看詳情・雙擊快速編輯
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  randomizeStatuses();
                }}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                <Shuffle size={14} />
                重新隨機狀態
              </button>
            </div>

            {/* 平面圖畫板 */}
            <div
              ref={boardRef}
              className="relative bg-white border-2 border-gray-300 shadow-inner overflow-hidden"
              style={{
                width: `${BOARD_W}px`,
                height: `${BOARD_H}px`,
                backgroundImage: `
                  linear-gradient(to right, #f1f5f9 1px, transparent 1px),
                  linear-gradient(to bottom, #f1f5f9 1px, transparent 1px)
                `,
                backgroundSize: `${GRID_SIZE_PX}px ${GRID_SIZE_PX}px`,
                touchAction: 'none',
              }}
            >
              {units.map((unit) => {
                const s = STATUS[unit.status] || STATUS.vacant;
                const isSelected = selectedId === unit.id;
                return (
                  <div
                    key={unit.id}
                    title={`${unit.name}・${s.label}`}
                    onPointerDown={(e) => handlePointerDown(e, unit.id)}
                    onDoubleClick={(e) => handleDoubleClick(e, unit.id)}
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute flex items-center justify-center select-none cursor-grab active:cursor-grabbing ${
                      isSelected
                        ? 'z-30 ring-4 ring-blue-500 shadow-xl'
                        : 'z-10 hover:ring-2 hover:ring-blue-300'
                    }`}
                    style={{
                      left: `${unit.x}px`,
                      top: `${unit.y}px`,
                      width: `${unit.w}px`,
                      height: `${unit.h}px`,
                      background: s.color,
                      border: '1px solid rgba(15, 23, 42, 0.55)',
                    }}
                  >
                    <span
                      className="pointer-events-none font-bold text-[13px] tracking-wide"
                      style={{ color: s.text }}
                    >
                      {unit.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>

      {/* 雙擊快速編輯彈窗 */}
      {editingUnit && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-bold text-gray-800">快速編輯 — {editingUnit.name}</h3>
              <button
                onClick={() => setEditingUnitId(null)}
                className="text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5">
              <UnitFields
                unit={editingUnit}
                onPatch={patchEditing}
                onResize={(w, h) => resizeUnit(editingUnit, w, h, patchEditing)}
              />
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setEditingUnitId(null)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium transition-colors text-sm"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
