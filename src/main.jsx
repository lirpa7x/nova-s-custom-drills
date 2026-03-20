import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BUILD_DIRTY,
  BUILD_GIT_HASH,
  BUILD_ID,
  BUILD_LABEL,
  BUILD_SOURCE_HASH,
  BUILD_TIME,
} from 'virtual:build-meta';

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
const DEBUG_NAMESPACE = 'nova-debug';

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
  { id: 'single', label: '1x', value: 1 },
  { id: 'double', label: '2x', value: 2 },
  { id: 'triple', label: '3x', value: 3 },
  { id: 'quad', label: '4x', value: 4 },
  { id: 'six', label: '6x', value: 6 },
  { id: 'eight', label: '8x', value: 8 },
];

const WHEEL_MIN = 400;
const WHEEL_MAX = 7500;
const WHEEL_STEP = 50;
const HEIGHT_MIN = -50;
const HEIGHT_MAX = 100;
const HEIGHT_STEP = 1;
const PLACEMENT_MIN = -10;
const PLACEMENT_MAX = 10;
const PLACEMENT_STEP = 0.5;
const CADENCE_MIN = 0;
const CADENCE_MAX = 100;
const CADENCE_STEP = 1;

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

function roundToStep(value, step) {
  const precision = String(step).includes('.') ? String(step).split('.')[1].length : 0;
  return Number((Math.round(value / step) * step).toFixed(precision));
}

function snapToRange(value, min, max, step) {
  return clamp(roundToStep(value, step), min, max);
}

function snapWheelSpeed(value) {
  return clamp(Math.round(value / WHEEL_STEP) * WHEEL_STEP, WHEEL_MIN, WHEEL_MAX);
}

function pickClosestOption(options, target, valueKey) {
  return options.reduce((closest, option) => {
    if (!closest) {
      return option;
    }
    return Math.abs(option[valueKey] - target) < Math.abs(closest[valueKey] - target) ? option : closest;
  }, null);
}

function derivePresetWheelSpeeds(option) {
  const speed = pickById(SPEED_OPTIONS, option.speedId);
  const spin = pickById(SPIN_OPTIONS, option.spinId);
  return {
    upperWheel: clamp(speed.base + spin.offset, WHEEL_MIN, WHEEL_MAX),
    lowerWheel: clamp(speed.base - spin.offset, WHEEL_MIN, WHEEL_MAX),
  };
}

function deriveOptionWheelProfile(option) {
  const presetWheels = derivePresetWheelSpeeds(option);
  const rawUpperWheel = Number(option.upperWheel);
  const rawLowerWheel = Number(option.lowerWheel);
  const upperWheel = Number.isFinite(rawUpperWheel) ? snapWheelSpeed(rawUpperWheel) : presetWheels.upperWheel;
  const lowerWheel = Number.isFinite(rawLowerWheel) ? snapWheelSpeed(rawLowerWheel) : presetWheels.lowerWheel;
  const speed = pickClosestOption(SPEED_OPTIONS, (upperWheel + lowerWheel) / 2, 'base');
  const spin = pickClosestOption(SPIN_OPTIONS, (upperWheel - lowerWheel) / 2, 'offset');
  return { upperWheel, lowerWheel, speed, spin };
}

function deriveInterpretedOptionValue(option, key, fallbackId, options, min, max, step) {
  const rawValue = Number(option[key]);
  if (Number.isFinite(rawValue)) {
    return snapToRange(rawValue, min, max, step);
  }
  return pickById(options, option[fallbackId], pickById(options, DEFAULT_OPTION_STATE[fallbackId])).value;
}

function syncOptionState(option) {
  const { upperWheel, lowerWheel, speed, spin } = deriveOptionWheelProfile(option);
  const height = deriveInterpretedOptionValue(option, 'height', 'heightId', HEIGHT_OPTIONS, HEIGHT_MIN, HEIGHT_MAX, HEIGHT_STEP);
  const placement = deriveInterpretedOptionValue(option, 'placement', 'placementId', PLACEMENT_OPTIONS, PLACEMENT_MIN, PLACEMENT_MAX, PLACEMENT_STEP);
  const cadence = deriveInterpretedOptionValue(option, 'cadence', 'cadenceId', CADENCE_OPTIONS, CADENCE_MIN, CADENCE_MAX, CADENCE_STEP);
  const heightPreset = pickClosestOption(HEIGHT_OPTIONS, height, 'value');
  const placementPreset = pickClosestOption(PLACEMENT_OPTIONS, placement, 'value');
  const cadencePreset = pickClosestOption(CADENCE_OPTIONS, cadence, 'value');
  return {
    ...option,
    upperWheel,
    lowerWheel,
    speedId: speed.id,
    spinId: spin.id,
    height,
    placement,
    cadence,
    heightId: heightPreset.id,
    placementId: placementPreset.id,
    cadenceId: cadencePreset.id,
  };
}

function buildOptionPatch(option, patch) {
  const next = syncOptionState({ ...option, ...patch });
  return {
    upperWheel: next.upperWheel,
    lowerWheel: next.lowerWheel,
    speedId: next.speedId,
    spinId: next.spinId,
    height: next.height,
    placement: next.placement,
    cadence: next.cadence,
    heightId: next.heightId,
    placementId: next.placementId,
    cadenceId: next.cadenceId,
  };
}

function buildWheelPatch(option, patch) {
  return buildOptionPatch(option, patch);
}

function createOption(overrides = {}) {
  return syncOptionState({
    id: uid('option'),
    ...DEFAULT_OPTION_STATE,
    ...overrides,
  });
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

function createProgram(name, steps, overrides = {}) {
  return {
    id: uid('program'),
    name,
    randomized: false,
    steps,
    ...overrides,
  };
}

function createDemoStore() {
  const opener = createBallStep({
    repetitions: 1,
    options: [createOption({ speedId: 'steady', spinId: 'heavy-back', heightId: 'low', placementId: 'middle', cadenceId: 'measured' })],
  });
  const rallyBackhand = createBallStep({
    repetitions: 1,
    options: [createOption({ speedId: 'fast', spinId: 'top', heightId: 'medium', placementId: 'wide-bh', cadenceId: 'quick' })],
  });
  const rallyForehand = createBallStep({
    repetitions: 1,
    options: [createOption({ speedId: 'fast', spinId: 'top', heightId: 'medium-high', placementId: 'wide-fh', cadenceId: 'quick' })],
  });
  const rallyMiddle = createBallStep({
    repetitions: 1,
    options: [createOption({ speedId: 'assertive', spinId: 'flat', heightId: 'medium', placementId: 'middle', cadenceId: 'rapid' })],
  });
  const finisher = createBallStep({
    repetitions: 2,
    options: [createOption({ speedId: 'blistering', spinId: 'heavy-top', heightId: 'medium-high', placementId: 'fh', cadenceId: 'frenzy' })],
  });
  const program = createProgram('Nova Rally Builder', [opener, rallyBackhand, rallyForehand, rallyMiddle, finisher]);
  return {
    version: 1,
    selectedProgramId: program.id,
    programs: [program],
  };
}

function normalizeStoredOption(option) {
  return syncOptionState({
    id: option?.id || uid('option'),
    ...DEFAULT_OPTION_STATE,
    ...option,
  });
}

function normalizeStepRepetitions(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 1;
}

function normalizeStoredStep(step) {
  const repetitions = normalizeStepRepetitions(step?.repetitions);
  const rawOptions = Array.isArray(step?.options) && step.options.length ? step.options : [createOption()];
  const options = rawOptions.map((option) => normalizeStoredOption(option));
  if (step?.type === 'group' || options.length > 1) {
    return options.map((option, index) =>
      createBallStep({
        id: index === 0 && step?.id ? step.id : uid('step'),
        repetitions,
        options: [option],
      })
    );
  }
  return [
    createBallStep({
      id: step?.id || uid('step'),
      repetitions,
      options: [options[0]],
    }),
  ];
}

function normalizeStoredProgram(program) {
  const rawSteps = Array.isArray(program?.steps) ? program.steps : [];
  const migratedFromGroups = rawSteps.some((step) => step?.type === 'group' || (Array.isArray(step?.options) && step.options.length > 1));
  const steps = rawSteps.flatMap((step) => normalizeStoredStep(step));
  return createProgram(program?.name || 'Program', steps.length ? steps : [createBallStep()], {
    id: program?.id || uid('program'),
    randomized: typeof program?.randomized === 'boolean' ? program.randomized : migratedFromGroups,
  });
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
    return {
      ...parsed,
      programs: parsed.programs.map((program) => normalizeStoredProgram(program)),
    };
  } catch (error) {
    console.warn('Failed to load program store, falling back to demo state.', error);
    return createDemoStore();
  }
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
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

function pickById(options, id, fallback = options[0]) {
  return options.find((option) => option.id === id) || fallback;
}

function deriveWheelSpeeds(option) {
  const { upperWheel, lowerWheel } = deriveOptionWheelProfile(option);
  return { upperWheel, lowerWheel };
}

function getOptionValue(option, key, fallbackId, options, min, max, step) {
  return deriveInterpretedOptionValue(option, key, fallbackId, options, min, max, step);
}

function formatNumericValue(value, step, suffix = '') {
  const precision = String(step).includes('.') ? String(step).split('.')[1].length : 0;
  return `${Number(value).toFixed(precision)}${suffix}`;
}

function formatInterpretedOptionLabel(options, value, step, suffix = '') {
  const preset = pickClosestOption(options, value, 'value');
  const formattedValue = formatNumericValue(value, step, suffix);
  return Math.abs(preset.value - value) < 0.001 ? `${preset.label} (${formattedValue})` : `${preset.label} · ${formattedValue}`;
}

function formatInterpretedOptionSummary(options, value) {
  return pickClosestOption(options, value, 'value').label;
}

function optionToRobotBall(option, repetitions) {
  const height = getOptionValue(option, 'height', 'heightId', HEIGHT_OPTIONS, HEIGHT_MIN, HEIGHT_MAX, HEIGHT_STEP);
  const placement = getOptionValue(option, 'placement', 'placementId', PLACEMENT_OPTIONS, PLACEMENT_MIN, PLACEMENT_MAX, PLACEMENT_STEP);
  const cadence = getOptionValue(option, 'cadence', 'cadenceId', CADENCE_OPTIONS, CADENCE_MIN, CADENCE_MAX, CADENCE_STEP);
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

function createDrillPayload(step, overrides = {}) {
  const combinationCount = overrides.combinationCount ?? (step.random ? 0 : 3);
  const minutes = overrides.minutes ?? (step.random ? 10 : 0);
  const bytes = step.ballPayloads.length * 24;
  const buffer = new ArrayBuffer(7 + bytes);
  const view = new DataView(buffer);
  const message = new Uint8Array(buffer);
  view.setUint8(0, 0x81);
  view.setUint16(1, 4 + bytes, true);
  view.setUint8(3, combinationCount);
  view.setUint16(4, minutes, true);
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

function buildScheduledStep(step, overrides = {}) {
  const repetitions = overrides.repetitions ?? step.repetitions;
  const cadence = overrides.cadence;
  const random = overrides.random ?? false;
  return {
    id: step.id,
    random,
    repetitions,
    ballPayloads: step.options.map((option) => {
      const robotBall = optionToRobotBall(option, repetitions);
      if (cadence != null) {
        robotBall.cadence = cadence;
      }
      return createBallPayload(robotBall);
    }),
    optionCount: step.options.length,
  };
}

function buildSchedule(program) {
  return program.steps.map((step) => buildScheduledStep(step, { random: false }));
}

function canPackProgram(program) {
  return program.steps.length >= 1 && program.steps.length <= 9 && program.steps.every((step) => step.options.length === 1);
}

function buildPackedProgramRun(program) {
  if (!canPackProgram(program)) {
    return null;
  }
  const stepRepetitions = program.steps.map((step) => step.repetitions);
  const totalShotsPerCycle = stepRepetitions.reduce((sum, repetitions) => sum + repetitions, 0);
  return {
    drill: {
      id: `packed-${program.id}`,
      random: Boolean(program.randomized),
      repetitions: totalShotsPerCycle,
      ballPayloads: program.steps.map((step) => createBallPayload(optionToRobotBall(step.options[0], step.repetitions))),
      optionCount: program.steps.length,
    },
    randomized: Boolean(program.randomized),
    stepRepetitions: program.randomized ? [] : stepRepetitions,
  };
}

function derivePackedStepState(stepRepetitions, ballCount) {
  const totalShotsPerCycle = stepRepetitions.reduce((sum, repetitions) => sum + repetitions, 0);
  if (totalShotsPerCycle <= 0 || ballCount <= 0) {
    return { stepIndex: 0, stepBallCount: 0 };
  }
  let remaining = (ballCount - 1) % totalShotsPerCycle;
  for (let stepIndex = 0; stepIndex < stepRepetitions.length; stepIndex += 1) {
    const repetitions = stepRepetitions[stepIndex];
    if (remaining < repetitions) {
      return {
        stepIndex,
        stepBallCount: remaining + 1,
      };
    }
    remaining -= repetitions;
  }
  return {
    stepIndex: stepRepetitions.length - 1,
    stepBallCount: stepRepetitions[stepRepetitions.length - 1],
  };
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

function debugLog(event, details = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${DEBUG_NAMESPACE}] ${event}`, {
    buildId: BUILD_ID,
    timestamp,
    ...details,
  });
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
  const { speed, spin } = deriveOptionWheelProfile(option);
  const height = getOptionValue(option, 'height', 'heightId', HEIGHT_OPTIONS, HEIGHT_MIN, HEIGHT_MAX, HEIGHT_STEP);
  const placement = getOptionValue(option, 'placement', 'placementId', PLACEMENT_OPTIONS, PLACEMENT_MIN, PLACEMENT_MAX, PLACEMENT_STEP);
  const cadence = getOptionValue(option, 'cadence', 'cadenceId', CADENCE_OPTIONS, CADENCE_MIN, CADENCE_MAX, CADENCE_STEP);
  return [
    spin.label,
    formatInterpretedOptionSummary(PLACEMENT_OPTIONS, placement),
    formatInterpretedOptionSummary(HEIGHT_OPTIONS, height),
    formatInterpretedOptionSummary(CADENCE_OPTIONS, cadence),
    speed.label,
  ].join(' · ');
}

function programSummary(program) {
  if (!program?.steps?.length) {
    return 'No balls configured yet.';
  }
  const totalReps = program.steps.reduce((sum, step) => sum + step.repetitions, 0);
  return `${program.steps.length} balls · ${program.randomized ? 'randomized' : 'in order'} · ${totalReps} total reps`;
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

function FieldRange({
  label,
  value,
  min,
  max,
  step,
  onChange,
  valueLabel = value,
  minLabel = min,
  maxLabel = max,
  midLabel = null,
  className = '',
  inputClassName = '',
}) {
  return (
    <label className={`field-range ${className}`.trim()}>
      <div className="field-range__row">
        <span>{label}</span>
        <strong>{valueLabel}</strong>
      </div>
      <div className="field-range__track">
        <input
          type="range"
          className={`field-range__input ${inputClassName}`.trim()}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
      </div>
      <div className={`field-range__limits ${midLabel ? 'field-range__limits--three-up' : ''}`.trim()}>
        <small>{minLabel}</small>
        {midLabel ? <small>{midLabel}</small> : null}
        <small>{maxLabel}</small>
      </div>
    </label>
  );
}

function FieldOptionRange({
  label,
  value,
  min,
  max,
  step,
  options,
  onChange,
  placement = false,
  suffix = '',
  minLabel = formatNumericValue(min, step, suffix),
  maxLabel = formatNumericValue(max, step, suffix),
}) {
  const middleOption = options.find((option) => option.value === 0) || options[Math.floor(options.length / 2)];

  return (
    <FieldRange
      label={label}
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={onChange}
      valueLabel={formatInterpretedOptionLabel(options, value, step, suffix)}
      minLabel={minLabel}
      maxLabel={maxLabel}
      midLabel={placement ? middleOption?.label || null : null}
      className={placement ? 'field-range--placement' : ''}
      inputClassName={placement ? 'field-range__input--placement' : ''}
    />
  );
}

function ProgramRow({ active, name, summary, onSelect }) {
  return (
    <div className={`program-row ${active ? 'is-active' : ''}`}>
      <button className="program-row__select" type="button" onClick={onSelect}>
        <span>{name}</span>
        <small className="program-row__summary">{summary}</small>
      </button>
    </div>
  );
}

function OptionCard({
  option,
  onChange,
  showTestButton = false,
  canTestButton = false,
  onTest,
}) {
  const wheels = deriveOptionWheelProfile(option);

  return (
    <div className="option-card">
      <div className="option-card__header">
        <div className="option-card__heading">
          <p className="eyebrow">Ball Setup</p>
          <h4>{optionSummary(option)}</h4>
        </div>
      </div>
      <div className="option-card__meta">
        Upper {wheels.upperWheel} rpm · Lower {wheels.lowerWheel} rpm · {wheels.spin.label} · {wheels.speed.label}
      </div>
      <div className="field-grid">
        <FieldRange
          label="Upper RPM"
          value={wheels.upperWheel}
          min={WHEEL_MIN}
          max={WHEEL_MAX}
          step={WHEEL_STEP}
          valueLabel={`${wheels.upperWheel} rpm`}
          onChange={(value) => onChange(buildWheelPatch(option, { upperWheel: value }))}
        />
        <FieldRange
          label="Lower RPM"
          value={wheels.lowerWheel}
          min={WHEEL_MIN}
          max={WHEEL_MAX}
          step={WHEEL_STEP}
          valueLabel={`${wheels.lowerWheel} rpm`}
          onChange={(value) => onChange(buildWheelPatch(option, { lowerWheel: value }))}
        />
        <FieldOptionRange
          label="Height"
          value={getOptionValue(option, 'height', 'heightId', HEIGHT_OPTIONS, HEIGHT_MIN, HEIGHT_MAX, HEIGHT_STEP)}
          min={HEIGHT_MIN}
          max={HEIGHT_MAX}
          step={HEIGHT_STEP}
          options={HEIGHT_OPTIONS}
          onChange={(value) => onChange(buildOptionPatch(option, { height: value }))}
        />
        <FieldOptionRange
          label="Placement"
          value={getOptionValue(option, 'placement', 'placementId', PLACEMENT_OPTIONS, PLACEMENT_MIN, PLACEMENT_MAX, PLACEMENT_STEP)}
          min={PLACEMENT_MIN}
          max={PLACEMENT_MAX}
          step={PLACEMENT_STEP}
          options={PLACEMENT_OPTIONS}
          placement
          minLabel="BH"
          maxLabel="FH"
          onChange={(value) => onChange(buildOptionPatch(option, { placement: value }))}
        />
        <FieldOptionRange
          label="Cadence"
          value={getOptionValue(option, 'cadence', 'cadenceId', CADENCE_OPTIONS, CADENCE_MIN, CADENCE_MAX, CADENCE_STEP)}
          min={CADENCE_MIN}
          max={CADENCE_MAX}
          step={CADENCE_STEP}
          options={CADENCE_OPTIONS}
          suffix="%"
          onChange={(value) => onChange(buildOptionPatch(option, { cadence: value }))}
        />
      </div>
      {showTestButton ? (
        <div className="option-card__footer">
          <button type="button" className="secondary-button" onClick={onTest} disabled={!canTestButton}>
            Test
          </button>
        </div>
      ) : null}
    </div>
  );
}

function CompactStepRow({
  step,
  index,
  showTestButton,
  canTestButton,
  onTest,
  viewMode,
  onChangeStep,
  onEdit,
  onDuplicate,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onTouchCancel,
}) {
  return (
    <article
      className={`compact-step-row ${viewMode ? 'is-view' : ''}`}
      data-step-index={index}
      onDragOver={(event) => onDragOver(event, index)}
      onDrop={() => onDrop(index)}
    >
      {!viewMode ? (
        <button
          type="button"
          className="compact-step-row__handle"
          aria-label={`Drag Ball ${index + 1}`}
          draggable={!viewMode}
          onDragStart={() => onDragStart(index)}
          onTouchStart={(event) => onTouchStart(event, index)}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchCancel}
        >
          <span aria-hidden="true">
            ⋮⋮
          </span>
        </button>
      ) : null}
      <button type="button" className="compact-step-row__main" onClick={() => (!viewMode ? onEdit() : null)}>
        <span className="compact-step-row__title">
          <span className="compact-step-row__title-text">
            <span className="eyebrow">Ball {index + 1}</span>
            <strong>Single Ball</strong>
          </span>
          <span className="compact-step-row__meta">{step.repetitions}x</span>
        </span>
        <span className="compact-step-row__summary">{optionSummary(step.options[0])}</span>
      </button>
      <div className="compact-step-row__actions">
        {showTestButton ? (
          <button type="button" className="secondary-button" onClick={onTest} disabled={!canTestButton}>
            Test
          </button>
        ) : null}
        {viewMode ? null : (
          <>
            <button type="button" className="ghost-button" onClick={onEdit}>
              Edit
            </button>
            <button type="button" className="ghost-button" onClick={onDuplicate}>
              Duplicate
            </button>
            <button type="button" className="ghost-button danger-text" onClick={onDelete}>
              Delete
            </button>
            <FieldSelect
              label=""
              value={String(step.repetitions)}
              options={REPETITION_OPTIONS.map((option) => ({ ...option, id: String(option.value) }))}
              onChange={(value) => onChangeStep({ repetitions: Number(value) })}
            />
          </>
        )}
      </div>
    </article>
  );
}

function BallEditorScreen({ draft, stepIndex, onChangeDraft, onCancel, onSave, onDuplicate, showTestButton, canTestButton, onTestStep }) {
  if (!draft) {
    return null;
  }

  function updateOptionDraft(patch) {
    onChangeDraft((previous) => {
      previous.options[0] = { ...previous.options[0], ...patch };
      return previous;
    });
  }

  return (
    <main className="editor-screen editor-screen--ball panel">
      <div className="ball-editor-head">
        <div>
          <p className="eyebrow">Ball Editor</p>
          <h2>Ball {stepIndex + 1}</h2>
        </div>
        <div className="ball-editor-head__actions">
          <button type="button" className="secondary-button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="secondary-button" onClick={onDuplicate}>
            Duplicate Ball
          </button>
          <button type="button" className="primary-button" onClick={onSave}>
            Save Ball
          </button>
        </div>
      </div>
      <div className="step-card__options">
        <OptionCard
          option={draft.options[0]}
          onChange={updateOptionDraft}
          showTestButton={showTestButton}
          canTestButton={canTestButton}
          onTest={() => onTestStep(deepClone(draft))}
        />
      </div>
      <div className="ball-editor-footer">
        <FieldSelect
          label="Repetitions"
          value={String(draft.repetitions)}
          options={REPETITION_OPTIONS.map((option) => ({ ...option, id: String(option.value) }))}
          onChange={(value) => onChangeDraft((previous) => ({ ...previous, repetitions: Number(value) }))}
        />
      </div>
    </main>
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
  const lastBallCountRef = useRef(null);
  const packedRunRef = useRef(null);
  const restartPendingRef = useRef(false);
  const singleShotTestRef = useRef(false);

  function clearRunTracking() {
    debugLog('controller.clearRunTracking', {
      currentStepIndex: currentStepIndexRef.current,
      overallScheduledSteps: scheduleRef.current.length,
      restartPending: restartPendingRef.current,
      singleShotTest: singleShotTestRef.current,
    });
    scheduleRef.current = [];
    currentStepIndexRef.current = 0;
    currentStepBallsRef.current = 0;
    lastBallCountRef.current = null;
    packedRunRef.current = null;
    restartPendingRef.current = false;
    singleShotTestRef.current = false;
    setCounters({ stepBalls: 0, overallBalls: 0 });
  }

  function applyStage(nextStage) {
    const previousStage = protocolStageRef.current;
    debugLog('controller.stage', {
      from: previousStage,
      to: nextStage,
    });
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
        // Match the legacy controller: notifications can arrive before the write promise settles.
        debugLog('robot.tx', {
          fromStage: protocolStageRef.current,
          nextStage,
          payloadHex: packetToHex(normalized),
          payloadLength: normalized.length,
        });
        applyStage(nextStage);
        await writeRef.current.writeValue(normalized);
      })
      .catch((error) => {
        console.error(error);
        debugLog('robot.tx.error', {
          message: error.message || String(error),
          nextStage,
        });
        setLastError(error.message || String(error));
        throw error;
      });
    queueTailRef.current = chain.catch(() => null);
    return chain;
  }

  function handleDrillStatus(packet) {
    if (packet.ballCount === lastBallCountRef.current) {
      debugLog('robot.drillStatus.duplicate', {
        packet,
        currentStepIndex: currentStepIndexRef.current,
      });
      return;
    }
    lastBallCountRef.current = packet.ballCount;
    const schedule = scheduleRef.current;
    if (!schedule.length) {
      debugLog('robot.drillStatus.ignoredNoSchedule', { packet });
      return;
    }
    if (packedRunRef.current) {
      if (packedRunRef.current.randomized) {
        setCounters({
          stepBalls: packet.ballCount,
          overallBalls: packet.ballCount,
        });
        return;
      }
      const packedState = derivePackedStepState(packedRunRef.current.stepRepetitions, packet.ballCount);
      currentStepIndexRef.current = packedState.stepIndex;
      currentStepBallsRef.current = packedState.stepBallCount;
      setCounters({
        stepBalls: packedState.stepBallCount,
        overallBalls: packet.ballCount,
      });
      return;
    }
    const currentStep = schedule[currentStepIndexRef.current];
    currentStepBallsRef.current += 1;
    debugLog('robot.drillStatus', {
      packet,
      currentStepIndex: currentStepIndexRef.current,
      currentStepBalls: currentStepBallsRef.current,
      currentStepRepetitions: currentStep.repetitions,
      scheduleLength: schedule.length,
    });
    setCounters((previous) => ({ stepBalls: currentStepBallsRef.current, overallBalls: previous.overallBalls + 1 }));
    if (singleShotTestRef.current) {
      singleShotTestRef.current = false;
      debugLog('controller.singleShot.complete', { packet });
      queueWrite(CONTROL.stop, 'stop-requested').catch(() => null);
      return;
    }
    if (currentStepBallsRef.current < currentStep.repetitions) {
      return;
    }
    const nextIndex = (currentStepIndexRef.current + 1) % schedule.length;
    const nextStep = schedule[nextIndex];
    currentStepIndexRef.current = nextIndex;
    currentStepBallsRef.current = 0;
    if (canChangeDrill(currentStep, nextStep)) {
      // The device can restart its shot counter when a drill is swapped in place.
      // Clear the dedupe marker so the next shot from the new step is not ignored.
      lastBallCountRef.current = null;
      debugLog('controller.step.advance', {
        strategy: 'change-drill',
        fromStepIndex: nextIndex === 0 ? schedule.length - 1 : nextIndex - 1,
        toStepIndex: nextIndex,
        nextStep,
      });
      queueWrite(createChangeDrillPayload(nextStep), 'shooting').catch(() => null);
    } else {
      restartPendingRef.current = true;
      debugLog('controller.step.advance', {
        strategy: 'restart-drill',
        fromStepIndex: nextIndex === 0 ? schedule.length - 1 : nextIndex - 1,
        toStepIndex: nextIndex,
        nextStep,
      });
      queueWrite(CONTROL.stop, 'shooting-restart').catch(() => null);
    }
  }

  function handleNotification(event) {
    const packet = parseNotification(event.target.value);
    debugLog('robot.rx', {
      stage: protocolStageRef.current,
      packet,
    });
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
            lastBallCountRef.current = null;
            debugLog('controller.restart.ready', {
              stepIndex: currentStepIndexRef.current,
              nextStep: schedule[currentStepIndexRef.current],
            });
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
      debugLog('controller.connect.start');
      applyStage('connecting');
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [0xfeff] }],
        optionalServices: [SERVICE_ID],
      });
      deviceRef.current = device;
      debugLog('controller.connect.deviceSelected', {
        deviceId: device.id,
        deviceName: device.name || 'Nova Bot',
      });
      setDeviceName(device.name || 'Nova Bot');
      device.addEventListener('gattserverdisconnected', () => {
        debugLog('controller.connect.disconnected');
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
      debugLog('controller.connect.characteristicsReady', {
        notifyId: notifyRef.current.uuid,
        writeId: writeRef.current.uuid,
      });
      await notifyRef.current.startNotifications();
      listenerRef.current = handleNotification;
      notifyRef.current.addEventListener('characteristicvaluechanged', listenerRef.current);
      queueTailRef.current = Promise.resolve();
      await queueWrite([0x07, 0, 0, 0], 'initial');
    } catch (error) {
      console.error(error);
      debugLog('controller.connect.error', {
        message: error.message || String(error),
      });
      setLastError(error.message || String(error));
      applyStage('disconnected');
    }
  }

  function disconnect() {
    debugLog('controller.disconnect.requested', {
      connected: Boolean(deviceRef.current?.gatt?.connected),
    });
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
    if (!program.steps.length) {
      setLastError('Add at least one ball before running the program.');
      return;
    }
    setLastError('');
    clearRunTracking();
    singleShotTestRef.current = false;
    const packedRun = buildPackedProgramRun(program);
    if (packedRun) {
      packedRunRef.current = packedRun;
      scheduleRef.current = [packedRun.drill];
      queueWrite(createDrillPayload(packedRun.drill), 'shooting').catch(() => null);
      return;
    }
    if (program.randomized) {
      setLastError('Randomized programs support up to 9 balls.');
      return;
    }
    const schedule = buildSchedule(program);
    scheduleRef.current = schedule;
    debugLog('controller.runProgram', {
      programId: program.id,
      programName: program.name,
      scheduleLength: schedule.length,
      schedulePreview: schedulePreviewText(program),
    });
    queueWrite(createDrillPayload(schedule[0]), 'shooting').catch(() => null);
  }

  function testStep(step) {
    if (protocolStageRef.current !== 'standby') {
      return;
    }
    const scheduledStep = buildScheduledStep(step, { repetitions: 1, cadence: 0 });
    if (!scheduledStep.ballPayloads.length) {
      setLastError('Add at least one ball before testing.');
      return;
    }
    setLastError('');
    clearRunTracking();
    singleShotTestRef.current = true;
    scheduleRef.current = [scheduledStep];
    debugLog('controller.testStep', {
      stepId: step.id,
      schedulePreview: schedulePreviewText({ steps: [step] }),
    });
    queueWrite(createDrillPayload(scheduledStep), 'shooting').catch(() => null);
  }

  function pauseProgram() {
    if (protocolStageRef.current === 'shooting') {
      debugLog('controller.pause.requested');
      queueWrite(CONTROL.pause, 'pause').catch(() => null);
    }
  }

  function resumeProgram() {
    if (protocolStageRef.current === 'pause') {
      debugLog('controller.resume.requested');
      queueWrite(CONTROL.resume, 'shooting').catch(() => null);
    }
  }

  function stopProgram() {
    if (['shooting', 'pause', 'shooting-restart'].includes(protocolStageRef.current)) {
      restartPendingRef.current = false;
      debugLog('controller.stop.requested', {
        stage: protocolStageRef.current,
      });
      queueWrite(CONTROL.stop, 'stop-requested').catch(() => null);
    }
  }

  useEffect(() => {
    if (lastError) {
      debugLog('controller.error', { message: lastError });
    }
  }, [lastError]);

  return {
    stage,
    statusText,
    deviceName,
    lastError,
    counters,
    connect,
    disconnect,
    runProgram,
    testStep,
    pauseProgram,
    resumeProgram,
    stopProgram,
  };
}

function App() {
  const [store, setStore] = useState(() => loadStore());
  const [screen, setScreen] = useState('program-list');
  const [programMode, setProgramMode] = useState('view');
  const [editingStepIndex, setEditingStepIndex] = useState(null);
  const [editingStepDraft, setEditingStepDraft] = useState(null);
  const [startCountdown, setStartCountdown] = useState(0);
  const dragStepIndexRef = useRef(null);
  const touchDragIndexRef = useRef(null);
  const touchOverIndexRef = useRef(null);
  const touchGhostRef = useRef(null);
  const pendingStartProgramIdRef = useRef(null);
  const bot = useNovaBotController();

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }, [store]);

  const selectedProgram = useMemo(
    () => store.programs.find((program) => program.id === store.selectedProgramId) || store.programs[0],
    [store]
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__NOVA_BUILD__ = {
        id: BUILD_ID,
        label: BUILD_LABEL,
        builtAt: BUILD_TIME,
        gitHash: BUILD_GIT_HASH,
        sourceHash: BUILD_SOURCE_HASH,
        dirty: BUILD_DIRTY,
      };
    }
    debugLog('app.boot', {
      buildId: BUILD_ID,
      buildLabel: BUILD_LABEL,
      builtAt: BUILD_TIME,
      gitHash: BUILD_GIT_HASH,
      sourceHash: BUILD_SOURCE_HASH,
      dirty: BUILD_DIRTY,
    });
  }, []);

  useEffect(() => {
    if (!selectedProgram && store.programs[0]) {
      setStore((previous) => ({ ...previous, selectedProgramId: previous.programs[0].id }));
    }
  }, [selectedProgram, store.programs]);

  useEffect(() => {
    debugLog('app.state', {
      screen,
      programMode,
      selectedProgramId: store.selectedProgramId,
      programCount: store.programs.length,
      editingStepIndex,
      selectedProgramName: selectedProgram?.name || null,
      selectedProgramSteps: selectedProgram?.steps.length || 0,
      botStage: bot.stage,
    });
  }, [bot.stage, editingStepIndex, programMode, screen, selectedProgram, store.programs.length, store.selectedProgramId]);

  useEffect(() => {
    if (!startCountdown) {
      return undefined;
    }
    if (bot.stage !== 'standby') {
      pendingStartProgramIdRef.current = null;
      setStartCountdown(0);
      return undefined;
    }
    const timeoutId = window.setTimeout(() => {
      setStartCountdown((previous) => {
        if (previous <= 1) {
          const programToRun = store.programs.find((program) => program.id === pendingStartProgramIdRef.current) || selectedProgram;
          pendingStartProgramIdRef.current = null;
          if (programToRun) {
            bot.runProgram(programToRun);
          }
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
    return () => window.clearTimeout(timeoutId);
  }, [bot, bot.stage, selectedProgram, startCountdown, store.programs]);


  function updateSelectedProgram(transform) {
    setStore((previous) => ({
      ...previous,
      programs: previous.programs.map((program) => (program.id === previous.selectedProgramId ? transform(deepClone(program)) : program)),
    }));
  }

  function selectProgram(programId) {
    setStore((previous) => ({ ...previous, selectedProgramId: programId }));
    setScreen('program-detail');
  }

  function addProgram() {
    const program = createProgram(`Program ${store.programs.length + 1}`, [createBallStep()]);
    setStore((previous) => ({
      ...previous,
      selectedProgramId: program.id,
      programs: [...previous.programs, program],
    }));
    setScreen('program-detail');
  }

  function duplicateProgram() {
    if (!selectedProgram) {
      return;
    }
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
    setScreen('program-detail');
  }

  function deleteProgram(programId) {
    setStore((previous) => {
      const remaining = previous.programs.filter((program) => program.id !== programId);
      if (!remaining.length) {
        const demo = createDemoStore();
        return demo;
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

  function updateProgramRandomized(randomized) {
    updateSelectedProgram((program) => ({ ...program, randomized }));
  }

  function updateStep(stepIndex, patch) {
    updateSelectedProgram((program) => {
      program.steps[stepIndex] = { ...program.steps[stepIndex], ...patch };
      return program;
    });
  }

  function cloneStep(step) {
    const copy = deepClone(step);
    copy.id = uid('step');
    copy.options = copy.options.map((option) => ({ ...option, id: uid('option') }));
    return copy;
  }

  function duplicateStep(stepIndex, stepOverride = null) {
    if (!selectedProgram) {
      return null;
    }
    const sourceStep = stepOverride || selectedProgram.steps[stepIndex];
    if (!sourceStep) {
      return null;
    }
    const duplicatedStep = cloneStep(sourceStep);
    updateSelectedProgram((program) => ({
      ...program,
      steps: [...program.steps.slice(0, stepIndex + 1), duplicatedStep, ...program.steps.slice(stepIndex + 1)],
    }));
    return duplicatedStep;
  }

  function deleteStep(stepIndex) {
    updateSelectedProgram((program) => {
      if (program.steps.length <= 1) {
        return program;
      }
      program.steps.splice(stepIndex, 1);
      return program;
    });
  }

  function openStepEditor(stepIndex) {
    if (!selectedProgram) {
      return;
    }
    setEditingStepIndex(stepIndex);
    setEditingStepDraft(deepClone(selectedProgram.steps[stepIndex]));
    setScreen('ball-editor');
  }

  function addBall() {
    const nextStep = createBallStep();
    updateSelectedProgram((program) => ({
      ...program,
      steps: [...program.steps, nextStep],
    }));
    setEditingStepIndex(selectedProgram.steps.length);
    setEditingStepDraft(deepClone(nextStep));
    setScreen('ball-editor');
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

  function handleTouchStart(event, index) {
    if (viewMode) {
      return;
    }
    const touch = event.touches?.[0];
    const row = event.currentTarget.closest('[data-step-index]');
    touchDragIndexRef.current = index;
    touchOverIndexRef.current = index;
    row?.classList.add('is-touch-dragging');
    if (touch && row) {
      const ghost = row.cloneNode(true);
      ghost.classList.add('touch-drag-ghost');
      ghost.style.width = `${row.getBoundingClientRect().width}px`;
      ghost.style.left = `${touch.clientX}px`;
      ghost.style.top = `${touch.clientY}px`;
      document.body.appendChild(ghost);
      touchGhostRef.current = ghost;
    }
  }

  function handleTouchMove(event) {
    if (viewMode || touchDragIndexRef.current == null) {
      return;
    }
    const touch = event.touches?.[0];
    if (!touch) {
      return;
    }
    event.preventDefault();
    const target = document.elementFromPoint(touch.clientX, touch.clientY);
    const stepEl = target?.closest?.('[data-step-index]');
    if (!stepEl) {
      return;
    }
    const overIndex = Number(stepEl.getAttribute('data-step-index'));
    if (!Number.isNaN(overIndex)) {
      touchOverIndexRef.current = overIndex;
    }
    if (touchGhostRef.current) {
      touchGhostRef.current.style.left = `${touch.clientX}px`;
      touchGhostRef.current.style.top = `${touch.clientY}px`;
    }
  }

  function handleTouchEnd(event) {
    const row = event.currentTarget.closest('[data-step-index]');
    row?.classList.remove('is-touch-dragging');
    if (!viewMode) {
      reorderStep(touchDragIndexRef.current, touchOverIndexRef.current);
    }
    touchDragIndexRef.current = null;
    touchOverIndexRef.current = null;
    if (touchGhostRef.current) {
      touchGhostRef.current.remove();
      touchGhostRef.current = null;
    }
  }

  function applyDraftStep(transform) {
    setEditingStepDraft((previous) => {
      if (!previous) {
        return previous;
      }
      return transform(deepClone(previous));
    });
  }

  function cancelEditingStep() {
    setEditingStepDraft(null);
    setEditingStepIndex(null);
    setScreen('program-detail');
  }

  function saveEditingStep() {
    if (editingStepIndex == null || !editingStepDraft) {
      return;
    }
    updateSelectedProgram((program) => {
      program.steps[editingStepIndex] = editingStepDraft;
      return program;
    });
    setEditingStepDraft(null);
    setEditingStepIndex(null);
    setScreen('program-detail');
  }

  function duplicateEditingStep() {
    if (editingStepIndex == null || !editingStepDraft) {
      return;
    }
    const duplicatedStep = duplicateStep(editingStepIndex, editingStepDraft);
    if (!duplicatedStep) {
      return;
    }
    setEditingStepIndex(editingStepIndex + 1);
    setEditingStepDraft(deepClone(duplicatedStep));
  }

  function cancelPendingStart() {
    pendingStartProgramIdRef.current = null;
    setStartCountdown(0);
  }

  function handleRunToggle() {
    if (!connected) {
      return;
    }
    if (startCountdown) {
      cancelPendingStart();
      return;
    }
    if (['shooting', 'pause', 'shooting-restart'].includes(bot.stage)) {
      bot.stopProgram();
      return;
    }
    if (bot.stage === 'standby' && selectedProgram) {
      pendingStartProgramIdRef.current = selectedProgram.id;
      setStartCountdown(5);
    }
  }

  function handlePauseToggle() {
    if (bot.stage === 'shooting') {
      bot.pauseProgram();
    } else if (bot.stage === 'pause') {
      bot.resumeProgram();
    }
  }

  const connected = bot.stage !== 'disconnected';
  const canTestStep = bot.stage === 'standby' && startCountdown === 0;
  const viewMode = programMode === 'view';
  const controllerStage = startCountdown ? 'countdown' : bot.stage;
  const controllerStatusText = startCountdown ? `Starting in ${startCountdown}s` : bot.statusText;
  const runToggleLabel = startCountdown || ['shooting', 'pause', 'shooting-restart'].includes(bot.stage) ? 'Stop' : 'Start';
  const pauseToggleLabel = bot.stage === 'pause' ? 'Resume' : 'Pause';
  const runToggleDisabled = !connected || (!startCountdown && !['standby', 'shooting', 'pause', 'shooting-restart'].includes(bot.stage));
  const pauseToggleDisabled = !connected || startCountdown > 0 || !['shooting', 'pause'].includes(bot.stage);

  return (
    <div className="app-shell">
      {screen === 'program-list' ? (
        <main className="program-list-screen panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Programs</p>
              <h2>Nova Library</h2>
            </div>
            <button type="button" className="primary-button" onClick={addProgram}>
              New Program
            </button>
          </div>
          <p className="muted">Select a program to edit and run it.</p>
          <div className="program-list">
            {store.programs.map((program) => (
              <ProgramRow
                key={program.id}
                active={program.id === store.selectedProgramId}
                name={program.name}
                summary={programSummary(program)}
                onSelect={() => selectProgram(program.id)}
              />
            ))}
          </div>
        </main>
      ) : null}

      {screen === 'program-detail' && selectedProgram ? (
        <>
          <main className="program-detail-screen panel">
            <div className="panel-head program-detail-head">
              <div className="stacked-actions">
                <button type="button" className="secondary-button" onClick={() => setScreen('program-list')}>
                  ← Programs
                </button>
              </div>
              <div className="stacked-actions">
                <button type="button" className="pill-button" onClick={() => setProgramMode((mode) => (mode === 'view' ? 'edit' : 'view'))}>
                  {viewMode ? 'Edit' : 'View'}
                </button>
              </div>
            </div>
            <div className="program-name-row">
              <input
                className="program-name-input"
                value={selectedProgram.name}
                onChange={(event) => updateProgramName(event.target.value)}
                placeholder="Program name"
              />
              <div className="summary-chip-group">
                <div className="summary-chip">{selectedProgram.steps.length} balls</div>
                <div className="summary-chip">{selectedProgram.randomized ? 'Randomized' : 'In Order'}</div>
              </div>
            </div>
            {!viewMode ? (
              <section className="program-settings-card">
                <div>
                  <p className="eyebrow">Program Order</p>
                  <h3>{selectedProgram.randomized ? 'Randomized run' : 'Run in order'}</h3>
                  <p className="muted">
                    Randomized mode sends the program as one packed drill. Programs with more than 9 balls must run in order.
                  </p>
                </div>
                <div className="pill-group">
                  <button
                    type="button"
                    className={`pill-button ${!selectedProgram.randomized ? 'is-active' : ''}`}
                    onClick={() => updateProgramRandomized(false)}
                  >
                    In Order
                  </button>
                  <button
                    type="button"
                    className={`pill-button ${selectedProgram.randomized ? 'is-active' : ''}`}
                    onClick={() => updateProgramRandomized(true)}
                  >
                    Randomized
                  </button>
                </div>
              </section>
            ) : null}
            {!viewMode ? (
              <div className="stacked-actions top-actions">
                <button type="button" className="secondary-button" onClick={duplicateProgram}>
                  Duplicate
                </button>
                <button
                  type="button"
                  className="ghost-button danger-text"
                  onClick={() => deleteProgram(selectedProgram.id)}
                  aria-label={`Delete ${selectedProgram.name}`}
                >
                  Delete
                </button>
              </div>
            ) : null}
            <div className="step-list compact-step-list">
              {selectedProgram.steps.map((step, stepIndex) => (
                <CompactStepRow
                  key={step.id}
                  step={step}
                  index={stepIndex}
                  showTestButton={!viewMode}
                  canTestButton={canTestStep}
                  onTest={() => bot.testStep(step)}
                  viewMode={viewMode}
                  onChangeStep={(patch) => updateStep(stepIndex, patch)}
                  onEdit={() => openStepEditor(stepIndex)}
                  onDuplicate={() => duplicateStep(stepIndex)}
                  onDelete={() => deleteStep(stepIndex)}
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
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onTouchCancel={handleTouchEnd}
                />
              ))}
            </div>
            {!viewMode ? (
              <div className="composer-actions composer-actions--bottom">
                <button type="button" className="primary-button" onClick={addBall}>
                  Add Ball
                </button>
              </div>
            ) : null}
          </main>
        </>
      ) : null}

      {screen === 'ball-editor' ? (
        <BallEditorScreen
          draft={editingStepDraft}
          stepIndex={editingStepIndex}
          onChangeDraft={applyDraftStep}
          onCancel={cancelEditingStep}
          onSave={saveEditingStep}
          onDuplicate={duplicateEditingStep}
          showTestButton
          canTestButton={canTestStep}
          onTestStep={bot.testStep}
        />
      ) : null}

      <section className="controller-dock panel">
        <div className={`status-pill status-pill--${controllerStage}`}>{controllerStatusText}</div>
        <strong>{bot.deviceName}</strong>
        <div className="controller-dock__connect">
          {bot.stage === 'disconnected' ? (
            <button type="button" className="primary-button" onClick={bot.connect}>
              Connect
            </button>
          ) : (
            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                cancelPendingStart();
                bot.disconnect();
              }}
            >
              Disconnect
            </button>
          )}
        </div>
        {connected ? (
          <div className="control-grid control-grid--dock">
            <button type="button" className="primary-button" onClick={handleRunToggle} disabled={runToggleDisabled}>
              {runToggleLabel}
            </button>
            <button type="button" className="secondary-button" onClick={handlePauseToggle} disabled={pauseToggleDisabled}>
              {pauseToggleLabel}
            </button>
          </div>
        ) : null}
        {bot.lastError ? <div className="error-banner">{bot.lastError}</div> : null}
        <div className="controller-dock__footer">
          <div className="app-build-badge" title={`Built ${BUILD_TIME}`}>
            {BUILD_LABEL}
          </div>
        </div>
      </section>
    </div>
  );
}

createRoot(document.getElementById('app')).render(<App />);
