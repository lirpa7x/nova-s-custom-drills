import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

const STORAGE_KEY = 'nova-programs-json-v1';
const SERVICE_ID = '02f00000-0000-0000-0000-00000000fe00';
const NOTIFY_ID = '02f00000-0000-0000-0000-00000000ff02';
const WRITE_ID = '02f00000-0000-0000-0000-00000000ff01';
const CONTROL = {
  wake: [0x80, 1, 0, 0],
  stop: [0x80, 1, 0, 1],
  pause: [0x80, 1, 0, 2],
  resume: [0x80, 1, 0, 3],
};
const CHALLENGE_SALT = 'Mjgx1jAwXDBaMFcxCz3JBgNVBAYT4kJF7Rkw';
const TEXT_DECODER = new TextDecoder();
const TEXT_ENCODER = new TextEncoder();

const SPEED_OPTIONS = [
  { id: 'blistering', label: 'Blistering', base: 6400 },
  { id: 'fast', label: 'Fast', base: 5600 },
  { id: 'assertive', label: 'Assertive', base: 4800 },
  { id: 'steady', label: 'Steady', base: 4000 },
  { id: 'slow', label: 'Slow', base: 3200 },
  { id: 'feather', label: 'Feather', base: 2400 },
];

const SPIN_OPTIONS = [
  { id: 'heavy-top', label: 'Heavy Topspin', offset: 1800 },
  { id: 'top', label: 'Topspin', offset: 1200 },
  { id: 'light-top', label: 'Light Topspin', offset: 600 },
  { id: 'flat', label: 'Flat', offset: 0 },
  { id: 'back', label: 'Backspin', offset: -1200 },
  { id: 'heavy-back', label: 'Heavy Backspin', offset: -1800 },
];

const HEIGHT_OPTIONS = [
  { id: 'skimmer', label: 'Skimmer', value: -30 },
  { id: 'low', label: 'Low', value: -10 },
  { id: 'medium-low', label: 'Medium-Low', value: 10 },
  { id: 'medium', label: 'Medium', value: 30 },
  { id: 'medium-high', label: 'Medium-High', value: 50 },
  { id: 'high', label: 'High', value: 70 },
];

const PLACEMENT_OPTIONS = [
  { id: 'wide-bh', label: 'Wide BH', value: -8 },
  { id: 'bh', label: 'BH', value: -4 },
  { id: 'middle', label: 'Middle', value: 0 },
  { id: 'fh', label: 'FH', value: 4 },
  { id: 'wide-fh', label: 'Wide FH', value: 8 },
];

const CADENCE_OPTIONS = [
  { id: 'patient', label: 'Patient', value: 0 },
  { id: 'measured', label: 'Measured', value: 20 },
  { id: 'rhythm', label: 'Rhythm', value: 40 },
  { id: 'quick', label: 'Quick', value: 60 },
  { id: 'rapid', label: 'Rapid', value: 80 },
  { id: 'frenzy', label: 'Frenzy', value: 100 },
];

const REPETITION_OPTIONS = [
  { id: 'single', label: '1 ball', value: 1 },
  { id: 'double', label: '2 balls', value: 2 },
  { id: 'triple', label: '3 balls', value: 3 },
  { id: 'quad', label: '4 balls', value: 4 },
  { id: 'six', label: '6 balls', value: 6 },
  { id: 'eight', label: '8 balls', value: 8 },
];

const DEFAULT_OPTION_STATE = {
  speedId: 'assertive',
  spinId: 'flat',
  heightId: 'medium',
  placementId: 'middle',
  cadenceId: 'rhythm',
};

function uid(prefix) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function createOption(overrides = {}) {
  return {
    id: uid('option'),
    ...DEFAULT_OPTION_STATE,
    ...overrides,
  };
}

function createBallStep(overrides = {}) {
  return {
    id: uid('step'),
    type: 'ball',
    repetitions: 1,
    options: [createOption()],
    ...overrides,
  };
}

function createGroupStep(overrides = {}) {
  return {
    id: uid('step'),
    type: 'group',
    repetitions: 1,
    options: [
      createOption({ spinId: 'top', placementId: 'bh' }),
      createOption({ spinId: 'flat', placementId: 'middle' }),
    ],
    ...overrides,
  };
}

function createProgram(name, steps) {
  return {
    id: uid('program'),
    name,
    steps,
  };
}

function createDemoStore() {
  const opener = createBallStep({
    repetitions: 1,
    options: [createOption({ speedId: 'steady', spinId: 'heavy-back', heightId: 'low', placementId: 'middle', cadenceId: 'measured' })],
  });
  const rally = createGroupStep({
    repetitions: 1,
    options: [
      createOption({ speedId: 'fast', spinId: 'top', heightId: 'medium', placementId: 'wide-bh', cadenceId: 'quick' }),
      createOption({ speedId: 'fast', spinId: 'top', heightId: 'medium-high', placementId: 'wide-fh', cadenceId: 'quick' }),
      createOption({ speedId: 'assertive', spinId: 'flat', heightId: 'medium', placementId: 'middle', cadenceId: 'rapid' }),
    ],
  });
  const finisher = createBallStep({
    repetitions: 2,
    options: [createOption({ speedId: 'blistering', spinId: 'heavy-top', heightId: 'medium-high', placementId: 'fh', cadenceId: 'frenzy' })],
  });
  const program = createProgram('Nova Rally Builder', [opener, rally, finisher]);
  return {
    version: 1,
    selectedProgramId: program.id,
    programs: [program],
  };
}

function loadStore() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createDemoStore();
    }
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.programs) || parsed.programs.length === 0) {
      return createDemoStore();
    }
    return parsed;
  } catch (error) {
    console.warn('Failed to load program store, falling back to demo state.', error);
    return createDemoStore();
  }
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function pickById(options, id, fallback = options[0]) {
  return options.find((option) => option.id === id) || fallback;
}

function deriveWheelSpeeds(option) {
  const speed = pickById(SPEED_OPTIONS, option.speedId);
  const spin = pickById(SPIN_OPTIONS, option.spinId);
  const upperWheel = clamp(speed.base + spin.offset, 400, 7500);
  const lowerWheel = clamp(speed.base - spin.offset, 400, 7500);
  return { upperWheel, lowerWheel };
}

function optionToRobotBall(option, repetitions) {
  const height = pickById(HEIGHT_OPTIONS, option.heightId).value;
  const placement = pickById(PLACEMENT_OPTIONS, option.placementId).value;
  const cadence = pickById(CADENCE_OPTIONS, option.cadenceId).value;
  const { upperWheel, lowerWheel } = deriveWheelSpeeds(option);
  return {
    upperWheel,
    lowerWheel,
    height,
    placement,
    cadence,
    repetitions,
  };
}

function createBallPayload(ball) {
  const buffer = new ArrayBuffer(24);
  const view = new DataView(buffer);
  view.setUint32(0, ball.upperWheel, true);
  view.setUint32(4, ball.lowerWheel, true);
  view.setFloat32(8, ((ball.height + 50) / 150) * 50 - 20, true);
  view.setFloat32(12, ((ball.placement + 10) / 20) * 44 - 22, true);
  view.setFloat32(16, ball.cadence / 100 + 0.5, true);
  view.setUint32(20, ball.repetitions, true);
  return new Uint8Array(buffer);
}

function createDrillPayload(step) {
  const bytes = step.ballPayloads.length * 24;
  const buffer = new ArrayBuffer(7 + bytes);
  const view = new DataView(buffer);
  const message = new Uint8Array(buffer);
  view.setUint8(0, 0x81);
  view.setUint16(1, 4 + bytes, true);
  view.setUint8(3, 3);
  view.setUint16(4, 0, true);
  view.setUint8(6, step.random ? 1 : 0);
  step.ballPayloads.forEach((ballPayload, index) => {
    message.set(ballPayload, 7 + index * 24);
  });
  return message;
}

function createChangeDrillPayload(step) {
  const bytes = step.ballPayloads.length * 24;
  const buffer = new ArrayBuffer(3 + bytes);
  const view = new DataView(buffer);
  const message = new Uint8Array(buffer);
  view.setUint8(0, 0x84);
  view.setUint16(1, 1 + bytes, true);
  step.ballPayloads.forEach((ballPayload, index) => {
    message.set(ballPayload, 3 + index * 24);
  });
  return message;
}

function buildSchedule(program) {
  return program.steps.map((step) => ({
    id: step.id,
    random: step.type === 'group',
    repetitions: step.repetitions,
    ballPayloads: step.options.map((option) => createBallPayload(optionToRobotBall(option, step.repetitions))),
    optionCount: step.options.length,
  }));
}

function schedulePreviewText(program) {
  return program.steps
    .map((step) =>
      step.options
        .map((option) => {
          const robotBall = optionToRobotBall(option, step.repetitions);
          return [
            robotBall.upperWheel,
            robotBall.lowerWheel,
            robotBall.height,
            robotBall.placement,
            robotBall.cadence,
            robotBall.repetitions,
          ].join(' ');
        })
        .join(' | ')
    )
    .join('\n');
}

function canChangeDrill(currentStep, nextStep) {
  return currentStep.optionCount === nextStep.optionCount && currentStep.random === nextStep.random;
}

function packetToHex(value) {
  return Array.from(value).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function parseNotification(value) {
  const bytes = new Uint8Array(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
  const view = new DataView(bytes.buffer);
  const op = view.getUint8(1);
  if (op === 7) {
    return {
      type: 'request-challenge',
      serial: TEXT_DECODER.decode(bytes.slice(6, 18)),
      code: TEXT_DECODER.decode(bytes.slice(18)),
      raw: packetToHex(bytes),
    };
  }
  if (op === 2) {
    const statusCode = view.getUint8(4);
    return {
      type: 'device-status',
      statusCode,
      status: ['uninitialized', 'connected', 'initializing', 'free', 'running', 'stopping'][statusCode] || 'unknown',
      raw: packetToHex(bytes),
    };
  }
  if (op === 5) {
    return {
      type: 'drill-status',
      runtime: view.getUint16(4, true),
      drillCount: view.getUint16(6, true),
      ballCount: view.getUint16(8, true),
      ballIdx: view.getUint8(10),
      raw: packetToHex(bytes),
    };
  }
  return {
    type: 'unknown',
    op,
    raw: packetToHex(bytes),
  };
}

function M(d) {
  let result = '';
  const chars = '0123456789ABCDEF';
  for (let index = 0; index < d.length; index += 1) {
    const value = d.charCodeAt(index);
    result += chars.charAt((value >>> 4) & 15) + chars.charAt(value & 15);
  }
  return result;
}

function X(d) {
  const result = Array(d.length >> 2).fill(0);
  for (let index = 0; index < 8 * d.length; index += 8) {
    result[index >> 5] |= (255 & d.charCodeAt(index / 8)) << (index % 32);
  }
  return result;
}

function V(d) {
  let result = '';
  for (let index = 0; index < 32 * d.length; index += 8) {
    result += String.fromCharCode((d[index >> 5] >>> (index % 32)) & 255);
  }
  return result;
}

function safeAdd(x, y) {
  const low = (x & 0xffff) + (y & 0xffff);
  return (((x >> 16) + (y >> 16) + (low >> 16)) << 16) | (low & 0xffff);
}

function bitRol(value, count) {
  return (value << count) | (value >>> (32 - count));
}

function md5Cmn(q, a, b, x, s, t) {
  return safeAdd(bitRol(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
}

function md5Ff(a, b, c, d, x, s, t) {
  return md5Cmn((b & c) | (~b & d), a, b, x, s, t);
}

function md5Gg(a, b, c, d, x, s, t) {
  return md5Cmn((b & d) | (c & ~d), a, b, x, s, t);
}

function md5Hh(a, b, c, d, x, s, t) {
  return md5Cmn(b ^ c ^ d, a, b, x, s, t);
}

function md5Ii(a, b, c, d, x, s, t) {
  return md5Cmn(c ^ (b | ~d), a, b, x, s, t);
}

function Y(d, length) {
  d[length >> 5] |= 128 << (length % 32);
  d[14 + (((length + 64) >>> 9) << 4)] = length;
  let a = 1732584193;
  let b = -271733879;
  let c = -1732584194;
  let dValue = 271733878;
  for (let index = 0; index < d.length; index += 16) {
    const oldA = a;
    const oldB = b;
    const oldC = c;
    const oldD = dValue;
    a = md5Ff(a, b, c, dValue, d[index + 0], 7, -680876936);
    dValue = md5Ff(dValue, a, b, c, d[index + 1], 12, -389564586);
    c = md5Ff(c, dValue, a, b, d[index + 2], 17, 606105819);
    b = md5Ff(b, c, dValue, a, d[index + 3], 22, -1044525330);
    a = md5Ff(a, b, c, dValue, d[index + 4], 7, -176418897);
    dValue = md5Ff(dValue, a, b, c, d[index + 5], 12, 1200080426);
    c = md5Ff(c, dValue, a, b, d[index + 6], 17, -1473231341);
    b = md5Ff(b, c, dValue, a, d[index + 7], 22, -45705983);
    a = md5Ff(a, b, c, dValue, d[index + 8], 7, 1770035416);
    dValue = md5Ff(dValue, a, b, c, d[index + 9], 12, -1958414417);
    c = md5Ff(c, dValue, a, b, d[index + 10], 17, -42063);
    b = md5Ff(b, c, dValue, a, d[index + 11], 22, -1990404162);
    a = md5Ff(a, b, c, dValue, d[index + 12], 7, 1804603682);
    dValue = md5Ff(dValue, a, b, c, d[index + 13], 12, -40341101);
    c = md5Ff(c, dValue, a, b, d[index + 14], 17, -1502002290);
    b = md5Ff(b, c, dValue, a, d[index + 15], 22, 1236535329);

    a = md5Gg(a, b, c, dValue, d[index + 1], 5, -165796510);
    dValue = md5Gg(dValue, a, b, c, d[index + 6], 9, -1069501632);
    c = md5Gg(c, dValue, a, b, d[index + 11], 14, 643717713);
    b = md5Gg(b, c, dValue, a, d[index + 0], 20, -373897302);
    a = md5Gg(a, b, c, dValue, d[index + 5], 5, -701558691);
    dValue = md5Gg(dValue, a, b, c, d[index + 10], 9, 38016083);
    c = md5Gg(c, dValue, a, b, d[index + 15], 14, -660478335);
    b = md5Gg(b, c, dValue, a, d[index + 4], 20, -405537848);
    a = md5Gg(a, b, c, dValue, d[index + 9], 5, 568446438);
    dValue = md5Gg(dValue, a, b, c, d[index + 14], 9, -1019803690);
    c = md5Gg(c, dValue, a, b, d[index + 3], 14, -187363961);
    b = md5Gg(b, c, dValue, a, d[index + 8], 20, 1163531501);
    a = md5Gg(a, b, c, dValue, d[index + 13], 5, -1444681467);
    dValue = md5Gg(dValue, a, b, c, d[index + 2], 9, -51403784);
    c = md5Gg(c, dValue, a, b, d[index + 7], 14, 1735328473);
    b = md5Gg(b, c, dValue, a, d[index + 12], 20, -1926607734);

    a = md5Hh(a, b, c, dValue, d[index + 5], 4, -378558);
    dValue = md5Hh(dValue, a, b, c, d[index + 8], 11, -2022574463);
    c = md5Hh(c, dValue, a, b, d[index + 11], 16, 1839030562);
    b = md5Hh(b, c, dValue, a, d[index + 14], 23, -35309556);
    a = md5Hh(a, b, c, dValue, d[index + 1], 4, -1530992060);
    dValue = md5Hh(dValue, a, b, c, d[index + 4], 11, 1272893353);
    c = md5Hh(c, dValue, a, b, d[index + 7], 16, -155497632);
    b = md5Hh(b, c, dValue, a, d[index + 10], 23, -1094730640);
    a = md5Hh(a, b, c, dValue, d[index + 13], 4, 681279174);
    dValue = md5Hh(dValue, a, b, c, d[index + 0], 11, -358537222);
    c = md5Hh(c, dValue, a, b, d[index + 3], 16, -722521979);
    b = md5Hh(b, c, dValue, a, d[index + 6], 23, 76029189);
    a = md5Hh(a, b, c, dValue, d[index + 9], 4, -640364487);
    dValue = md5Hh(dValue, a, b, c, d[index + 12], 11, -421815835);
    c = md5Hh(c, dValue, a, b, d[index + 15], 16, 530742520);
    b = md5Hh(b, c, dValue, a, d[index + 2], 23, -995338651);

    a = md5Ii(a, b, c, dValue, d[index + 0], 6, -198630844);
    dValue = md5Ii(dValue, a, b, c, d[index + 7], 10, 1126891415);
    c = md5Ii(c, dValue, a, b, d[index + 14], 15, -1416354905);
    b = md5Ii(b, c, dValue, a, d[index + 5], 21, -57434055);
    a = md5Ii(a, b, c, dValue, d[index + 12], 6, 1700485571);
    dValue = md5Ii(dValue, a, b, c, d[index + 3], 10, -1894986606);
    c = md5Ii(c, dValue, a, b, d[index + 10], 15, -1051523);
    b = md5Ii(b, c, dValue, a, d[index + 1], 21, -2054922799);
    a = md5Ii(a, b, c, dValue, d[index + 8], 6, 1873313359);
    dValue = md5Ii(dValue, a, b, c, d[index + 15], 10, -30611744);
    c = md5Ii(c, dValue, a, b, d[index + 6], 15, -1560198380);
    b = md5Ii(b, c, dValue, a, d[index + 13], 21, 1309151649);
    a = md5Ii(a, b, c, dValue, d[index + 4], 6, -145523070);
    dValue = md5Ii(dValue, a, b, c, d[index + 11], 10, -1120210379);
    c = md5Ii(c, dValue, a, b, d[index + 2], 15, 718787259);
    b = md5Ii(b, c, dValue, a, d[index + 9], 21, -343485551);

    a = safeAdd(a, oldA);
    b = safeAdd(b, oldB);
    c = safeAdd(c, oldC);
    dValue = safeAdd(dValue, oldD);
  }
  return [a, b, c, dValue];
}

function md5(input) {
  return M(V(Y(X(input), 8 * input.length))).toLowerCase();
}

function buildChallengeResponse(serial, code) {
  let hashSource = serial;
  for (let index = 0; index < serial.length; index += 1) {
    hashSource += CHALLENGE_SALT.charAt(serial.charCodeAt(index) % 0x24);
  }
  hashSource += code;
  const hash = md5(hashSource);
  const message = new Uint8Array(3 + hash.length);
  message[0] = 0x08;
  message[1] = 0x20;
  message[3] = 0x00;
  message.set(TEXT_ENCODER.encode(hash), 3);
  return message;
}

function optionSummary(option) {
  return [
    pickById(SPIN_OPTIONS, option.spinId).label,
    pickById(PLACEMENT_OPTIONS, option.placementId).label,
    pickById(HEIGHT_OPTIONS, option.heightId).label,
    pickById(CADENCE_OPTIONS, option.cadenceId).label,
    pickById(SPEED_OPTIONS, option.speedId).label,
  ].join(' · ');
}

function stepSummary(step) {
  const lead = optionSummary(step.options[0]);
  if (step.type === 'group') {
    return `${lead} · random from ${step.options.length} options · ${step.repetitions} reps`;
  }
  return `${lead} · ${step.repetitions} reps`;
}

function FieldSelect({ label, value, options, onChange }) {
  return (
    <label className="field-select">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ProgramRow({ active, name, onSelect, onDelete }) {
  return (
    <div className={`program-row ${active ? 'is-active' : ''}`}>
      <button className="program-row__select" type="button" onClick={onSelect}>
        <span>{name}</span>
      </button>
      <button className="ghost-button danger-text" type="button" onClick={onDelete} aria-label={`Delete ${name}`}>
        Delete
      </button>
    </div>
  );
}

function OptionCard({ option, index, group, canMoveDown, onChange, onDelete, onMove }) {
  const wheels = deriveWheelSpeeds(option);
  return (
    <div className="option-card">
      <div className="option-card__header">
        <div>
          <p className="eyebrow">{group ? `Option ${String.fromCharCode(65 + index)}` : 'Ball Setup'}</p>
          <h4>{optionSummary(option)}</h4>
        </div>
        {group ? (
          <div className="mini-actions">
            <button type="button" className="ghost-button" onClick={() => onMove(-1)} disabled={index === 0}>
              ↑
            </button>
            <button type="button" className="ghost-button" onClick={() => onMove(1)} disabled={!canMoveDown}>
              ↓
            </button>
            <button type="button" className="ghost-button danger-text" onClick={onDelete}>
              Remove
            </button>
          </div>
        ) : null}
      </div>
      <div className="option-card__meta">Upper {wheels.upperWheel} rpm · Lower {wheels.lowerWheel} rpm</div>
      <div className="field-grid">
        <FieldSelect label="Speed" value={option.speedId} options={SPEED_OPTIONS} onChange={(value) => onChange({ speedId: value })} />
        <FieldSelect label="Spin" value={option.spinId} options={SPIN_OPTIONS} onChange={(value) => onChange({ spinId: value })} />
        <FieldSelect label="Height" value={option.heightId} options={HEIGHT_OPTIONS} onChange={(value) => onChange({ heightId: value })} />
        <FieldSelect label="Placement" value={option.placementId} options={PLACEMENT_OPTIONS} onChange={(value) => onChange({ placementId: value })} />
        <FieldSelect label="Cadence" value={option.cadenceId} options={CADENCE_OPTIONS} onChange={(value) => onChange({ cadenceId: value })} />
      </div>
    </div>
  );
}

function StepCard({
  step,
  index,
  total,
  isExpanded,
  onToggleExpand,
  onChangeStep,
  onDuplicate,
  onDelete,
  onMove,
  onChangeOption,
  onDeleteOption,
  onMoveOption,
  onAddOption,
  onDragStart,
  onDragOver,
  onDrop,
}) {
  return (
    <article
      className={`step-card ${isExpanded ? 'is-expanded' : 'is-collapsed'}`}
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(event) => onDragOver(event, index)}
      onDrop={() => onDrop(index)}
    >
      <button type="button" className="step-card__summary-button" onClick={onToggleExpand}>
        <span className="step-card__drag-handle" aria-hidden="true">
          ⋮⋮
        </span>
        <span className="step-card__summary-main">
          <span className="eyebrow">Ball {index + 1}</span>
          <strong>{step.type === 'group' ? 'Random Group' : 'Single Ball'}</strong>
          <span className="step-card__summary">{stepSummary(step)}</span>
        </span>
        <span className="step-card__summary-tag">{isExpanded ? 'Editing' : 'Overview'}</span>
      </button>
      {isExpanded ? (
        <>
      <div className="step-card__header">
        <div>
          <p className="eyebrow">Ball {index + 1}</p>
          <h3>{step.type === 'group' ? 'Random Group' : 'Single Ball'}</h3>
          <p className="step-card__summary">Expand one ball at a time to edit the full setup.</p>
        </div>
        <div className="step-card__actions">
          <button type="button" className="ghost-button" onClick={() => onMove(-1)} disabled={index === 0}>
            Move Up
          </button>
          <button type="button" className="ghost-button" onClick={() => onMove(1)} disabled={index === total - 1}>
            Move Down
          </button>
          <button type="button" className="ghost-button" onClick={onDuplicate}>
            Duplicate
          </button>
          <button type="button" className="ghost-button danger-text" onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>
      <div className="step-card__toolbar">
        <FieldSelect label="Repetitions" value={String(step.repetitions)} options={REPETITION_OPTIONS.map((option) => ({ ...option, id: String(option.value) }))} onChange={(value) => onChangeStep({ repetitions: Number(value) })} />
        <div className="pill-group">
          <button type="button" className={`pill-button ${step.type === 'ball' ? 'is-active' : ''}`} onClick={() => onChangeStep({ type: 'ball', options: [step.options[0]] })}>
            Single Ball
          </button>
          <button
            type="button"
            className={`pill-button ${step.type === 'group' ? 'is-active' : ''}`}
            onClick={() =>
              onChangeStep({
                type: 'group',
                options: step.options,
              })
            }
          >
            Random Group
          </button>
        </div>
      </div>
      <div className="step-card__options">
        {step.options.map((option, optionIndex) => (
          <OptionCard
            key={option.id}
            option={option}
            index={optionIndex}
            group={step.type === 'group'}
            canMoveDown={optionIndex < step.options.length - 1}
            onChange={(patch) => onChangeOption(optionIndex, patch)}
            onDelete={() => onDeleteOption(optionIndex)}
            onMove={(direction) => onMoveOption(optionIndex, direction)}
          />
        ))}
      </div>
      {step.type === 'group' ? (
        <button type="button" className="secondary-button" onClick={onAddOption}>
          Add Random Option
        </button>
      ) : null}
        </>
      ) : (
        <div className="step-card__collapsed-footer">
          <div className="step-card__chips">
            <span>{step.type === 'group' ? `${step.options.length} options` : '1 option'}</span>
            <span>{step.repetitions} reps</span>
          </div>
          <div className="step-card__actions">
            <button type="button" className="ghost-button" onClick={() => onMove(-1)} disabled={index === 0}>
              ↑
            </button>
            <button type="button" className="ghost-button" onClick={() => onMove(1)} disabled={index === total - 1}>
              ↓
            </button>
            <button type="button" className="ghost-button" onClick={onDuplicate}>
              Duplicate
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function useNovaBotController() {
  const [stage, setStage] = useState('disconnected');
  const [statusText, setStatusText] = useState('Disconnected');
  const [deviceName, setDeviceName] = useState('No bot connected');
  const [lastError, setLastError] = useState('');
  const [counters, setCounters] = useState({ stepBalls: 0, overallBalls: 0 });
  const deviceRef = useRef(null);
  const notifyRef = useRef(null);
  const writeRef = useRef(null);
  const listenerRef = useRef(null);
  const queueTailRef = useRef(Promise.resolve());
  const protocolStageRef = useRef('disconnected');
  const scheduleRef = useRef([]);
  const currentStepIndexRef = useRef(0);
  const currentStepBallsRef = useRef(0);
  const lastBallIdxRef = useRef(null);
  const restartPendingRef = useRef(false);

  function clearRunTracking() {
    scheduleRef.current = [];
    currentStepIndexRef.current = 0;
    currentStepBallsRef.current = 0;
    lastBallIdxRef.current = null;
    restartPendingRef.current = false;
    setCounters({ stepBalls: 0, overallBalls: 0 });
  }

  function applyStage(nextStage) {
    protocolStageRef.current = nextStage;
    setStage(nextStage);
    const labels = {
      disconnected: 'Disconnected',
      connecting: 'Connecting',
      initial: 'Authorizing',
      'connected-1': 'Authorizing',
      'connected-2': 'Authorizing',
      'connected-3': 'Waking Bot',
      'connected-3a': 'Waking Bot',
      'connected-3b': 'Waking Bot',
      standby: 'Ready',
      shooting: 'Running',
      pause: 'Paused',
      'shooting-restart': 'Loading Next Ball',
      'stop-requested': 'Stopping',
    };
    setStatusText(labels[nextStage] || nextStage);
  }

  function queueWrite(payload, nextStage) {
    const normalized = payload instanceof Uint8Array ? payload : Uint8Array.from(payload);
    const chain = queueTailRef.current
      .catch(() => null)
      .then(async () => {
        if (!writeRef.current) {
          throw new Error('Write characteristic is not ready.');
        }
        await writeRef.current.writeValue(normalized);
        applyStage(nextStage);
      })
      .catch((error) => {
        console.error(error);
        setLastError(error.message || String(error));
        throw error;
      });
    queueTailRef.current = chain.catch(() => null);
    return chain;
  }

  function handleDrillStatus(packet) {
    if (packet.ballIdx === lastBallIdxRef.current) {
      return;
    }
    lastBallIdxRef.current = packet.ballIdx;
    const schedule = scheduleRef.current;
    if (!schedule.length) {
      return;
    }
    const currentStep = schedule[currentStepIndexRef.current];
    currentStepBallsRef.current += 1;
    setCounters((previous) => ({ stepBalls: currentStepBallsRef.current, overallBalls: previous.overallBalls + 1 }));
    if (currentStepBallsRef.current < currentStep.repetitions) {
      return;
    }
    const nextIndex = (currentStepIndexRef.current + 1) % schedule.length;
    const nextStep = schedule[nextIndex];
    currentStepIndexRef.current = nextIndex;
    currentStepBallsRef.current = 0;
    if (canChangeDrill(currentStep, nextStep)) {
      queueWrite(createChangeDrillPayload(nextStep), 'shooting').catch(() => null);
    } else {
      restartPendingRef.current = true;
      queueWrite(CONTROL.stop, 'shooting-restart').catch(() => null);
    }
  }

  function handleNotification(event) {
    const packet = parseNotification(event.target.value);
    switch (protocolStageRef.current) {
      case 'initial':
        if (packet.type === 'request-challenge') {
          queueWrite(buildChallengeResponse(packet.serial, packet.code), 'connected-1').catch(() => null);
        }
        break;
      case 'connected-1':
        queueWrite([1, 0, 0], 'connected-2').catch(() => null);
        break;
      case 'connected-2':
        queueWrite([2, 0, 0], 'connected-3').catch(() => null);
        break;
      case 'connected-3':
        queueWrite(CONTROL.wake, 'connected-3a').catch(() => null);
        break;
      case 'connected-3a':
        applyStage('connected-3b');
        break;
      case 'connected-3b':
        applyStage('standby');
        break;
      case 'shooting-restart':
        if (packet.type === 'device-status' && packet.status === 'free' && restartPendingRef.current) {
          const schedule = scheduleRef.current;
          if (schedule.length) {
            restartPendingRef.current = false;
            lastBallIdxRef.current = null;
            queueWrite(createDrillPayload(schedule[currentStepIndexRef.current]), 'shooting').catch(() => null);
          }
        }
        break;
      case 'stop-requested':
        if (packet.type === 'device-status' && (packet.status === 'free' || packet.status === 'stopping')) {
          clearRunTracking();
          applyStage('standby');
        }
        break;
      case 'shooting':
        if (packet.type === 'device-status' && packet.status === 'stopping') {
          clearRunTracking();
          applyStage('standby');
          return;
        }
        if (packet.type === 'drill-status') {
          handleDrillStatus(packet);
        }
        break;
      default:
        break;
    }
  }

  async function connect() {
    if (!navigator.bluetooth) {
      setLastError('Web Bluetooth is not available in this browser.');
      return;
    }
    try {
      setLastError('');
      applyStage('connecting');
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [0xfeff] }],
        optionalServices: [SERVICE_ID],
      });
      deviceRef.current = device;
      setDeviceName(device.name || 'Nova Bot');
      device.addEventListener('gattserverdisconnected', () => {
        if (notifyRef.current && listenerRef.current) {
          notifyRef.current.removeEventListener('characteristicvaluechanged', listenerRef.current);
        }
        clearRunTracking();
        notifyRef.current = null;
        writeRef.current = null;
        listenerRef.current = null;
        setDeviceName('No bot connected');
        applyStage('disconnected');
      });
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(SERVICE_ID);
      const characteristics = await service.getCharacteristics();
      notifyRef.current = characteristics.find((characteristic) => characteristic.uuid === NOTIFY_ID);
      writeRef.current = characteristics.find((characteristic) => characteristic.uuid === WRITE_ID);
      if (!notifyRef.current || !writeRef.current) {
        throw new Error('Could not find Nova bot characteristics.');
      }
      await notifyRef.current.startNotifications();
      listenerRef.current = handleNotification;
      notifyRef.current.addEventListener('characteristicvaluechanged', listenerRef.current);
      queueTailRef.current = Promise.resolve();
      await queueWrite([0x07, 0, 0, 0], 'initial');
    } catch (error) {
      console.error(error);
      setLastError(error.message || String(error));
      applyStage('disconnected');
    }
  }

  function disconnect() {
    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect();
    } else {
      applyStage('disconnected');
    }
  }

  function runProgram(program) {
    if (protocolStageRef.current !== 'standby') {
      return;
    }
    const schedule = buildSchedule(program);
    if (!schedule.length) {
      setLastError('Add at least one ball before running the program.');
      return;
    }
    setLastError('');
    clearRunTracking();
    scheduleRef.current = schedule;
    queueWrite(createDrillPayload(schedule[0]), 'shooting').catch(() => null);
  }

  function pauseProgram() {
    if (protocolStageRef.current === 'shooting') {
      queueWrite(CONTROL.pause, 'pause').catch(() => null);
    }
  }

  function resumeProgram() {
    if (protocolStageRef.current === 'pause') {
      queueWrite(CONTROL.resume, 'shooting').catch(() => null);
    }
  }

  function stopProgram() {
    if (['shooting', 'pause', 'shooting-restart'].includes(protocolStageRef.current)) {
      restartPendingRef.current = false;
      queueWrite(CONTROL.stop, 'stop-requested').catch(() => null);
    }
  }

  return {
    stage,
    statusText,
    deviceName,
    lastError,
    counters,
    connect,
    disconnect,
    runProgram,
    pauseProgram,
    resumeProgram,
    stopProgram,
  };
}

function App() {
  const [store, setStore] = useState(() => loadStore());
  const [expandedStepId, setExpandedStepId] = useState(null);
  const dragStepIndexRef = useRef(null);
  const bot = useNovaBotController();

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }, [store]);

  const selectedProgram = useMemo(
    () => store.programs.find((program) => program.id === store.selectedProgramId) || store.programs[0],
    [store]
  );

  useEffect(() => {
    if (!selectedProgram && store.programs[0]) {
      setStore((previous) => ({ ...previous, selectedProgramId: previous.programs[0].id }));
    }
  }, [selectedProgram, store.programs]);

  function updateSelectedProgram(transform) {
    setStore((previous) => ({
      ...previous,
      programs: previous.programs.map((program) => (program.id === previous.selectedProgramId ? transform(deepClone(program)) : program)),
    }));
  }

  function addProgram() {
    const program = createProgram(`Program ${store.programs.length + 1}`, [createBallStep()]);
    setStore((previous) => ({
      ...previous,
      selectedProgramId: program.id,
      programs: [...previous.programs, program],
    }));
    setExpandedStepId(null);
  }

  function duplicateProgram() {
    const copy = deepClone(selectedProgram);
    copy.id = uid('program');
    copy.name = `${selectedProgram.name} Copy`;
    copy.steps = copy.steps.map((step) => ({
      ...step,
      id: uid('step'),
      options: step.options.map((option) => ({ ...option, id: uid('option') })),
    }));
    setStore((previous) => ({
      ...previous,
      selectedProgramId: copy.id,
      programs: [...previous.programs, copy],
    }));
    setExpandedStepId(null);
  }

  function deleteProgram(programId) {
    setStore((previous) => {
      const remaining = previous.programs.filter((program) => program.id !== programId);
      if (!remaining.length) {
        const demo = createDemoStore();
        setExpandedStepId(null);
        return demo;
      }
      if (previous.selectedProgramId === programId) {
        setExpandedStepId(null);
      }
      return {
        ...previous,
        selectedProgramId: previous.selectedProgramId === programId ? remaining[0].id : previous.selectedProgramId,
        programs: remaining,
      };
    });
  }

  function updateProgramName(name) {
    updateSelectedProgram((program) => ({ ...program, name }));
  }

  function updateStep(stepIndex, patch) {
    updateSelectedProgram((program) => {
      program.steps[stepIndex] = { ...program.steps[stepIndex], ...patch };
      return program;
    });
  }

  function updateOption(stepIndex, optionIndex, patch) {
    updateSelectedProgram((program) => {
      program.steps[stepIndex].options[optionIndex] = { ...program.steps[stepIndex].options[optionIndex], ...patch };
      return program;
    });
  }

  function moveItem(items, fromIndex, toIndex) {
    if (toIndex < 0 || toIndex >= items.length) {
      return items;
    }
    const next = [...items];
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    return next;
  }

  function addStep(type) {
    const nextStep = type === 'group' ? createGroupStep() : createBallStep();
    updateSelectedProgram((program) => ({
      ...program,
      steps: [...program.steps, nextStep],
    }));
    setExpandedStepId(nextStep.id);
  }

  function duplicateStep(stepIndex) {
    updateSelectedProgram((program) => {
      const source = deepClone(program.steps[stepIndex]);
      source.id = uid('step');
      source.options = source.options.map((option) => ({ ...option, id: uid('option') }));
      program.steps.splice(stepIndex + 1, 0, source);
      setExpandedStepId(source.id);
      return program;
    });
  }

  function deleteStep(stepIndex) {
    updateSelectedProgram((program) => {
      if (program.steps.length === 1) {
        const replacement = createBallStep();
        program.steps = [replacement];
        setExpandedStepId(replacement.id);
      } else {
        const removedStep = program.steps[stepIndex];
        program.steps.splice(stepIndex, 1);
        if (removedStep.id === expandedStepId) {
          const fallback = program.steps[Math.max(0, stepIndex - 1)] || program.steps[0];
          setExpandedStepId(fallback?.id || null);
        }
      }
      return program;
    });
  }

  function moveStep(stepIndex, direction) {
    updateSelectedProgram((program) => ({
      ...program,
      steps: moveItem(program.steps, stepIndex, stepIndex + direction),
    }));
  }

  function reorderStep(fromIndex, toIndex) {
    if (fromIndex === toIndex || fromIndex == null || toIndex == null) {
      return;
    }
    updateSelectedProgram((program) => ({
      ...program,
      steps: moveItem(program.steps, fromIndex, toIndex),
    }));
  }

  function addOption(stepIndex) {
    updateSelectedProgram((program) => {
      program.steps[stepIndex].options.push(createOption({ placementId: 'fh', spinId: 'top' }));
      return program;
    });
  }

  function deleteOption(stepIndex, optionIndex) {
    updateSelectedProgram((program) => {
      const step = program.steps[stepIndex];
      step.options.splice(optionIndex, 1);
      if (step.options.length <= 1) {
        step.type = 'ball';
      }
      if (!step.options.length) {
        step.options = [createOption()];
      }
      return program;
    });
  }

  function moveOption(stepIndex, optionIndex, direction) {
    updateSelectedProgram((program) => {
      const step = program.steps[stepIndex];
      step.options = moveItem(step.options, optionIndex, optionIndex + direction);
      return program;
    });
  }

  const legacyPreview = selectedProgram ? schedulePreviewText(selectedProgram) : '';

  return (
    <div className="shell">
      <aside className="sidebar panel">
        <div className="panel-head">
          <p className="eyebrow">Programs</p>
          <h2>Nova Library</h2>
        </div>
        <p className="muted">Programs are stored locally as JSON in your browser.</p>
        <div className="stacked-actions">
          <button type="button" className="primary-button" onClick={addProgram}>New Program</button>
        </div>
        <div className="program-list">
          {store.programs.map((program) => (
            <ProgramRow
              key={program.id}
              active={program.id === store.selectedProgramId}
              name={program.name}
              onSelect={() => {
                setExpandedStepId(null);
                setStore((previous) => ({ ...previous, selectedProgramId: program.id }));
              }}
              onDelete={() => deleteProgram(program.id)}
            />
          ))}
        </div>
        <div className="sidebar-footer-actions">
          <button type="button" className="secondary-button" onClick={duplicateProgram} disabled={!selectedProgram}>Duplicate Program</button>
        </div>
      </aside>

      <main className="editor panel">
        {selectedProgram ? (
          <>
            <div className="panel-head panel-head--editor">
              <div>
                <p className="eyebrow">Program Editor</p>
                <input
                  className="program-name-input"
                  value={selectedProgram.name}
                  onChange={(event) => updateProgramName(event.target.value)}
                  placeholder="Program name"
                />
              </div>
              <div className="summary-chip">{selectedProgram.steps.length} balls in order</div>
            </div>
            <div className="step-list">
              {selectedProgram.steps.map((step, stepIndex) => (
                <StepCard
                  key={step.id}
                  step={step}
                  index={stepIndex}
                  total={selectedProgram.steps.length}
                  isExpanded={step.id === expandedStepId}
                  onToggleExpand={() => setExpandedStepId((current) => (current === step.id ? null : step.id))}
                  onChangeStep={(patch) => updateStep(stepIndex, patch)}
                  onDuplicate={() => duplicateStep(stepIndex)}
                  onDelete={() => deleteStep(stepIndex)}
                  onMove={(direction) => moveStep(stepIndex, direction)}
                  onChangeOption={(optionIndex, patch) => updateOption(stepIndex, optionIndex, patch)}
                  onDeleteOption={(optionIndex) => deleteOption(stepIndex, optionIndex)}
                  onMoveOption={(optionIndex, direction) => moveOption(stepIndex, optionIndex, direction)}
                  onAddOption={() => addOption(stepIndex)}
                  onDragStart={(dragIndex) => {
                    dragStepIndexRef.current = dragIndex;
                  }}
                  onDragOver={(event) => {
                    event.preventDefault();
                  }}
                  onDrop={(dropIndex) => {
                    reorderStep(dragStepIndexRef.current, dropIndex);
                    dragStepIndexRef.current = null;
                  }}
                />
              ))}
            </div>
            <div className="composer-actions">
              <button type="button" className="primary-button" onClick={() => addStep('ball')}>Add Ball</button>
              <button type="button" className="secondary-button" onClick={() => addStep('group')}>Add Random Group</button>
            </div>
          </>
        ) : null}
      </main>

      <section className="cockpit panel">
        <div className="panel-head">
          <p className="eyebrow">Robot Control</p>
          <h2>Nova Cockpit</h2>
        </div>
        <div className="status-card">
          <div>
            <div className={`status-pill status-pill--${bot.stage}`}>{bot.statusText}</div>
            <h3>{bot.deviceName}</h3>
            <p className="muted">Bluetooth only. Load once, then the page can keep running without internet.</p>
          </div>
          <div className="stacked-actions">
            {bot.stage === 'disconnected' ? (
              <button type="button" className="primary-button" onClick={bot.connect}>Connect to Bot</button>
            ) : (
              <button type="button" className="secondary-button" onClick={bot.disconnect}>Disconnect</button>
            )}
          </div>
        </div>
        <div className="control-grid">
          <button type="button" className="primary-button" onClick={() => bot.runProgram(selectedProgram)} disabled={bot.stage !== 'standby' || !selectedProgram}>Run Program</button>
          <button type="button" className="secondary-button" onClick={bot.pauseProgram} disabled={bot.stage !== 'shooting'}>Pause</button>
          <button type="button" className="secondary-button" onClick={bot.resumeProgram} disabled={bot.stage !== 'pause'}>Resume</button>
          <button type="button" className="danger-button" onClick={bot.stopProgram} disabled={!['shooting', 'pause', 'shooting-restart'].includes(bot.stage)}>Stop</button>
        </div>
        <div className="stats-grid">
          <div>
            <span>Current Step</span>
            <strong>{bot.counters.stepBalls}</strong>
          </div>
          <div>
            <span>Overall Balls</span>
            <strong>{bot.counters.overallBalls}</strong>
          </div>
        </div>
        {bot.lastError ? <div className="error-banner">{bot.lastError}</div> : null}
        <div className="preview-card">
          <div className="preview-card__head">
            <p className="eyebrow">Legacy Preview</p>
            <span>{selectedProgram?.steps.length || 0} lines</span>
          </div>
          <pre>{legacyPreview}</pre>
        </div>
      </section>
    </div>
  );
}

createRoot(document.getElementById('app')).render(<App />);
