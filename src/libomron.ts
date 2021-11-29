import * as path from "path";
import * as ffi from "ffi-napi";
import * as ref from "ref-napi";
import * as array from "ref-array-di";
import * as struct from "ref-struct-di";

const TArray = array(ref);
const Struct = struct(ref);

const omron_device_impl = Struct({
  _context: ref.refType(ref.types.void),
  _device: ref.refType(ref.types.void),
  _in_transfer: ref.refType(ref.types.void),
  _out_transfer: ref.refType(ref.types.void),
  _is_open: ref.types.int,
  _is_inited: ref.types.int,
});

const omron_device = Struct({
  device: ref.refType(omron_device_impl),
  device_mode: ref.types.int,
});

const omron_device_ref = ref.refType(omron_device);

const omron_bp_day_info = Struct({
  day: ref.types.uint32,
  month: ref.types.uint32,
  year: ref.types.uint32,
  hour: ref.types.uint32,
  minute: ref.types.uint32,
  second: ref.types.uint32,
  unknown_1: TArray(ref.types.uint8, 2),
  sys: ref.types.uint32,
  dia: ref.types.uint32,
  pulse: ref.types.uint32,
  unknown_2: TArray(ref.types.uint8, 3),
  present: ref.types.uint8,
});

export default ffi.Library(path.join(__dirname, "../../libomron/libomron.so.0.9.0"), {
  omron_create: [omron_device_ref, []],
  omron_delete: [ref.types.void, [omron_device_ref]],
  omron_open: [ref.types.int, [omron_device_ref, ref.types.int, ref.types.int, ref.types.uint32]],
  omron_close: [ref.types.int, [omron_device_ref]],
  omron_get_device_version: [ref.types.int, [omron_device_ref, ref.refType(ref.types.uchar)]],
  omron_get_daily_data_count: [ref.types.int, [omron_device_ref, ref.types.uchar]],
  omron_get_daily_bp_data: [omron_bp_day_info, [omron_device_ref, ref.types.int, ref.types.int]],
});
