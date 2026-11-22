// 🛡️ VOEXI WEB SHIELD: Lightweight Mock for Native-Only Modules on Web
const emptyObj = {};
const emptyFn = () => {};
const emptyAsyncFn = async () => {};

const SkiaMock = {
  Font: emptyFn,
  Matrix: emptyFn,
  Color: emptyFn,
  Paint: emptyFn,
  Path: emptyFn,
  RuntimeEffect: { Make: () => null },
  SVG: { MakeFromString: () => null },
};

module.exports = {
  default: emptyObj,
  initialize: emptyAsyncFn,
  addEventListener: () => ({ remove: emptyFn }),
  removeEventListener: emptyFn,
  addListener: () => ({ remove: emptyFn }),
  removeListeners: emptyFn,
  useCameraDevices: () => emptyObj,
  useCameraPermission: () => ({ hasPermission: false, requestPermission: emptyAsyncFn }),
  Camera: () => null,
  DeepARView: () => null,
  NodePublisher: () => null,
  NodePlayerView: () => null,
  FFmpegKit: emptyObj,
  FFprobeKit: emptyObj,
  ReturnCode: emptyObj,
  Canvas: () => null,
  Skia: SkiaMock,
};
