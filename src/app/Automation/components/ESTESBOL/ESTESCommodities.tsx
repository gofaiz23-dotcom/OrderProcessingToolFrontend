'use client';

import { ChevronDown, ChevronUp, Info, Plus, X } from 'lucide-react';

type HandlingUnit = {
  id: string;
  doNotStack: boolean;
  handlingUnitType: string;
  quantity: number;
  length: number;
  width: number;
  height: number;
  weight: number;
  class: string;
  nmfc: string;
  sub: string;
  items: CommodityItem[];
};

type CommodityItem = {
  id: string;
  description: string;
  pieces: number;
  pieceType: string;
};

type ESTESCommoditiesProps = {
  handlingUnits: HandlingUnit[];
  onAddHandlingUnit: () => void;
  onUpdateHandlingUnit: (id: string, field: keyof HandlingUnit, value: any) => void;
  onRemoveHandlingUnit: (id: string) => void;
  onAddItemToUnit: (unitId: string) => void;
  onRemoveItemFromUnit: (unitId: string, itemId: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
};

export const ESTESCommodities = ({
  handlingUnits,
  onAddHandlingUnit,
  onUpdateHandlingUnit,
  onRemoveHandlingUnit,
  onAddItemToUnit,
  onRemoveItemFromUnit,
  isExpanded,
  onToggle,
}: ESTESCommoditiesProps) => {
  // Calculate totals
  const calculateTotals = () => {
    let totalCube = 0;
    let totalWeight = 0;
    let totalHandlingUnits = handlingUnits.length;
    let totalPieces = 0;

    handlingUnits.forEach((unit) => {
      const cube = (unit.length * unit.width * unit.height) / 1728;
      totalCube += cube * unit.quantity;
      totalWeight += unit.weight * unit.quantity;
      totalPieces += unit.items.reduce((sum, item) => sum + item.pieces, 0) * unit.quantity;
    });

    const totalDensity = totalCube > 0 ? totalWeight / totalCube : 0;

    return {
      totalCube: totalCube.toFixed(3),
      totalDensity: totalDensity.toFixed(3),
      totalHandlingUnits,
      totalPieces,
      totalWeight,
    };
  };

  const totals = calculateTotals();
  const totalDensityValue = parseFloat(totals.totalDensity);
  const isDensityValid = totalDensityValue > 2 && totalDensityValue < 4;
  const densityError = !isNaN(totalDensityValue) && totalDensityValue > 0 && !isDensityValid;

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-slate-900">Commodities</h3>
          <Info className="text-blue-500" size={20} />
        </div>
        {isExpanded ? (
          <ChevronUp className="text-slate-600" size={20} />
        ) : (
          <ChevronDown className="text-slate-600" size={20} />
        )}
      </button>
      {isExpanded && (
        <div className="p-6 space-y-6">
          {handlingUnits.length === 0 && (
            <button
              type="button"
              onClick={onAddHandlingUnit}
              className="px-4 py-2 bg-yellow-400 text-slate-900 rounded-lg hover:bg-yellow-500 transition-colors text-sm font-semibold flex items-center gap-2"
            >
              <Plus size={16} />
              ADD HANDLING UNIT
            </button>
          )}
          {handlingUnits.map((unit, index) => (
            <div key={unit.id} className="p-4 border border-slate-200 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-semibold text-slate-900">Handling Unit {index + 1}</h4>
                {handlingUnits.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveHandlingUnit(unit.id)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={unit.doNotStack}
                    onChange={(e) => onUpdateHandlingUnit(unit.id, 'doNotStack', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-slate-700">Do Not Stack</span>
                </label>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">Handling Unit Type</label>
                  <select
                    value={unit.handlingUnitType}
                    onChange={(e) => onUpdateHandlingUnit(unit.id, 'handlingUnitType', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PALLET">PALLET</option>
                    <option value="SKID">SKID</option>
                    <option value="CRATE">CRATE</option>
                    <option value="BOX">BOX</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">Quantity</label>
                  <input
                    type="number"
                    value={unit.quantity}
                    onChange={(e) => onUpdateHandlingUnit(unit.id, 'quantity', parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">L (in)</label>
                  <input
                    type="number"
                    value={unit.length}
                    onChange={(e) => onUpdateHandlingUnit(unit.id, 'length', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">W (in)</label>
                  <input
                    type="number"
                    value={unit.width}
                    onChange={(e) => onUpdateHandlingUnit(unit.id, 'width', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">H (in)</label>
                  <input
                    type="number"
                    value={unit.height}
                    onChange={(e) => onUpdateHandlingUnit(unit.id, 'height', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">Weight (lbs)</label>
                  <input
                    type="number"
                    value={unit.weight}
                    onChange={(e) => onUpdateHandlingUnit(unit.id, 'weight', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">Class</label>
                  <select
                    value={unit.class}
                    onChange={(e) => onUpdateHandlingUnit(unit.id, 'class', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Class</option>
                    <option value="50">50</option>
                    <option value="55">55</option>
                    <option value="60">60</option>
                    <option value="65">65</option>
                    <option value="70">70</option>
                    <option value="77.5">77.5</option>
                    <option value="85">85</option>
                    <option value="92.5">92.5</option>
                    <option value="100">100</option>
                    <option value="110">110</option>
                    <option value="125">125</option>
                    <option value="150">150</option>
                    <option value="175">175</option>
                    <option value="200">200</option>
                    <option value="250">250</option>
                    <option value="300">300</option>
                    <option value="400">400</option>
                    <option value="500">500</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">NMFC</label>
                  <input
                    type="text"
                    value={unit.nmfc}
                    onChange={(e) => onUpdateHandlingUnit(unit.id, 'nmfc', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-900">Sub</label>
                  <input
                    type="text"
                    value={unit.sub}
                    onChange={(e) => onUpdateHandlingUnit(unit.id, 'sub', e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <h5 className="text-sm font-semibold text-slate-900">Pallet Details</h5>
                {unit.items.map((item, itemIndex) => (
                  <div key={item.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h6 className="text-xs font-semibold text-slate-700">Item {itemIndex + 1}</h6>
                      {unit.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onRemoveItemFromUnit(unit.id, item.id)}
                          className="text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-900">Pieces</label>
                        <input
                          type="number"
                          value={item.pieces}
                          onChange={(e) => {
                            const updatedItems = unit.items.map((i) =>
                              i.id === item.id ? { ...i, pieces: parseInt(e.target.value) || 0 } : i
                            );
                            onUpdateHandlingUnit(unit.id, 'items', updatedItems);
                          }}
                          className="w-full px-3 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-900">Piece Type</label>
                        <select
                          value={item.pieceType}
                          onChange={(e) => {
                            const updatedItems = unit.items.map((i) =>
                              i.id === item.id ? { ...i, pieceType: e.target.value } : i
                            );
                            onUpdateHandlingUnit(unit.id, 'items', updatedItems);
                          }}
                          className="w-full px-3 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                          <option value="CARTON">CARTON</option>
                          <option value="BOX">BOX</option>
                          <option value="PALLET">PALLET</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-slate-900">Description</label>
                      <textarea
                        value={item.description}
                        onChange={(e) => {
                          const updatedItems = unit.items.map((i) =>
                            i.id === item.id ? { ...i, description: e.target.value } : i
                          );
                          onUpdateHandlingUnit(unit.id, 'items', updatedItems);
                        }}
                        rows={3}
                        className="w-full px-3 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-y min-h-[80px]"
                        placeholder="Enter description..."
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => onAddItemToUnit(unit.id)}
                  className="px-4 py-2 bg-yellow-400 text-slate-900 rounded-lg hover:bg-yellow-500 transition-colors text-sm font-semibold flex items-center gap-2"
                >
                  <Plus size={16} />
                  ADD ITEM
                </button>
              </div>
            </div>
          ))}
          {handlingUnits.length > 0 && (
            <>
              <button
                type="button"
                onClick={onAddHandlingUnit}
                className="px-4 py-2 bg-yellow-400 text-slate-900 rounded-lg hover:bg-yellow-500 transition-colors text-sm font-semibold flex items-center gap-2"
              >
                <Plus size={16} />
                ADD HANDLING UNIT
              </button>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600">Total Cube:</p>
                    <p className="font-semibold text-slate-900">{totals.totalCube} ft³</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Total Density:</p>
                    <p className={`font-semibold ${densityError ? 'text-red-600' : 'text-blue-600'}`}>
                      {totals.totalDensity} lb/ft³
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-600">Total Handling Units:</p>
                    <p className="font-semibold text-slate-900">{totals.totalHandlingUnits}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Total Pieces:</p>
                    <p className="font-semibold text-slate-900">{totals.totalPieces}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Total Weight:</p>
                    <p className="font-semibold text-slate-900">{totals.totalWeight} lbs</p>
                  </div>
                </div>
                {densityError && (
                  <div className="mt-4">
                    <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3">
                      <p className="text-red-700 text-sm font-bold flex items-center gap-2">
                        <span className="text-red-600 text-lg">⚠️</span>
                        Total Density must be greater than 2 and less than 4 (Current: {totals.totalDensity} lb/ft³)
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

